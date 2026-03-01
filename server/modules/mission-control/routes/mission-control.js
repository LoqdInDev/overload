const express = require('express');
const { db } = require('../../../db/database');

function getRouter() {
  const router = express.Router();

  function safeQuery(sql, params = []) {
    try { return db.prepare(sql).all(...(Array.isArray(params) ? params : [params])); }
    catch { return []; }
  }

  function safeGet(sql, params = []) {
    try { return db.prepare(sql).get(...(Array.isArray(params) ? params : [params])); }
    catch { return null; }
  }

  // ─── GET /api/mission-control/overview ───
  // Top-level KPI metrics with sparklines & trends
  router.get('/overview', (req, res) => {
    // Total users
    const totalUsers = safeGet('SELECT COUNT(*) as count FROM users')?.count || 0;
    const weekUsers = safeGet(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')"
    )?.count || 0;
    const prevWeekUsers = safeGet(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')"
    )?.count || 0;

    // Total revenue
    const totalRevenue = safeGet('SELECT COALESCE(SUM(total), 0) as total FROM eh_orders')?.total || 0;
    const weekRevenue = safeGet(
      "SELECT COALESCE(SUM(total), 0) as total FROM eh_orders WHERE created_at >= datetime('now', '-7 days')"
    )?.total || 0;
    const prevWeekRevenue = safeGet(
      "SELECT COALESCE(SUM(total), 0) as total FROM eh_orders WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')"
    )?.total || 0;

    // Active modules (distinct modules used)
    const activeModules = safeGet('SELECT COUNT(DISTINCT module_id) as count FROM activity_log')?.count || 0;

    // Connected integrations
    const connectedIntegrations = safeGet(
      "SELECT COUNT(*) as count FROM int_connections WHERE status = 'connected'"
    )?.count || 0;

    // Total activities
    const totalActivities = safeGet('SELECT COUNT(*) as count FROM activity_log')?.count || 0;
    const weekActivities = safeGet(
      "SELECT COUNT(*) as count FROM activity_log WHERE created_at >= datetime('now', '-7 days')"
    )?.count || 0;

    // Workspaces
    const totalWorkspaces = safeGet('SELECT COUNT(*) as count FROM workspaces')?.count || 0;

    // 7-day sparklines
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      last7.push(d.toISOString().split('T')[0]);
    }

    const dailyUsers = safeQuery(
      "SELECT date(created_at) as day, COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at)"
    );
    const dailyRevenue = safeQuery(
      "SELECT date(created_at) as day, COALESCE(SUM(total), 0) as total FROM eh_orders WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at)"
    );
    const dailyActivity = safeQuery(
      "SELECT date(created_at) as day, COUNT(*) as count FROM activity_log WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at)"
    );

    const userSpark = last7.map(d => dailyUsers.find(r => r.day === d)?.count || 0);
    const revenueSpark = last7.map(d => dailyRevenue.find(r => r.day === d)?.total || 0);
    const activitySpark = last7.map(d => dailyActivity.find(r => r.day === d)?.count || 0);

    // Trend helpers
    const userTrend = prevWeekUsers > 0 ? Math.round(((weekUsers - prevWeekUsers) / prevWeekUsers) * 100) : weekUsers > 0 ? 100 : 0;
    const revenueTrend = prevWeekRevenue > 0 ? Math.round(((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100) : weekRevenue > 0 ? 100 : 0;

    res.json({
      kpi: [
        { label: 'Total Users', value: totalUsers, trend: userTrend, weekDelta: weekUsers, spark: userSpark, color: '#5E8E6E' },
        { label: 'Total Revenue', value: Math.round(totalRevenue), prefix: '$', trend: revenueTrend, weekDelta: Math.round(weekRevenue), spark: revenueSpark, color: '#C45D3E' },
        { label: 'Active Modules', value: activeModules, spark: activitySpark, color: '#D4915C' },
        { label: 'Integrations', value: connectedIntegrations, spark: activitySpark, color: '#8B7355' },
      ],
      totals: { totalActivities, weekActivities, totalWorkspaces },
    });
  });

  // ─── GET /api/mission-control/users ───
  router.get('/users', (req, res) => {
    const users = safeQuery(`
      SELECT u.id, u.email, u.display_name, u.role, u.created_at,
        (SELECT MAX(a.created_at) FROM activity_log a
         JOIN workspace_members wm ON wm.workspace_id = a.workspace_id
         WHERE wm.user_id = u.id) as last_activity,
        (SELECT COUNT(*) FROM workspace_members wm WHERE wm.user_id = u.id) as workspace_count
      FROM users u ORDER BY u.created_at DESC
    `);
    res.json(users);
  });

  // ─── GET /api/mission-control/revenue ───
  router.get('/revenue', (req, res) => {
    const days = parseInt(req.query.days) || 30;

    const dailyRevenue = safeQuery(`
      SELECT date(created_at) as day, COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
      FROM eh_orders WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY date(created_at) ORDER BY day ASC
    `);

    const totalOrders = safeGet('SELECT COUNT(*) as count FROM eh_orders')?.count || 0;
    const totalRevenue = safeGet('SELECT COALESCE(SUM(total), 0) as total FROM eh_orders')?.total || 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // CRM deal pipeline
    const dealPipeline = safeGet("SELECT COALESCE(SUM(value), 0) as total FROM crm_deals WHERE stage != 'lost'")?.total || 0;
    const dealCount = safeGet("SELECT COUNT(*) as count FROM crm_deals WHERE stage != 'lost'")?.count || 0;

    res.json({ daily: dailyRevenue, totalOrders, totalRevenue: Math.round(totalRevenue), avgOrderValue, dealPipeline: Math.round(dealPipeline), dealCount });
  });

  // ─── GET /api/mission-control/activity ───
  router.get('/activity', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const activities = safeQuery(`
      SELECT a.*, w.name as workspace_name
      FROM activity_log a
      LEFT JOIN workspaces w ON w.id = a.workspace_id
      ORDER BY a.created_at DESC LIMIT ?
    `, [limit]);

    const moduleLabels = {
      'content-creation': 'AI Content', 'video-marketing': 'Video', 'creative-design': 'Design',
      'email-sms': 'Email & SMS', 'social-posting': 'Social', 'seo-suite': 'SEO',
      'paid-advertising': 'Paid Ads', 'brand-profile': 'Brand', 'crm': 'CRM',
      'ecommerce-hub': 'E-Commerce', 'integrations': 'Integrations', 'the-advisor': 'Advisor',
      'autopilot': 'Autopilot', 'funnels': 'Funnels', 'analytics': 'Analytics',
      'brand-strategy': 'Brand Strategy', 'competitors': 'Competitors', 'influencers': 'Influencers',
      'reviews': 'Reviews', 'calendar': 'Calendar', 'scheduler': 'Scheduler',
      'workflow-builder': 'Workflows', 'audience-builder': 'Audiences', 'ab-testing': 'A/B Tests',
      'budget-optimizer': 'Budget', 'product-feeds': 'Product Feeds', 'reports': 'Reports',
    };

    const moduleColors = {
      'content-creation': '#D4915C', 'video-marketing': '#C45D3E', 'creative-design': '#9B6B6B',
      'email-sms': '#C45D3E', 'social-posting': '#8B7355', 'seo-suite': '#5E8E6E',
      'paid-advertising': '#5E8E6E', 'brand-profile': '#D4915C', 'crm': '#8B7355',
      'ecommerce-hub': '#5E8E6E', 'integrations': '#C45D3E', 'the-advisor': '#C45D3E',
      'autopilot': '#D4915C', 'funnels': '#5E8E6E', 'analytics': '#8B7355',
    };

    const feed = activities.map(a => {
      const created = new Date(a.created_at + 'Z');
      const diffMs = Date.now() - created;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);
      let time = diffMin < 1 ? 'just now' : diffMin < 60 ? `${diffMin}m` : diffHr < 24 ? `${diffHr}h` : `${diffDay}d`;

      return {
        id: a.id, module: moduleLabels[a.module_id] || a.module_id,
        moduleId: a.module_id, action: a.title, detail: a.detail || '',
        time, color: moduleColors[a.module_id] || '#94908A',
        workspace: a.workspace_name || 'Unknown', createdAt: a.created_at,
      };
    });

    res.json(feed);
  });

  // ─── GET /api/mission-control/modules ───
  router.get('/modules', (req, res) => {
    const modules = safeQuery(`
      SELECT module_id, COUNT(*) as count,
        MAX(created_at) as last_used
      FROM activity_log
      GROUP BY module_id ORDER BY count DESC
    `);

    const moduleLabels = {
      'content-creation': 'AI Content', 'video-marketing': 'Video', 'creative-design': 'Design',
      'email-sms': 'Email & SMS', 'social-posting': 'Social', 'seo-suite': 'SEO',
      'paid-advertising': 'Paid Ads', 'brand-profile': 'Brand', 'crm': 'CRM',
      'ecommerce-hub': 'E-Commerce', 'integrations': 'Integrations', 'the-advisor': 'Advisor',
      'autopilot': 'Autopilot', 'funnels': 'Funnels', 'analytics': 'Analytics',
      'brand-strategy': 'Brand Strategy', 'competitors': 'Competitors', 'influencers': 'Influencers',
      'reviews': 'Reviews', 'calendar': 'Calendar', 'scheduler': 'Scheduler',
      'workflow-builder': 'Workflows', 'audience-builder': 'Audiences', 'ab-testing': 'A/B Tests',
      'budget-optimizer': 'Budget', 'product-feeds': 'Product Feeds', 'reports': 'Reports',
    };

    const moduleColors = {
      'content-creation': '#D4915C', 'video-marketing': '#C45D3E', 'creative-design': '#9B6B6B',
      'email-sms': '#C45D3E', 'social-posting': '#8B7355', 'seo-suite': '#5E8E6E',
      'paid-advertising': '#5E8E6E', 'brand-profile': '#D4915C', 'crm': '#8B7355',
      'ecommerce-hub': '#5E8E6E', 'integrations': '#C45D3E', 'the-advisor': '#C45D3E',
      'autopilot': '#D4915C', 'funnels': '#5E8E6E', 'analytics': '#8B7355',
    };

    const total = modules.reduce((s, m) => s + m.count, 0);

    res.json(modules.map(m => ({
      id: m.module_id,
      name: moduleLabels[m.module_id] || m.module_id,
      count: m.count,
      pct: total > 0 ? Math.round((m.count / total) * 100) : 0,
      color: moduleColors[m.module_id] || '#94908A',
      lastUsed: m.last_used,
    })));
  });

  // ─── GET /api/mission-control/health ───
  router.get('/health', (req, res) => {
    const workspaces = safeGet('SELECT COUNT(*) as count FROM workspaces')?.count || 0;
    const orders = safeGet('SELECT COUNT(*) as count FROM eh_orders')?.count || 0;
    const contacts = safeGet('SELECT COUNT(*) as count FROM crm_contacts')?.count || 0;
    const content = safeGet('SELECT COUNT(*) as count FROM cc_projects')?.count || 0;
    const campaigns = safeGet("SELECT COUNT(*) as count FROM pa_campaigns")?.count || 0;
    const emailCampaigns = safeGet('SELECT COUNT(*) as count FROM es_campaigns')?.count || 0;
    const subscribers = safeGet("SELECT COUNT(*) as count FROM es_contacts WHERE subscribed = 1")?.count || 0;
    const socialPosts = safeGet('SELECT COUNT(*) as count FROM sm_posts')?.count || 0;
    const products = safeGet('SELECT COUNT(*) as count FROM products')?.count || 0;

    // Integration breakdown
    const integrations = safeQuery(`
      SELECT provider_id, status, COUNT(*) as count
      FROM int_connections GROUP BY provider_id, status
    `);

    res.json({
      workspaces, orders, contacts, content, campaigns,
      emailCampaigns, subscribers, socialPosts, products,
      integrations,
    });
  });

  return router;
}

module.exports = { getRouter };
