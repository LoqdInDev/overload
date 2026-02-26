const { db } = require('../db/database');

// Helper: safely query tables that may not exist
function safeQuery(sql, params = []) {
  try {
    return db.prepare(sql).all(...(Array.isArray(params) ? params : [params]));
  } catch {
    return [];
  }
}

function safeGet(sql, params = []) {
  try {
    return db.prepare(sql).get(...(Array.isArray(params) ? params : [params]));
  } catch {
    return null;
  }
}

/**
 * Get recent content for social media suggestions
 * Pulls recent blog posts and content pieces that could be repurposed
 */
function getContentForSocial() {
  const recentContent = safeQuery(
    "SELECT type, title, substr(content, 1, 200) as excerpt FROM cc_projects ORDER BY created_at DESC LIMIT 5"
  );
  return recentContent;
}

/**
 * Get SEO keywords for content suggestions
 * Pulls tracked keywords that could inform content creation
 */
function getSeoKeywordsForContent() {
  const keywords = safeQuery(
    "SELECT keyword, volume, difficulty, intent FROM seo_keywords ORDER BY volume DESC LIMIT 10"
  );
  return keywords;
}

/**
 * Build a comprehensive cross-module summary for The Advisor
 * Aggregates stats from every available module
 */
function getAllModuleSummary() {
  const sections = [];

  // Activity overview
  const weekActivity = safeGet(
    "SELECT COUNT(*) as count FROM activity_log WHERE created_at >= datetime('now', '-7 days')"
  );
  const recentActions = safeQuery(
    "SELECT module_id, action, title, created_at FROM activity_log ORDER BY created_at DESC LIMIT 10"
  );
  if (weekActivity?.count > 0) {
    sections.push(`ACTIVITY (Last 7 Days): ${weekActivity.count} total actions across modules.`);
    const actionSummary = recentActions.map(a => `  - [${a.module_id}] ${a.title}`).join('\n');
    sections.push(`Recent activity:\n${actionSummary}`);
  }

  // Brand profile status
  const brand = safeGet('SELECT brand_name, tagline, industry, voice_tone, target_audience FROM bp_profiles ORDER BY id DESC LIMIT 1');
  if (brand?.brand_name) {
    sections.push(`BRAND: "${brand.brand_name}" — ${brand.industry || 'industry not set'}. Voice: ${brand.voice_tone || 'not defined'}. Target: ${brand.target_audience || 'not defined'}.`);
  } else {
    sections.push('BRAND: No brand profile configured yet.');
  }

  // Content created
  const contentStats = safeQuery(
    "SELECT type, COUNT(*) as count FROM cc_projects GROUP BY type ORDER BY count DESC"
  );
  if (contentStats.length > 0) {
    const summary = contentStats.map(c => `${c.type}: ${c.count}`).join(', ');
    sections.push(`CONTENT CREATED: ${summary}`);
  }

  // Integrations
  const connectedPlatforms = safeQuery(
    "SELECT provider_id, display_name, last_sync FROM int_connections WHERE status = 'connected'"
  );
  if (connectedPlatforms.length > 0) {
    const names = connectedPlatforms.map(c => c.display_name).join(', ');
    sections.push(`CONNECTED PLATFORMS: ${names} (${connectedPlatforms.length} total)`);
  } else {
    sections.push('CONNECTED PLATFORMS: None connected yet.');
  }

  // CRM pipeline
  const dealStats = safeGet(
    "SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM crm_deals"
  );
  const contactCount = safeGet('SELECT COUNT(*) as count FROM crm_contacts')?.count || 0;
  if (dealStats?.count > 0) {
    sections.push(`CRM: ${contactCount} contacts, ${dealStats.count} deals worth $${Math.round(dealStats.total).toLocaleString()}`);
    const dealsByStage = safeQuery(
      "SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM crm_deals GROUP BY stage"
    );
    if (dealsByStage.length > 0) {
      const pipeline = dealsByStage.map(d => `${d.stage}: ${d.count} ($${Math.round(d.total)})`).join(', ');
      sections.push(`  Pipeline stages: ${pipeline}`);
    }
  }

  // E-commerce
  const orderStats = safeGet(
    "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM eh_orders"
  );
  if (orderStats?.count > 0) {
    sections.push(`E-COMMERCE: ${orderStats.count} orders, $${Math.round(orderStats.revenue).toLocaleString()} total revenue`);
  }

  // Email/SMS
  const emailStats = safeGet("SELECT COUNT(*) as count FROM es_campaigns")?.count || 0;
  const subscriberCount = safeGet("SELECT COUNT(*) as count FROM es_contacts WHERE subscribed = 1")?.count || 0;
  if (emailStats > 0 || subscriberCount > 0) {
    sections.push(`EMAIL/SMS: ${emailStats} campaigns, ${subscriberCount} active subscribers`);
  }

  // SEO
  const seoKeywords = safeGet("SELECT COUNT(*) as count FROM seo_keywords")?.count || 0;
  const seoProjects = safeGet("SELECT COUNT(*) as count FROM seo_projects")?.count || 0;
  if (seoKeywords > 0) {
    sections.push(`SEO: ${seoProjects} projects tracking ${seoKeywords} keywords`);
    const topKeywords = safeQuery("SELECT keyword, volume FROM seo_keywords ORDER BY volume DESC LIMIT 5");
    if (topKeywords.length > 0) {
      sections.push(`  Top keywords: ${topKeywords.map(k => `"${k.keyword}" (vol: ${k.volume})`).join(', ')}`);
    }
  }

  // Paid advertising
  const adCampaigns = safeQuery(
    "SELECT platform, COUNT(*) as count, status FROM pa_campaigns GROUP BY platform, status"
  );
  if (adCampaigns.length > 0) {
    const summary = adCampaigns.map(c => `${c.platform} (${c.status}): ${c.count}`).join(', ');
    sections.push(`PAID ADS: ${summary}`);
  }

  // Goals
  const goals = safeQuery(
    "SELECT name, target_value, current_value, status FROM gt_goals ORDER BY created_at DESC LIMIT 5"
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
function buildCrossModuleContext() {
  const summary = getAllModuleSummary();
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
