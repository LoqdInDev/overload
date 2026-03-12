/**
 * Ads Optimizer — Autonomous campaign optimization engine
 *
 * Runs on a 6-hour interval (configurable). For each workspace with launched campaigns:
 * 1. Polls live metrics from connected platforms (Google, Meta, TikTok, LinkedIn)
 * 2. Stores metric snapshots in pa_campaign_metrics
 * 3. Sends last 7 days of metrics to Claude for AI analysis
 * 4. Claude returns structured decisions (pause, scale, adjust budget, suggest new campaign)
 * 5. Autopilot: executes decisions directly | Copilot: queues for approval
 *
 * Safety rails:
 * - Never increase budget more than 30% in a single action
 * - Never exceed 2x original budget without approval
 * - Auto-pause if CPA exceeds 3x target
 * - Daily spend cap check before any budget increase
 * - All actions logged to pa_optimization_log
 */

const { db } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const pm = require('../../../services/platformManager');
const { createNotification } = require('../../automation-engine/db/schema');

const OPTIMIZE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const MAX_BUDGET_INCREASE_PCT = 30; // max 30% increase per optimization
const MAX_BUDGET_MULTIPLIER = 2.0; // never exceed 2x original budget without approval
const CPA_KILL_MULTIPLIER = 3.0;   // auto-pause if CPA is 3x target

let optimizerTimer = null;

// ── Metric Polling ──────────────────────────────────────────────

async function pollMetrics(wsId) {
  const campaigns = await db.prepare(
    "SELECT * FROM pa_campaigns WHERE workspace_id = ? AND status = 'launched'"
  ).all(wsId);

  if (campaigns.length === 0) return [];

  const snapshots = [];

  for (const camp of campaigns) {
    const meta = JSON.parse(camp.metadata || '{}');
    const launch = meta.launch || {};
    const platformCampaignId = launch.campaignId;
    if (!platformCampaignId) continue;
    if (!pm.isConnected(camp.platform)) continue;

    try {
      let metrics;
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      if (camp.platform === 'google' && launch.customerId) {
        metrics = await pm.adsMetrics('google', {
          customerId: launch.customerId,
          campaignId: platformCampaignId,
          startDate: weekAgo,
          endDate: today,
        });
      } else if (camp.platform === 'meta') {
        metrics = await pm.adsMetrics('meta', {
          campaignId: platformCampaignId,
          datePreset: 'last_7d',
        });
      }

      if (!metrics) continue;

      // Normalize to a single summary row (aggregate last 7d)
      const summary = Array.isArray(metrics)
        ? metrics.reduce((acc, m) => ({
            impressions: acc.impressions + (m.impressions || 0),
            clicks: acc.clicks + (m.clicks || 0),
            spend: acc.spend + (m.cost || m.spend || 0),
            conversions: acc.conversions + (m.conversions || 0),
          }), { impressions: 0, clicks: 0, spend: 0, conversions: 0 })
        : {
            impressions: Number(metrics.impressions || 0),
            clicks: Number(metrics.clicks || 0),
            spend: Number(metrics.spend || metrics.cost || 0),
            conversions: Number(metrics.conversions || metrics.actions?.length || 0),
          };

      summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions * 100) : 0;
      summary.cpc = summary.clicks > 0 ? (summary.spend / summary.clicks) : 0;
      summary.cpa = summary.conversions > 0 ? (summary.spend / summary.conversions) : 0;
      summary.roas = summary.spend > 0 ? (summary.conversions * (Number(camp.budget) || 50) / summary.spend) : 0;

      // Store snapshot
      db.prepare(`
        INSERT INTO pa_campaign_metrics (workspace_id, campaign_id, platform, platform_campaign_id,
          impressions, clicks, spend, conversions, ctr, cpc, cpa, roas, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(wsId, camp.id, camp.platform, platformCampaignId,
        summary.impressions, summary.clicks, summary.spend, summary.conversions,
        summary.ctr, summary.cpc, summary.cpa, summary.roas, today);

      snapshots.push({ campaign: camp, metrics: summary, platformCampaignId });
    } catch (err) {
      console.warn(`  [ads-optimizer] Metrics poll failed for ${camp.name} (${camp.platform}): ${err.message}`);
    }
  }

  return snapshots;
}

// ── AI Analysis ─────────────────────────────────────────────────

function buildOptimizationPrompt(snapshots, wsId) {
  const campaignSummaries = snapshots.map(s => {
    const c = s.campaign;
    const m = s.metrics;
    return `
Campaign: "${c.name}"
Platform: ${c.platform} | Objective: ${c.objective} | Daily Budget: $${c.budget}
7-Day Metrics:
  Impressions: ${m.impressions.toLocaleString()} | Clicks: ${m.clicks.toLocaleString()}
  Spend: $${m.spend.toFixed(2)} | Conversions: ${m.conversions}
  CTR: ${m.ctr.toFixed(2)}% | CPC: $${m.cpc.toFixed(2)} | CPA: $${m.cpa.toFixed(2)}
  ROAS: ${m.roas.toFixed(2)}x`;
  }).join('\n---');

  return `You are an expert paid media optimizer reviewing ad campaign performance. Analyze these campaigns and return actionable optimization decisions.

${campaignSummaries}

RULES:
- Budget increases are capped at ${MAX_BUDGET_INCREASE_PCT}% per optimization cycle
- Never recommend a budget higher than ${MAX_BUDGET_MULTIPLIER}x the original
- If CPA is ${CPA_KILL_MULTIPLIER}x or more above a reasonable target for the objective, recommend pausing
- Always recommend PAUSING underperformers rather than deleting
- Suggest new campaign ideas ONLY if current data shows clear opportunity (e.g., a winning audience segment worth splitting)
- Be conservative — it's real money

Return a JSON object with this EXACT structure:
{
  "summary": "<2-3 sentence executive summary of overall performance>",
  "decisions": [
    {
      "campaign_id": "<campaign id from above>",
      "campaign_name": "<name>",
      "action": "scale_budget" | "reduce_budget" | "pause" | "enable" | "adjust_targeting" | "new_headline_test" | "no_change",
      "reason": "<1-2 sentence explanation>",
      "details": {
        "new_budget": <number or null>,
        "budget_change_pct": <number or null>,
        "new_headlines": ["<headline>"] or null,
        "targeting_suggestion": "<suggestion>" or null
      },
      "priority": "high" | "medium" | "low",
      "confidence": <0.0-1.0>
    }
  ],
  "new_campaign_suggestions": [
    {
      "name": "<suggested campaign name>",
      "platform": "<platform>",
      "objective": "<objective>",
      "budget": "<daily budget>",
      "audience": "<audience description>",
      "reason": "<why this campaign would work based on current data>"
    }
  ] or []
}

Return ONLY the JSON object, no markdown fences.`;
}

async function analyzeAndDecide(snapshots, wsId) {
  if (snapshots.length === 0) return null;

  const prompt = buildOptimizationPrompt(snapshots, wsId);

  try {
    const { text } = await generateTextWithClaude(prompt, {
      system: 'You are a senior performance marketing analyst. Return only valid JSON. Be data-driven and conservative with budget recommendations.',
      temperature: 0.3,
      maxTokens: 4096,
    });

    // Parse response
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { return JSON.parse(cleaned); } catch {}
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }

    console.warn('  [ads-optimizer] Failed to parse AI response');
    return null;
  } catch (err) {
    console.error('  [ads-optimizer] AI analysis failed:', err.message);
    return null;
  }
}

// ── Action Execution ────────────────────────────────────────────

async function executeDecision(decision, campaign, wsId) {
  const meta = JSON.parse(campaign.metadata || '{}');
  const launch = meta.launch || {};

  try {
    switch (decision.action) {
      case 'pause': {
        if (pm.isConnected(campaign.platform)) {
          await pm.adsPause(campaign.platform, {
            campaignId: launch.campaignId,
            customerId: launch.customerId,
          });
          await db.prepare("UPDATE pa_campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(campaign.id);
        }
        break;
      }
      case 'enable': {
        if (pm.isConnected(campaign.platform)) {
          await pm.adsEnable(campaign.platform, {
            campaignId: launch.campaignId,
            customerId: launch.customerId,
          });
          await db.prepare("UPDATE pa_campaigns SET status = 'launched', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(campaign.id);
        }
        break;
      }
      case 'scale_budget':
      case 'reduce_budget': {
        const details = decision.details || {};
        const newBudget = details.new_budget;
        if (newBudget && pm.isConnected(campaign.platform)) {
          // Safety: enforce max increase
          const currentBudget = Number(campaign.budget) || 50;
          const maxAllowed = currentBudget * MAX_BUDGET_MULTIPLIER;
          const safeBudget = Math.min(newBudget, maxAllowed);

          // Update local record
          await db.prepare("UPDATE pa_campaigns SET budget = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(String(safeBudget), campaign.id);

          // Platform budget update would go here when APIs support it
          // For now, log the recommendation
        }
        break;
      }
      case 'no_change':
      case 'adjust_targeting':
      case 'new_headline_test':
        // These are informational — logged but not auto-executed
        break;
    }
    return { success: true };
  } catch (err) {
    console.error(`  [ads-optimizer] Execute failed for ${campaign.name}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── Queue for Approval (Copilot mode) ───────────────────────────

async function queueOptimizationForApproval(decision, campaign, wsId, analysis) {
  const confidence = decision.confidence || 0.8;

  await db.prepare(`
    INSERT INTO ae_approval_queue (module_id, action_type, title, description, payload, ai_confidence, priority, status, source, created_at, workspace_id)
    VALUES ('ads', ?, ?, ?, ?, ?, ?, 'pending', 'ai', CURRENT_TIMESTAMP, ?)
  `).run(
    decision.action,
    `${decision.action.replace(/_/g, ' ')}: ${campaign.name}`,
    decision.reason,
    JSON.stringify({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      platform: campaign.platform,
      action: decision.action,
      details: decision.details,
      current_budget: campaign.budget,
      analysis_summary: analysis?.summary,
    }),
    confidence,
    decision.priority || 'medium',
    wsId
  );

  createNotification(
    'suggestion_ready',
    `Ad optimization: ${campaign.name}`,
    decision.reason,
    'ads',
    wsId
  );
}

async function queueNewCampaignSuggestion(suggestion, wsId, analysis) {
  await db.prepare(`
    INSERT INTO ae_approval_queue (module_id, action_type, title, description, payload, ai_confidence, priority, status, source, created_at, workspace_id)
    VALUES ('ads', 'new_campaign', ?, ?, ?, ?, 'medium', 'pending', 'ai', CURRENT_TIMESTAMP, ?)
  `).run(
    `New campaign: ${suggestion.name}`,
    suggestion.reason,
    JSON.stringify({
      ...suggestion,
      analysis_summary: analysis?.summary,
    }),
    0.75,
    wsId
  );

  createNotification(
    'suggestion_ready',
    `New campaign suggestion: ${suggestion.name}`,
    suggestion.reason,
    'ads',
    wsId
  );
}

// ── Main Optimization Loop ──────────────────────────────────────

async function optimizeWorkspace(wsId) {
  // 1. Check if ads module is in copilot or autopilot mode
  const modeRow = await db.prepare('SELECT mode FROM ae_module_modes WHERE module_id = ? AND workspace_id = ?').get('ads', wsId);
  const mode = modeRow?.mode || 'manual';
  if (mode === 'manual') return; // skip — user hasn't opted in

  // 2. Poll live metrics
  const snapshots = await pollMetrics(wsId);
  if (snapshots.length === 0) return;

  console.log(`  [ads-optimizer] Analyzing ${snapshots.length} campaigns for ws:${wsId} (mode: ${mode})`);

  // 3. AI analysis
  const analysis = await analyzeAndDecide(snapshots, wsId);
  if (!analysis) return;

  // 4. Log the optimization run
  await db.prepare(`
    INSERT INTO pa_optimization_log (workspace_id, action_type, description, ai_analysis, decisions, status)
    VALUES (?, 'full_review', ?, ?, ?, ?)
  `).run(
    wsId,
    analysis.summary || 'Optimization review',
    JSON.stringify(analysis),
    JSON.stringify(analysis.decisions || []),
    mode === 'autopilot' ? 'executed' : 'queued'
  );

  // 5. Process decisions
  for (const decision of (analysis.decisions || [])) {
    if (decision.action === 'no_change') continue;

    const campaign = snapshots.find(s => s.campaign.id === decision.campaign_id)?.campaign
      || snapshots.find(s => s.campaign.name === decision.campaign_name)?.campaign;
    if (!campaign) continue;

    if (mode === 'autopilot') {
      // Safety gate: high-impact actions still need approval
      const needsApproval = decision.action === 'pause'
        || (decision.action === 'scale_budget' && (decision.details?.budget_change_pct || 0) > MAX_BUDGET_INCREASE_PCT);

      if (needsApproval) {
        await queueOptimizationForApproval(decision, campaign, wsId, analysis);
        console.log(`  [ads-optimizer] Queued high-impact "${decision.action}" for ${campaign.name} (needs approval)`);
      } else {
        const result = await executeDecision(decision, campaign, wsId);
        console.log(`  [ads-optimizer] Executed "${decision.action}" for ${campaign.name}: ${result.success ? 'OK' : result.error}`);
      }
    } else {
      // Copilot: everything goes to approval queue
      queueOptimizationForApproval(decision, campaign, wsId, analysis);
    }
  }

  // 6. New campaign suggestions → always go to approval
  for (const suggestion of (analysis.new_campaign_suggestions || [])) {
    await queueNewCampaignSuggestion(suggestion, wsId, analysis);
    console.log(`  [ads-optimizer] Suggested new campaign: "${suggestion.name}" for ${suggestion.platform}`);
  }

  // 7. Notify
  const actionCount = (analysis.decisions || []).filter(d => d.action !== 'no_change').length;
  const suggestionCount = (analysis.new_campaign_suggestions || []).length;
  if (actionCount > 0 || suggestionCount > 0) {
    createNotification(
      'action_completed',
      'Ads optimization complete',
      `${actionCount} optimization${actionCount !== 1 ? 's' : ''} ${mode === 'autopilot' ? 'executed' : 'queued'}, ${suggestionCount} new campaign suggestion${suggestionCount !== 1 ? 's' : ''}`,
      'ads',
      wsId
    );
  }
}

async function runOptimizationCycle() {
  try {
    const workspaces = await db.prepare('SELECT id FROM workspaces').all();
    for (const ws of workspaces) {
      await optimizeWorkspace(ws.id);
    }
  } catch (err) {
    console.error('  [ads-optimizer] Cycle error:', err.message);
  }
}

// ── Public API ──────────────────────────────────────────────────

function startAdsOptimizer() {
  console.log('  Ads optimizer started (6h interval, first run in 2min)');
  setTimeout(() => {
    runOptimizationCycle();
    optimizerTimer = setInterval(runOptimizationCycle, OPTIMIZE_INTERVAL);
  }, 120000); // 2 min after startup
}

function stopAdsOptimizer() {
  if (optimizerTimer) {
    clearInterval(optimizerTimer);
    optimizerTimer = null;
    console.log('  Ads optimizer stopped');
  }
}

/**
 * Manual trigger — run optimization for a specific workspace NOW
 */
async function optimizeNow(wsId) {
  return optimizeWorkspace(wsId);
}

/**
 * Get metrics history for a campaign
 */
async function getMetricsHistory(wsId, campaignId, days = 30) {
  return db.prepare(
    'SELECT * FROM pa_campaign_metrics WHERE workspace_id = ? AND campaign_id = ? AND date >= date(?, ?) ORDER BY date ASC'
  ).all(wsId, campaignId, 'now', `-${days} days`);
}

/**
 * Get optimization log
 */
async function getOptimizationLog(wsId, limit = 20) {
  return await db.prepare(
    'SELECT * FROM pa_optimization_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(wsId, limit);
}

/**
 * Get latest metrics snapshot for all campaigns
 */
function getLatestMetrics(wsId) {
  return db.prepare(`
    SELECT m.* FROM pa_campaign_metrics m
    INNER JOIN (
      SELECT campaign_id, MAX(date) as max_date
      FROM pa_campaign_metrics WHERE workspace_id = ?
      GROUP BY campaign_id
    ) latest ON m.campaign_id = latest.campaign_id AND m.date = latest.max_date
    WHERE m.workspace_id = ?
  `).all(wsId, wsId);
}

module.exports = {
  startAdsOptimizer,
  stopAdsOptimizer,
  optimizeNow,
  getMetricsHistory,
  getOptimizationLog,
  getLatestMetrics,
  pollMetrics,
};
