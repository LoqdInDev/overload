const { db } = require('../db/database');

// Helper: safely query tables that may not exist, with optional workspace scoping
function safeQuery(sql, params = [], workspaceId) {
  try {
    if (workspaceId) {
      const scoped = injectWhere(sql, 'workspace_id = ?');
      return db.prepare(scoped).all(...[...(Array.isArray(params) ? params : [params]), workspaceId]);
    }
    return db.prepare(sql).all(...(Array.isArray(params) ? params : [params]));
  } catch {
    return [];
  }
}

function safeGet(sql, params = [], workspaceId) {
  try {
    if (workspaceId) {
      const scoped = injectWhere(sql, 'workspace_id = ?');
      return db.prepare(scoped).get(...[...(Array.isArray(params) ? params : [params]), workspaceId]);
    }
    return db.prepare(sql).get(...(Array.isArray(params) ? params : [params]));
  } catch {
    return null;
  }
}

// Simple helper to inject a WHERE condition into a SQL query
function injectWhere(sql, condition) {
  const upper = sql.toUpperCase();
  if (upper.includes('WHERE')) {
    return sql.replace(/WHERE/i, `WHERE ${condition} AND`);
  }
  const match = sql.match(/\b(ORDER\s+BY|GROUP\s+BY|LIMIT|HAVING)\b/i);
  if (match) {
    const pos = sql.indexOf(match[0]);
    return sql.slice(0, pos) + ` WHERE ${condition} ` + sql.slice(pos);
  }
  return sql + ` WHERE ${condition}`;
}

/**
 * Get recent content for social media suggestions
 */
function getContentForSocial(workspaceId) {
  return safeQuery(
    "SELECT type, title, substr(content, 1, 200) as excerpt FROM cc_projects ORDER BY created_at DESC LIMIT 5",
    [], workspaceId
  );
}

/**
 * Get SEO keywords for content suggestions
 */
function getSeoKeywordsForContent(workspaceId) {
  return safeQuery(
    "SELECT keyword, volume, difficulty, intent FROM seo_keywords ORDER BY volume DESC LIMIT 10",
    [], workspaceId
  );
}

/**
 * Build a comprehensive cross-module summary for The Advisor
 */
function getAllModuleSummary(workspaceId) {
  const sections = [];

  // Activity overview
  const weekActivity = safeGet(
    "SELECT COUNT(*) as count FROM activity_log WHERE created_at >= datetime('now', '-7 days')",
    [], workspaceId
  );
  const recentActions = safeQuery(
    "SELECT module_id, action, title, created_at FROM activity_log ORDER BY created_at DESC LIMIT 10",
    [], workspaceId
  );
  if (weekActivity?.count > 0) {
    sections.push(`ACTIVITY (Last 7 Days): ${weekActivity.count} total actions across modules.`);
    const actionSummary = recentActions.map(a => `  - [${a.module_id}] ${a.title}`).join('\n');
    sections.push(`Recent activity:\n${actionSummary}`);
  }

  // Brand profile status
  const brand = safeGet('SELECT brand_name, tagline, industry, voice_tone, target_audience FROM bp_profiles ORDER BY id DESC LIMIT 1', [], workspaceId);
  if (brand?.brand_name) {
    sections.push(`BRAND: "${brand.brand_name}" — ${brand.industry || 'industry not set'}. Voice: ${brand.voice_tone || 'not defined'}. Target: ${brand.target_audience || 'not defined'}.`);
  } else {
    sections.push('BRAND: No brand profile configured yet.');
  }

  // Content created
  const contentStats = safeQuery(
    "SELECT type, COUNT(*) as count FROM cc_projects GROUP BY type ORDER BY count DESC",
    [], workspaceId
  );
  if (contentStats.length > 0) {
    const summary = contentStats.map(c => `${c.type}: ${c.count}`).join(', ');
    sections.push(`CONTENT CREATED: ${summary}`);
  }

  // Integrations
  const connectedPlatforms = safeQuery(
    "SELECT provider_id, display_name, last_sync FROM int_connections WHERE status = 'connected'",
    [], workspaceId
  );
  if (connectedPlatforms.length > 0) {
    const names = connectedPlatforms.map(c => c.display_name).join(', ');
    sections.push(`CONNECTED PLATFORMS: ${names} (${connectedPlatforms.length} total)`);
  } else {
    sections.push('CONNECTED PLATFORMS: None connected yet.');
  }

  // CRM pipeline
  const dealStats = safeGet(
    "SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM crm_deals",
    [], workspaceId
  );
  const contactCount = safeGet('SELECT COUNT(*) as count FROM crm_contacts', [], workspaceId)?.count || 0;
  if (dealStats?.count > 0) {
    sections.push(`CRM: ${contactCount} contacts, ${dealStats.count} deals worth $${Math.round(dealStats.total).toLocaleString()}`);
    const dealsByStage = safeQuery(
      "SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM crm_deals GROUP BY stage",
      [], workspaceId
    );
    if (dealsByStage.length > 0) {
      const pipeline = dealsByStage.map(d => `${d.stage}: ${d.count} ($${Math.round(d.total)})`).join(', ');
      sections.push(`  Pipeline stages: ${pipeline}`);
    }
  }

  // E-commerce
  const orderStats = safeGet(
    "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM eh_orders",
    [], workspaceId
  );
  if (orderStats?.count > 0) {
    sections.push(`E-COMMERCE: ${orderStats.count} orders, $${Math.round(orderStats.revenue).toLocaleString()} total revenue`);
  }

  // Email/SMS
  const emailStats = safeGet("SELECT COUNT(*) as count FROM es_campaigns", [], workspaceId)?.count || 0;
  const subscriberCount = safeGet("SELECT COUNT(*) as count FROM es_contacts WHERE subscribed = 1", [], workspaceId)?.count || 0;
  if (emailStats > 0 || subscriberCount > 0) {
    sections.push(`EMAIL/SMS: ${emailStats} campaigns, ${subscriberCount} active subscribers`);
  }

  // SEO
  const seoKeywords = safeGet("SELECT COUNT(*) as count FROM seo_keywords", [], workspaceId)?.count || 0;
  const seoProjects = safeGet("SELECT COUNT(*) as count FROM seo_projects", [], workspaceId)?.count || 0;
  if (seoKeywords > 0) {
    sections.push(`SEO: ${seoProjects} projects tracking ${seoKeywords} keywords`);
    const topKeywords = safeQuery("SELECT keyword, volume FROM seo_keywords ORDER BY volume DESC LIMIT 5", [], workspaceId);
    if (topKeywords.length > 0) {
      sections.push(`  Top keywords: ${topKeywords.map(k => `"${k.keyword}" (vol: ${k.volume})`).join(', ')}`);
    }
  }

  // Paid advertising
  const adCampaigns = safeQuery(
    "SELECT platform, COUNT(*) as count, status FROM pa_campaigns GROUP BY platform, status",
    [], workspaceId
  );
  if (adCampaigns.length > 0) {
    const summary = adCampaigns.map(c => `${c.platform} (${c.status}): ${c.count}`).join(', ');
    sections.push(`PAID ADS: ${summary}`);
  }

  // Goals
  const goals = safeQuery(
    "SELECT name, target_value, current_value, status FROM gt_goals ORDER BY created_at DESC LIMIT 5",
    [], workspaceId
  );
  if (goals.length > 0) {
    const goalSummary = goals.map(g => {
      const pct = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0;
      return `"${g.name}": ${pct}% complete (${g.status})`;
    }).join(', ');
    sections.push(`GOALS: ${goalSummary}`);
  }

  return sections.join('\n\n');
}

/**
 * Build a context block string for injecting into AI prompts
 */
function buildCrossModuleContext(workspaceId) {
  const summary = getAllModuleSummary(workspaceId);
  if (!summary.trim()) return '';

  return `\n\n--- CROSS-MODULE INTELLIGENCE ---
The following is real data from across the user's marketing operations. Use this to provide specific, data-driven recommendations:

${summary}
--- END CROSS-MODULE DATA ---\n`;
}

module.exports = {
  getContentForSocial,
  getSeoKeywordsForContent,
  getAllModuleSummary,
  buildCrossModuleContext,
};
