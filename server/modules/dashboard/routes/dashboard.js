const express = require('express');
const { db } = require('../../../db/database');

function getRouter() {
  const router = express.Router();

  // Helper: safely query a table that may not exist yet
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

  // ─── GET /api/dashboard/summary ───
  // Aggregates key metrics from across all modules
  router.get('/summary', (req, res) => {
    const wsId = req.workspace.id;

    // Activity counts
    const totalActivities = safeGet('SELECT COUNT(*) as count FROM activity_log WHERE workspace_id = ?', [wsId])?.count || 0;
    const weekActivities = safeGet(
      "SELECT COUNT(*) as count FROM activity_log WHERE workspace_id = ? AND created_at >= datetime('now', '-7 days')", [wsId]
    )?.count || 0;
    const prevWeekActivities = safeGet(
      "SELECT COUNT(*) as count FROM activity_log WHERE workspace_id = ? AND created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')", [wsId]
    )?.count || 0;

    // Distinct modules used
    const activeModules = safeGet('SELECT COUNT(DISTINCT module_id) as count FROM activity_log WHERE workspace_id = ?', [wsId])?.count || 0;

    // Content pieces created
    const contentCount = safeGet('SELECT COUNT(*) as count FROM cc_projects WHERE workspace_id = ?', [wsId])?.count || 0;
    const weekContent = safeGet(
      "SELECT COUNT(*) as count FROM cc_projects WHERE workspace_id = ? AND created_at >= datetime('now', '-7 days')", [wsId]
    )?.count || 0;

    // Connected integrations
    const connectedIntegrations = safeGet(
      "SELECT COUNT(*) as count FROM int_connections WHERE workspace_id = ? AND status = 'connected'", [wsId]
    )?.count || 0;

    // Brand profile completeness
    const brandProfile = safeGet('SELECT * FROM bp_profiles WHERE workspace_id = ? ORDER BY id DESC LIMIT 1', [wsId]);
    let brandCompleteness = 0;
    if (brandProfile) {
      const fields = ['brand_name', 'tagline', 'mission', 'vision', 'values', 'voice_tone',
        'voice_personality', 'target_audience', 'competitors', 'colors', 'fonts',
        'logo_url', 'guidelines', 'keywords', 'industry', 'website'];
      const filled = fields.filter(f => brandProfile[f] && brandProfile[f].trim()).length;
      brandCompleteness = Math.round((filled / fields.length) * 100);
    }

    // CRM contacts & deal value
    const contactCount = safeGet('SELECT COUNT(*) as count FROM crm_contacts WHERE workspace_id = ?', [wsId])?.count || 0;
    const dealPipeline = safeGet('SELECT COALESCE(SUM(value), 0) as total FROM crm_deals WHERE workspace_id = ?', [wsId])?.total || 0;

    // Email subscribers
    const subscriberCount = safeGet(
      'SELECT COUNT(*) as count FROM es_contacts WHERE workspace_id = ? AND subscribed = 1', [wsId]
    )?.count || 0;

    // E-commerce revenue (total order value)
    const totalRevenue = safeGet('SELECT COALESCE(SUM(total), 0) as total FROM eh_orders WHERE workspace_id = ?', [wsId])?.total || 0;
    const weekRevenue = safeGet(
      "SELECT COALESCE(SUM(total), 0) as total FROM eh_orders WHERE workspace_id = ? AND created_at >= datetime('now', '-7 days')", [wsId]
    )?.total || 0;

    // Campaigns (paid ads + email)
    const adCampaigns = safeGet(
      "SELECT COUNT(*) as count FROM pa_campaigns WHERE workspace_id = ? AND status = 'active'", [wsId]
    )?.count || 0;
    const emailCampaigns = safeGet(
      "SELECT COUNT(*) as count FROM es_campaigns WHERE workspace_id = ? AND status IN ('active', 'sending', 'scheduled')", [wsId]
    )?.count || 0;
    const activeCampaigns = adCampaigns + emailCampaigns;

    // Daily activity for sparkline (last 7 days)
    const dailyActivity = safeQuery(
      `SELECT date(created_at) as day, COUNT(*) as count
       FROM activity_log
       WHERE workspace_id = ? AND created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at)
       ORDER BY day ASC`, [wsId]
    );

    // Daily revenue for sparkline (last 7 days)
    const dailyRevenue = safeQuery(
      `SELECT date(created_at) as day, COALESCE(SUM(total), 0) as total
       FROM eh_orders
       WHERE workspace_id = ? AND created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at)
       ORDER BY day ASC`, [wsId]
    );

    // Build sparkline arrays (fill missing days with 0)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7.push(d.toISOString().split('T')[0]);
    }

    const activitySpark = last7.map(day => {
      const match = dailyActivity.find(r => r.day === day);
      return match ? match.count : 0;
    });

    const revenueSpark = last7.map(day => {
      const match = dailyRevenue.find(r => r.day === day);
      return match ? match.total : 0;
    });

    // Trend calculation helpers
    const activityTrend = prevWeekActivities > 0
      ? Math.round(((weekActivities - prevWeekActivities) / prevWeekActivities) * 100)
      : weekActivities > 0 ? 100 : 0;

    res.json({
      kpi: [
        {
          label: 'Revenue',
          value: Math.round(weekRevenue),
          prefix: '$',
          color: '#5E8E6E',
          trend: weekRevenue > 0 ? `+$${Math.round(weekRevenue).toLocaleString()}` : '$0',
          up: weekRevenue > 0,
          spark: revenueSpark,
          sub: 'this week',
        },
        {
          label: 'Campaigns',
          value: activeCampaigns,
          color: '#C45D3E',
          trend: activeCampaigns > 0 ? `${activeCampaigns}` : '0',
          up: activeCampaigns > 0,
          spark: activitySpark,
          sub: 'active',
        },
        {
          label: 'Content',
          value: contentCount,
          color: '#D4915C',
          trend: weekContent > 0 ? `+${weekContent}` : '0',
          up: weekContent > 0,
          spark: activitySpark,
          sub: `${weekContent} this week`,
        },
        {
          label: 'Subscribers',
          value: subscriberCount,
          color: '#8B7355',
          trend: subscriberCount > 0 ? subscriberCount.toLocaleString() : '0',
          up: subscriberCount > 0,
          spark: activitySpark.map((v, i) => subscriberCount + i),
          sub: 'total',
        },
      ],
      overview: {
        totalActivities,
        weekActivities,
        activityTrend,
        activeModules,
        connectedIntegrations,
        brandCompleteness,
        contactCount,
        dealPipeline,
        totalRevenue,
      },
    });
  });

  // ─── GET /api/dashboard/feed ───
  // Real activity feed with module metadata
  router.get('/feed', (req, res) => {
    const wsId = req.workspace.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const activities = safeQuery(
      'SELECT * FROM activity_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?',
      [wsId, limit]
    );

    // Module color mapping
    const moduleColors = {
      'content-creation': '#D4915C',
      'video-marketing': '#C45D3E',
      'creative-design': '#9B6B6B',
      'email-sms': '#C45D3E',
      'social-posting': '#8B7355',
      'seo-suite': '#5E8E6E',
      'paid-advertising': '#5E8E6E',
      'brand-profile': '#D4915C',
      'crm': '#8B7355',
      'ecommerce-hub': '#5E8E6E',
      'integrations': '#C45D3E',
      'the-advisor': '#C45D3E',
      'autopilot': '#D4915C',
      'funnels': '#5E8E6E',
      'analytics': '#8B7355',
    };

    const moduleLabels = {
      'content-creation': 'AI Content',
      'video-marketing': 'Video',
      'creative-design': 'Design',
      'email-sms': 'Email & SMS',
      'social-posting': 'Social',
      'seo-suite': 'SEO Suite',
      'paid-advertising': 'Paid Ads',
      'brand-profile': 'Brand',
      'crm': 'CRM',
      'ecommerce-hub': 'E-Commerce',
      'integrations': 'Integrations',
      'the-advisor': 'Advisor',
      'autopilot': 'Autopilot',
      'funnels': 'Funnels',
      'analytics': 'Analytics',
    };

    const feed = activities.map(a => {
      const createdAt = new Date(a.created_at + 'Z');
      const now = new Date();
      const diffMs = now - createdAt;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);

      let time;
      if (diffMin < 1) time = 'just now';
      else if (diffMin < 60) time = `${diffMin}m`;
      else if (diffHr < 24) time = `${diffHr}h`;
      else time = `${diffDay}d`;

      return {
        id: a.id,
        module: moduleLabels[a.module_id] || a.module_id,
        action: a.title,
        detail: a.detail || '',
        time,
        color: moduleColors[a.module_id] || '#94908A',
        createdAt: a.created_at,
      };
    });

    res.json(feed);
  });

  // ─── GET /api/dashboard/actions ───
  // Smart priority actions based on system state
  router.get('/actions', (req, res) => {
    const wsId = req.workspace.id;
    const actions = [];

    // Check brand profile
    const brandProfile = safeGet('SELECT * FROM bp_profiles WHERE workspace_id = ? ORDER BY id DESC LIMIT 1', [wsId]);
    if (!brandProfile || !brandProfile.brand_name) {
      actions.push({
        id: 'brand-profile',
        title: 'Complete Brand Profile',
        desc: 'Improves all AI-generated outputs with your brand context.',
        path: '/brand-profile',
        color: '#C45D3E',
        priority: 'high',
      });
    } else {
      // Check completeness
      const fields = ['brand_name', 'tagline', 'mission', 'voice_tone', 'target_audience', 'colors', 'industry'];
      const filled = fields.filter(f => brandProfile[f] && brandProfile[f].trim()).length;
      if (filled < fields.length) {
        actions.push({
          id: 'brand-incomplete',
          title: 'Finish Brand Profile',
          desc: `${fields.length - filled} fields still empty — better context = better AI.`,
          path: '/brand-profile',
          color: '#D4915C',
          priority: 'medium',
        });
      }
    }

    // Check integrations
    const connectedCount = safeGet(
      "SELECT COUNT(*) as count FROM int_connections WHERE workspace_id = ? AND status = 'connected'", [wsId]
    )?.count || 0;
    if (connectedCount === 0) {
      actions.push({
        id: 'connect-platforms',
        title: 'Connect Ad Platforms',
        desc: 'Enable cross-platform analytics and automation.',
        path: '/integrations',
        color: '#5E8E6E',
        priority: 'high',
      });
    }

    // Check content creation
    const contentCount = safeGet('SELECT COUNT(*) as count FROM cc_projects WHERE workspace_id = ?', [wsId])?.count || 0;
    if (contentCount === 0) {
      actions.push({
        id: 'first-content',
        title: 'Create First Content',
        desc: 'Generate a blog post, ad copy, or social content with AI.',
        path: '/content',
        color: '#D4915C',
        priority: 'medium',
      });
    }

    // Check CRM
    const contactCount = safeGet('SELECT COUNT(*) as count FROM crm_contacts WHERE workspace_id = ?', [wsId])?.count || 0;
    if (contactCount === 0) {
      actions.push({
        id: 'add-contacts',
        title: 'Add CRM Contacts',
        desc: 'Start building your customer pipeline.',
        path: '/crm',
        color: '#8B7355',
        priority: 'low',
      });
    }

    // Check email contacts
    const subCount = safeGet('SELECT COUNT(*) as count FROM es_contacts WHERE workspace_id = ? AND subscribed = 1', [wsId])?.count || 0;
    if (subCount === 0) {
      actions.push({
        id: 'email-list',
        title: 'Build Email List',
        desc: 'Import or add subscriber contacts for campaigns.',
        path: '/email-sms',
        color: '#8B7355',
        priority: 'low',
      });
    }

    // Check autopilot
    const autopilotConfig = safeGet("SELECT * FROM ap_config WHERE workspace_id = ? AND status = 'active' LIMIT 1", [wsId]);
    if (!autopilotConfig) {
      actions.push({
        id: 'activate-autopilot',
        title: 'Activate Autopilot',
        desc: 'AI scheduling & optimization across modules.',
        path: '/autopilot',
        color: '#D4915C',
        priority: 'medium',
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json(actions.slice(0, 4));
  });

  // ─── GET /api/dashboard/channels ───
  // Channel distribution from integrations & campaigns
  router.get('/channels', (req, res) => {
    const wsId = req.workspace.id;
    const channels = [];

    // Get campaigns by platform
    const platformCampaigns = safeQuery(
      `SELECT platform, COUNT(*) as count FROM pa_campaigns
       WHERE workspace_id = ? AND status IN ('active', 'paused')
       GROUP BY platform ORDER BY count DESC`, [wsId]
    );

    // Get email campaign count
    const emailCount = safeGet(
      "SELECT COUNT(*) as count FROM es_campaigns WHERE workspace_id = ? AND status IN ('active', 'sending', 'scheduled')", [wsId]
    )?.count || 0;

    // Get connected integrations
    const connections = safeQuery(
      "SELECT provider_id FROM int_connections WHERE workspace_id = ? AND status = 'connected'", [wsId]
    );

    const colorMap = {
      google: '#C45D3E',
      meta: '#5E8E6E',
      facebook: '#5E8E6E',
      tiktok: '#9B6B6B',
      linkedin: '#8B7355',
      twitter: '#D4915C',
      email: '#D4915C',
      organic: '#8B7355',
    };

    // Build channel list from whatever data exists
    const total = platformCampaigns.reduce((s, p) => s + p.count, 0) + emailCount + 1; // +1 for organic

    for (const p of platformCampaigns) {
      const name = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
      channels.push({
        name: `${name} Ads`,
        pct: Math.round((p.count / total) * 100),
        color: colorMap[p.platform.toLowerCase()] || '#94908A',
      });
    }

    if (emailCount > 0) {
      channels.push({
        name: 'Email',
        pct: Math.round((emailCount / total) * 100),
        color: colorMap.email,
      });
    }

    // Always include organic
    channels.push({
      name: 'Organic',
      pct: Math.max(1, Math.round((1 / total) * 100)),
      color: colorMap.organic,
    });

    // Normalize percentages to sum to 100
    if (channels.length > 0) {
      const sum = channels.reduce((s, c) => s + c.pct, 0);
      if (sum !== 100 && sum > 0) {
        channels[0].pct += (100 - sum);
      }
    }

    // If no real data, return defaults showing what to connect
    if (channels.length <= 1) {
      res.json({
        channels: [],
        empty: true,
        message: 'Connect platforms to see channel distribution',
      });
      return;
    }

    res.json({ channels, empty: false });
  });

  // ─── GET /api/dashboard/weekly ───
  // Weekly revenue/activity data for chart
  router.get('/weekly', (req, res) => {
    const wsId = req.workspace.id;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];

      // Revenue for this day
      const rev = safeGet(
        "SELECT COALESCE(SUM(total), 0) as total FROM eh_orders WHERE workspace_id = ? AND date(created_at) = ?",
        [wsId, dateStr]
      )?.total || 0;

      // Activity count for this day
      const acts = safeGet(
        "SELECT COUNT(*) as count FROM activity_log WHERE workspace_id = ? AND date(created_at) = ?",
        [wsId, dateStr]
      )?.count || 0;

      weekData.push({ day: dayName, rev: Math.round(rev), activity: acts, date: dateStr });
    }

    const hasRevenue = weekData.some(d => d.rev > 0);

    res.json({
      data: weekData,
      hasRevenue,
      total: weekData.reduce((s, d) => s + d.rev, 0),
    });
  });

  return router;
}

module.exports = { getRouter };
