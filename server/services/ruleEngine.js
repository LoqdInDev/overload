/**
 * Rule Execution Engine
 *
 * Runs on a 60-second interval. For each active rule:
 * - Checks if the module is in autopilot or copilot mode
 * - Evaluates the trigger condition (schedule, threshold)
 * - Autopilot: executes action directly via Claude
 * - Copilot: queues action for user approval
 *
 * Event-based rules are triggered externally via POST /rules/trigger-event.
 */

const crypto = require('crypto');
const { db } = require('../db/database');
const { generateTextWithClaude } = require('./claude');
const { createNotification } = require('../modules/automation-engine/db/schema');

const TICK_INTERVAL = 60 * 1000; // 60 seconds
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

let engineTimer = null;

// ── Schedule Evaluation ──────────────────────────────────────────

function shouldScheduleTrigger(rule) {
  const config = JSON.parse(rule.trigger_config || '{}');
  const now = new Date();
  const currentDay = DAY_NAMES[now.getDay()];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Parse the scheduled time (e.g. "09:00")
  const [schedHour, schedMin] = (config.time || '09:00').split(':').map(Number);

  // Check if we're within the trigger window (within 2 minutes of scheduled time)
  const timeMatch = currentHour === schedHour && Math.abs(currentMinute - schedMin) <= 1;
  if (!timeMatch) return false;

  // Check cooldown — don't re-trigger if already triggered recently
  if (rule.last_triggered) {
    const lastRun = new Date(rule.last_triggered).getTime();
    const minGap = getMinGapMs(config.frequency);
    if (now.getTime() - lastRun < minGap) return false;
  }

  switch (config.frequency) {
    case 'daily':
      return true; // time already matched
    case 'weekly':
      return currentDay === (config.day || 'monday').toLowerCase();
    case 'biweekly': {
      if (currentDay !== (config.day || 'friday').toLowerCase()) return false;
      // Check if it's been at least 13 days since last run
      if (rule.last_triggered) {
        const daysSince = (now.getTime() - new Date(rule.last_triggered).getTime()) / 86400000;
        return daysSince >= 13;
      }
      return true;
    }
    case 'monthly':
      return now.getDate() === (config.day || 1);
    default:
      return false;
  }
}

function getMinGapMs(frequency) {
  switch (frequency) {
    case 'daily': return 23 * 60 * 60 * 1000;      // 23 hours
    case 'weekly': return 6 * 24 * 60 * 60 * 1000;  // 6 days
    case 'biweekly': return 13 * 24 * 60 * 60 * 1000;
    case 'monthly': return 27 * 24 * 60 * 60 * 1000;
    default: return 23 * 60 * 60 * 1000;
  }
}

// ── Threshold Evaluation ─────────────────────────────────────────

function shouldThresholdTrigger(rule) {
  // Cooldown: don't re-trigger within 6 hours
  if (rule.last_triggered) {
    const hoursSince = (Date.now() - new Date(rule.last_triggered).getTime()) / 3600000;
    if (hoursSince < 6) return false;
  }

  // For ads module: check real metrics from pa_campaign_metrics
  if (rule.module_id === 'ads') {
    try {
      const config = JSON.parse(rule.trigger_config || '{}');
      const metric = config.metric; // e.g., 'cpa', 'roas', 'ctr', 'cpc', 'spend'
      const operator = config.operator; // '>', '<', '>=', '<='
      const threshold = Number(config.value);
      if (!metric || !operator || isNaN(threshold)) return true; // fallback to cooldown

      // Get average metric from last 7 days across all launched campaigns
      const col = { cpa: 'cpa', roas: 'roas', ctr: 'ctr', cpc: 'cpc', spend: 'spend',
                     impressions: 'impressions', clicks: 'clicks', conversions: 'conversions',
                     cost_per_acquisition: 'cpa' }[metric];
      if (!col) return true;

      const row = db.prepare(`
        SELECT AVG(${col}) as val FROM pa_campaign_metrics
        WHERE workspace_id = ? AND date::timestamptz >= NOW() - INTERVAL '7 days'
      `).get(rule.workspace_id);

      if (!row || row.val === null) return true; // no data yet — trigger to collect

      const val = Number(row.val);
      switch (operator) {
        case '>':  return val > threshold;
        case '<':  return val < threshold;
        case '>=': return val >= threshold;
        case '<=': return val <= threshold;
        default:   return true;
      }
    } catch {
      return true; // on error, fall through to trigger
    }
  }

  // Non-ads modules: cooldown-based (24h)
  if (rule.last_triggered) {
    const hoursSince = (Date.now() - new Date(rule.last_triggered).getTime()) / 3600000;
    if (hoursSince < 24) return false;
  }
  return true;
}

// ── Safety Checks ────────────────────────────────────────────────

async function checkSafetyLimits(wsId) {
  const settings = await loadSettings(wsId);
  if (settings.pauseAll === 'true') return { allowed: false, reason: 'All automation paused' };

  const maxDay = Number(settings.maxActionsPerDay) || 50;
  const maxHour = Number(settings.maxActionsPerHour) || 10;

  const todayCount = db.prepare(
    "SELECT COUNT(*) as c FROM ae_action_log WHERE workspace_id = ? AND created_at::timestamptz >= DATE_TRUNC('day', NOW()) AND mode = 'autopilot'"
  ).get(wsId)?.c || 0;

  const hourCount = db.prepare(
    "SELECT COUNT(*) as c FROM ae_action_log WHERE workspace_id = ? AND created_at::timestamptz >= NOW() - INTERVAL '1 hour' AND mode = 'autopilot'"
  ).get(wsId)?.c || 0;

  if (todayCount >= maxDay) return { allowed: false, reason: `Daily limit reached (${maxDay})` };
  if (hourCount >= maxHour) return { allowed: false, reason: `Hourly limit reached (${maxHour})` };

  // Monthly budget limit (count all actions this month as a proxy for cost)
  const monthlyLimit = Number(settings.monthlyBudgetLimit) || 0;
  if (monthlyLimit > 0) {
    const monthCount = db.prepare(
      "SELECT COUNT(*) as c FROM ae_action_log WHERE workspace_id = ? AND created_at::timestamptz >= DATE_TRUNC('month', NOW()) AND mode = 'autopilot'"
    ).get(wsId)?.c || 0;
    if (monthCount >= monthlyLimit) return { allowed: false, reason: `Monthly action budget reached (${monthlyLimit})` };
  }

  return { allowed: true, settings };
}

async function loadSettings(wsId) {
  const DEFAULTS = {
    pauseAll: 'false', maxActionsPerDay: '50', maxActionsPerHour: '10',
    confidenceThreshold: '70', riskLevel: 'balanced', monthlyBudgetLimit: '0',
  };
  const rows = await db.prepare('SELECT key, value FROM ae_settings WHERE workspace_id = ?').all(wsId);
  const result = { ...DEFAULTS };
  for (const r of rows) result[r.key] = r.value;
  return result;
}

// ── Confidence Scoring ───────────────────────────────────────────

function computeConfidence(rule) {
  let score = 0.5; // base confidence

  const actionConfig = JSON.parse(rule.action_config || '{}');
  const triggerConfig = JSON.parse(rule.trigger_config || '{}');

  // +0.1 if rule has run successfully before (proven track record)
  if (rule.run_count > 0) score += 0.1;
  // +0.05 more if run 5+ times
  if (rule.run_count >= 5) score += 0.05;

  // +0.1 if trigger is well-configured (has time or metric)
  if (triggerConfig.time || triggerConfig.metric) score += 0.1;

  // +0.1 if action config has specific parameters (not just defaults)
  const configKeys = Object.keys(actionConfig).filter(k => actionConfig[k]);
  if (configKeys.length >= 2) score += 0.1;

  // +0.05 if rule has a description (human reviewed)
  if (rule.description && rule.description.length > 10) score += 0.05;

  // +0.1 if threshold trigger has concrete operator/value
  if (rule.trigger_type === 'threshold' && triggerConfig.operator && triggerConfig.value) score += 0.1;

  // Cap at 0.95
  return Math.min(score, 0.95);
}

// ── Risk Level Helpers ──────────────────────────────────────────

function shouldRequireApprovalForRisk(rule, riskLevel) {
  // Conservative: all actions require approval (even in autopilot)
  if (riskLevel === 'conservative') return true;

  // Aggressive: only require approval if rule explicitly says so
  if (riskLevel === 'aggressive') return !!rule.requires_approval;

  // Balanced (default): require approval for high-impact actions
  const highImpactActions = ['adjust_budget', 'send_campaign', 'publish_blog'];
  if (highImpactActions.includes(rule.action_type) && !rule.run_count) return true;
  return !!rule.requires_approval;
}

// ── Action Execution ─────────────────────────────────────────────

function buildPromptForRule(rule) {
  const actionConfig = JSON.parse(rule.action_config || '{}');
  const triggerConfig = JSON.parse(rule.trigger_config || '{}');

  switch (rule.action_type) {
    case 'generate_content':
    case 'publish_blog':
      return `Write a blog post based on this automation rule:
Rule: ${rule.name}
${actionConfig.type ? `Type: ${actionConfig.type}` : ''}
${actionConfig.tone ? `Tone: ${actionConfig.tone}` : 'Tone: professional'}
${actionConfig.wordTarget ? `Target length: ${actionConfig.wordTarget} words` : 'Target length: 1200 words'}
Topic: Generate a new article based on current marketing trends.

Write the complete article in markdown format with proper headings, paragraphs, and a conclusion.`;

    case 'schedule_post':
      return `Create social media content based on this automation rule:
Rule: ${rule.name}
${actionConfig.platforms ? `Platforms: ${actionConfig.platforms.join(', ')}` : 'Platform: general social media'}
Write an engaging social media post with caption, hashtags, and a call-to-action.`;

    case 'send_campaign':
      return `Draft an email for the following automated campaign:
Rule: ${rule.name}
${actionConfig.template ? `Template type: ${actionConfig.template}` : ''}
${actionConfig.segment ? `Target segment: ${actionConfig.segment}` : ''}
Write a complete email with subject line, greeting, body content, CTA, and sign-off.`;

    case 'adjust_budget':
      return `Generate a budget adjustment analysis:
Rule: ${rule.name}
${actionConfig.action ? `Action: ${actionConfig.action}` : ''}
${actionConfig.percentage ? `Adjustment: ${actionConfig.percentage}%` : ''}
${actionConfig.max_daily ? `Max daily: $${actionConfig.max_daily}` : ''}
${triggerConfig.metric ? `Trigger metric: ${triggerConfig.metric} ${triggerConfig.operator} ${triggerConfig.value}` : ''}
Provide a brief executive summary of the recommended budget change with rationale.`;

    case 'respond_review':
      return `Draft a professional response to a customer review:
Rule: ${rule.name}
${actionConfig.tone ? `Tone: ${actionConfig.tone}` : 'Tone: grateful and professional'}
${actionConfig.max_length ? `Max length: ${actionConfig.max_length} words` : 'Keep it under 100 words'}
Write a personalized, genuine review response.`;

    case 'generate_report':
      return `Generate a performance report summary:
Rule: ${rule.name}
${actionConfig.report_type ? `Report type: ${actionConfig.report_type}` : ''}
${actionConfig.include ? `Include metrics: ${actionConfig.include.join(', ')}` : ''}
${actionConfig.check ? `Check areas: ${actionConfig.check.join(', ')}` : ''}
Provide a structured report with key findings, metrics, and recommendations.`;

    default:
      return `Execute the following automation rule:
Rule: ${rule.name}
Action type: ${rule.action_type}
Config: ${JSON.stringify(actionConfig)}
Generate appropriate content or output for this automation action.`;
  }
}

// ── Save to Module Database ("Last Mile") ───────────────────────

function saveToModuleDatabase(rule, wsId, text, actionLogId) {
  const actionConfig = JSON.parse(rule.action_config || '{}');
  const meta = JSON.stringify({ source: 'autopilot', ruleId: rule.id, actionLogId });
  const id = crypto.randomUUID();

  try {
    switch (rule.action_type) {
      case 'generate_content':
      case 'publish_blog': {
        const type = actionConfig.type || 'blog';
        const title = `Auto: ${rule.name}`.slice(0, 100);
        db.prepare(
          'INSERT INTO cc_projects (id, type, title, prompt, content, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(id, type, title, rule.name, text, meta, wsId);
        break;
      }
      case 'schedule_post': {
        const platform = (actionConfig.platforms && actionConfig.platforms[0]) || 'multi';
        db.prepare(
          "INSERT INTO sm_posts (platform, post_type, caption, hashtags, status, metadata, workspace_id) VALUES (?, 'feed', ?, null, 'draft', ?, ?)"
        ).run(platform, text, meta, wsId);
        break;
      }
      case 'send_campaign': {
        const name = `Auto: ${rule.name}`.slice(0, 100);
        const type = actionConfig.template || 'email';
        db.prepare(
          "INSERT INTO es_campaigns (name, type, body, status, metadata, workspace_id) VALUES (?, ?, ?, 'draft', ?, ?)"
        ).run(name, type === 'sms' ? 'sms' : 'email', text, meta, wsId);
        break;
      }
      case 'adjust_budget': {
        const name = `Budget: ${rule.name}`.slice(0, 100);
        const platform = actionConfig.platform || 'google';
        db.prepare(
          'INSERT INTO pa_campaigns (id, platform, name, objective, budget, audience, ad_content, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(id, platform, name, 'budget_adjustment', '0', null, text, meta, wsId);
        break;
      }
      case 'respond_review': {
        db.prepare(
          "INSERT INTO rv_responses (id, workspace_id, review_id, content, status, metadata) VALUES (?, ?, 'auto', ?, 'draft', ?)"
        ).run(id, wsId, text, meta);
        break;
      }
      // generate_report: output stays in ae_action_log only
      default:
        return;
    }
    console.log(`  [rule-engine] Saved ${rule.action_type} draft to module DB (ws: ${wsId})`);
  } catch (err) {
    console.warn(`  [rule-engine] Failed to save to module DB: ${err.message}`);
  }
}

async function executeAction(rule, wsId) {
  const startTime = Date.now();
  const prompt = buildPromptForRule(rule);

  try {
    const { text } = await generateTextWithClaude(prompt, {
      system: 'You are an AI marketing automation assistant. Generate polished, ready-to-use content. No meta-commentary — just the final output.',
      temperature: 0.7,
      maxTokens: 2048,
    });

    const durationMs = Date.now() - startTime;

    // Log the completed action
    const result = db.prepare(`
      INSERT INTO ae_action_log (module_id, action_type, mode, description, output_data, status, duration_ms, created_at, completed_at, workspace_id)
      VALUES (?, ?, 'autopilot', ?, ?, 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `).run(rule.module_id, rule.action_type, `Auto: ${rule.name}`, text, durationMs, wsId);

    // Save generated content as draft in the target module's database
    saveToModuleDatabase(rule, wsId, text, result.lastInsertRowid);

    createNotification('action_completed', `Auto: ${rule.name}`, `Autopilot executed "${rule.name}" successfully`, rule.module_id, wsId);

    return { success: true, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;

    db.prepare(`
      INSERT INTO ae_action_log (module_id, action_type, mode, description, error, status, duration_ms, created_at, completed_at, workspace_id)
      VALUES (?, ?, 'autopilot', ?, ?, 'failed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `).run(rule.module_id, rule.action_type, `Auto: ${rule.name}`, err.message, durationMs, wsId);

    createNotification('action_failed', `Auto: ${rule.name} failed`, err.message, rule.module_id, wsId);

    return { success: false, error: err.message };
  }
}

function queueForApproval(rule, wsId) {
  const actionConfig = JSON.parse(rule.action_config || '{}');
  const triggerConfig = JSON.parse(rule.trigger_config || '{}');

  // Compute meaningful confidence based on rule maturity and configuration completeness
  const confidence = computeConfidence(rule);

  db.prepare(`
    INSERT INTO ae_approval_queue (module_id, action_type, title, description, payload, ai_confidence, priority, status, source, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, 'medium', 'pending', 'rule', CURRENT_TIMESTAMP, ?)
  `).run(
    rule.module_id,
    rule.action_type,
    `Rule: ${rule.name}`,
    `Automation rule "${rule.name}" triggered. Review and approve to execute.`,
    JSON.stringify({ ...actionConfig, trigger: triggerConfig, rule_id: rule.id }),
    confidence,
    wsId
  );

  createNotification('suggestion_ready', `Rule triggered: ${rule.name}`, `"${rule.name}" needs your approval`, rule.module_id, wsId);
}

function markRuleTriggered(ruleId) {
  db.prepare("UPDATE ae_rules SET last_triggered = CURRENT_TIMESTAMP, run_count = run_count + 1 WHERE id = ?").run(ruleId);
}

// ── Main Engine Loop ─────────────────────────────────────────────

async function tick() {
  try {
    // Get all workspaces
    const workspaces = await db.prepare('SELECT id FROM workspaces').all();

    for (const ws of workspaces) {
      const wsId = ws.id;

      // Get module modes for this workspace
      const modeRows = await db.prepare('SELECT module_id, mode FROM ae_module_modes WHERE workspace_id = ?').all(wsId);
      const modes = {};
      for (const m of modeRows) modes[m.module_id] = m.mode;

      // Get active rules for this workspace
      const rules = await db.prepare("SELECT * FROM ae_rules WHERE status = 'active' AND workspace_id = ?").all(wsId);
      if (rules.length === 0) continue;

      for (const rule of rules) {
        const moduleMode = modes[rule.module_id] || 'manual';

        // Skip rules for modules not in copilot or autopilot
        if (moduleMode === 'manual') continue;

        // Evaluate trigger
        let shouldTrigger = false;
        if (rule.trigger_type === 'schedule') {
          shouldTrigger = shouldScheduleTrigger(rule);
        } else if (rule.trigger_type === 'threshold') {
          shouldTrigger = shouldThresholdTrigger(rule);
        }
        // event triggers are handled by the API endpoint, not the loop

        if (!shouldTrigger) continue;

        // Safety check
        const safety = await checkSafetyLimits(wsId);
        if (!safety.allowed) {
          console.log(`  [rule-engine] Skipped "${rule.name}": ${safety.reason}`);
          continue;
        }

        const settings = safety.settings;
        const confidenceThreshold = Number(settings.confidenceThreshold || 70) / 100;
        const riskLevel = settings.riskLevel || 'balanced';

        // Execute based on mode
        if (moduleMode === 'autopilot') {
          const needsApproval = shouldRequireApprovalForRisk(rule, riskLevel);

          // Check confidence threshold — low-confidence actions get queued instead
          const ruleConfidence = computeConfidence(rule);
          if (ruleConfidence < confidenceThreshold) {
            queueForApproval(rule, wsId);
            console.log(`  [rule-engine] Queued "${rule.name}" (confidence ${Math.round(ruleConfidence * 100)}% < threshold ${Math.round(confidenceThreshold * 100)}%)`);
          } else if (needsApproval) {
            queueForApproval(rule, wsId);
            console.log(`  [rule-engine] Queued "${rule.name}" (requires approval, risk: ${riskLevel})`);
          } else {
            console.log(`  [rule-engine] Executing "${rule.name}" in autopilot...`);
            const result = await executeAction(rule, wsId);
            console.log(`  [rule-engine] "${rule.name}" ${result.success ? 'completed' : 'failed'} (${result.durationMs || 0}ms)`);
          }
        } else if (moduleMode === 'copilot') {
          queueForApproval(rule, wsId);
          console.log(`  [rule-engine] Queued "${rule.name}" for copilot review`);
        }

        markRuleTriggered(rule.id);
      }
    }
  } catch (err) {
    console.error('  [rule-engine] Tick error:', err.message);
  }
}

// ── Public API ───────────────────────────────────────────────────

function startRuleEngine() {
  console.log('  Rule engine started (60s interval, first tick in 30s)');
  // Defer first tick by 30s so the server can handle initial dashboard requests first
  setTimeout(() => {
    tick();
    engineTimer = setInterval(tick, TICK_INTERVAL);
  }, 30000);
}

function stopRuleEngine() {
  if (engineTimer) {
    clearInterval(engineTimer);
    engineTimer = null;
    console.log('  Rule engine stopped');
  }
}

/**
 * Trigger event-based rules from external sources (webhooks, etc.)
 * Called by POST /api/automation/rules/trigger-event
 */
async function triggerEvent(eventType, moduleId, wsId, eventData = {}) {
  const rules = await db.prepare(
    "SELECT * FROM ae_rules WHERE status = 'active' AND trigger_type = 'event' AND module_id = ? AND workspace_id = ?"
  ).all(moduleId, wsId);

  let triggered = 0;
  for (const rule of rules) {
    const config = JSON.parse(rule.trigger_config || '{}');
    if (config.event !== eventType) continue;

    // Check cooldown (1 hour for event rules)
    if (rule.last_triggered) {
      const hoursSince = (Date.now() - new Date(rule.last_triggered).getTime()) / 3600000;
      if (hoursSince < 1) continue;
    }

    const safety = await checkSafetyLimits(wsId);
    if (!safety.allowed) continue;

    const modeRow = await db.prepare('SELECT mode FROM ae_module_modes WHERE module_id = ? AND workspace_id = ?').get(moduleId, wsId);
    const mode = modeRow?.mode || 'manual';
    if (mode === 'manual') continue;

    const riskLevel = safety.settings?.riskLevel || 'balanced';
    const needsApproval = shouldRequireApprovalForRisk(rule, riskLevel);

    if (mode === 'autopilot' && !needsApproval) {
      await executeAction(rule, wsId);
    } else {
      queueForApproval(rule, wsId);
    }

    markRuleTriggered(rule.id);
    triggered++;
  }

  return triggered;
}

module.exports = { startRuleEngine, stopRuleEngine, triggerEvent };
