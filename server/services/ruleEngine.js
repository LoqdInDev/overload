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
  // Since we don't have real platform metrics, threshold rules
  // trigger on a cooldown basis (once per 24h) to simulate monitoring
  if (rule.last_triggered) {
    const hoursSince = (Date.now() - new Date(rule.last_triggered).getTime()) / 3600000;
    if (hoursSince < 24) return false;
  }
  return true;
}

// ── Safety Checks ────────────────────────────────────────────────

function checkSafetyLimits(wsId) {
  const settings = loadSettings(wsId);
  if (settings.pauseAll === 'true') return { allowed: false, reason: 'All automation paused' };

  const maxDay = Number(settings.maxActionsPerDay) || 50;
  const maxHour = Number(settings.maxActionsPerHour) || 10;

  const todayCount = db.prepare(
    "SELECT COUNT(*) as c FROM ae_action_log WHERE workspace_id = ? AND created_at >= datetime('now', 'start of day') AND mode = 'autopilot'"
  ).get(wsId)?.c || 0;

  const hourCount = db.prepare(
    "SELECT COUNT(*) as c FROM ae_action_log WHERE workspace_id = ? AND created_at >= datetime('now', '-1 hour') AND mode = 'autopilot'"
  ).get(wsId)?.c || 0;

  if (todayCount >= maxDay) return { allowed: false, reason: `Daily limit reached (${maxDay})` };
  if (hourCount >= maxHour) return { allowed: false, reason: `Hourly limit reached (${maxHour})` };

  return { allowed: true };
}

function loadSettings(wsId) {
  const DEFAULTS = {
    pauseAll: 'false', maxActionsPerDay: '50', maxActionsPerHour: '10', confidenceThreshold: '70',
  };
  const rows = db.prepare('SELECT key, value FROM ae_settings WHERE workspace_id = ?').all(wsId);
  const result = { ...DEFAULTS };
  for (const r of rows) result[r.key] = r.value;
  return result;
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
    db.prepare(`
      INSERT INTO ae_action_log (module_id, action_type, mode, description, output_data, status, duration_ms, created_at, completed_at, workspace_id)
      VALUES (?, ?, 'autopilot', ?, ?, 'completed', ?, datetime('now'), datetime('now'), ?)
    `).run(rule.module_id, rule.action_type, `Auto: ${rule.name}`, text, durationMs, wsId);

    createNotification('action_completed', `Auto: ${rule.name}`, `Autopilot executed "${rule.name}" successfully`, rule.module_id, wsId);

    return { success: true, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;

    db.prepare(`
      INSERT INTO ae_action_log (module_id, action_type, mode, description, error, status, duration_ms, created_at, completed_at, workspace_id)
      VALUES (?, ?, 'autopilot', ?, ?, 'failed', ?, datetime('now'), datetime('now'), ?)
    `).run(rule.module_id, rule.action_type, `Auto: ${rule.name}`, err.message, durationMs, wsId);

    createNotification('action_failed', `Auto: ${rule.name} failed`, err.message, rule.module_id, wsId);

    return { success: false, error: err.message };
  }
}

function queueForApproval(rule, wsId) {
  const actionConfig = JSON.parse(rule.action_config || '{}');
  const triggerConfig = JSON.parse(rule.trigger_config || '{}');

  const confidence = 0.7 + Math.random() * 0.25; // 70-95% simulated

  db.prepare(`
    INSERT INTO ae_approval_queue (module_id, action_type, title, description, payload, ai_confidence, priority, status, source, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, 'medium', 'pending', 'rule', datetime('now'), ?)
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
  db.prepare("UPDATE ae_rules SET last_triggered = datetime('now'), run_count = run_count + 1 WHERE id = ?").run(ruleId);
}

// ── Main Engine Loop ─────────────────────────────────────────────

async function tick() {
  try {
    // Get all workspaces
    const workspaces = db.prepare('SELECT id FROM workspaces').all();

    for (const ws of workspaces) {
      const wsId = ws.id;

      // Get module modes for this workspace
      const modeRows = db.prepare('SELECT module_id, mode FROM ae_module_modes WHERE workspace_id = ?').all(wsId);
      const modes = {};
      for (const m of modeRows) modes[m.module_id] = m.mode;

      // Get active rules for this workspace
      const rules = db.prepare("SELECT * FROM ae_rules WHERE status = 'active' AND workspace_id = ?").all(wsId);
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
        const safety = checkSafetyLimits(wsId);
        if (!safety.allowed) {
          console.log(`  [rule-engine] Skipped "${rule.name}": ${safety.reason}`);
          continue;
        }

        // Execute based on mode
        if (moduleMode === 'autopilot') {
          if (rule.requires_approval) {
            // Even in autopilot, some rules need approval
            queueForApproval(rule, wsId);
            console.log(`  [rule-engine] Queued "${rule.name}" (requires approval)`);
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
  console.log('  Rule engine started (60s interval)');
  // Run first tick after a short delay to let server fully initialize
  setTimeout(() => tick(), 5000);
  engineTimer = setInterval(tick, TICK_INTERVAL);
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
  const rules = db.prepare(
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

    const safety = checkSafetyLimits(wsId);
    if (!safety.allowed) continue;

    const modeRow = db.prepare('SELECT mode FROM ae_module_modes WHERE module_id = ? AND workspace_id = ?').get(moduleId, wsId);
    const mode = modeRow?.mode || 'manual';
    if (mode === 'manual') continue;

    if (mode === 'autopilot' && !rule.requires_approval) {
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
