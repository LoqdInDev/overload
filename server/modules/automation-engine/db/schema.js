const { db } = require('../../../db/database');

const AUTOMATABLE_MODULES = [
  'content', 'video-marketing', 'creative', 'email-sms', 'social',
  'ads', 'seo', 'pr-press', 'influencers', 'reviews', 'customer-ai', 'reports'
];

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_module_modes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      module_id TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'manual',
      config TEXT,
      risk_level TEXT DEFAULT 'conservative',
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(module_id, workspace_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_approval_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      module_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      payload TEXT NOT NULL,
      ai_confidence REAL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      review_notes TEXT,
      source TEXT,
      expires_at TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_action_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      module_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      mode TEXT NOT NULL,
      description TEXT,
      input_data TEXT,
      output_data TEXT,
      status TEXT NOT NULL,
      error TEXT,
      approval_id INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      module_id TEXT NOT NULL,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_config TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_config TEXT,
      requires_approval INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      last_triggered TEXT,
      run_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      module_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ae_settings (
      key TEXT PRIMARY KEY,
      workspace_id TEXT,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed default mode rows for all automatable modules per workspace
  const workspaces = db.prepare('SELECT id FROM workspaces').all();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO ae_module_modes (module_id, mode, workspace_id) VALUES (?, ?, ?)'
  );
  for (const ws of workspaces) {
    for (const moduleId of AUTOMATABLE_MODULES) {
      insert.run(moduleId, 'manual', ws.id);
    }
  }

  // Seed demo data if tables are empty
  if (workspaces.length > 0) {
    seedDemoData(workspaces[0].id);
  }
}

function createNotification(type, title, message, moduleId, wsId) {
  db.prepare(
    'INSERT INTO ae_notifications (type, title, message, module_id, workspace_id) VALUES (?, ?, ?, ?, ?)'
  ).run(type, title, message || null, moduleId || null, wsId || null);
}

function seedDemoData(wsId) {
  if (!wsId) return;
  const existing = db.prepare('SELECT COUNT(*) as count FROM ae_approval_queue WHERE workspace_id = ?').get(wsId);
  if (existing.count > 0) return;

  // Set some modules to copilot/autopilot
  const updateMode = db.prepare('UPDATE ae_module_modes SET mode = ?, updated_at = datetime(\'now\') WHERE module_id = ? AND workspace_id = ?');
  updateMode.run('copilot', 'content', wsId);
  updateMode.run('copilot', 'social', wsId);
  updateMode.run('autopilot', 'email-sms', wsId);
  updateMode.run('autopilot', 'ads', wsId);
  updateMode.run('copilot', 'seo', wsId);
  updateMode.run('autopilot', 'reviews', wsId);

  // --- Approval Queue (7 pending items) ---
  const insertApproval = db.prepare(`
    INSERT INTO ae_approval_queue (module_id, action_type, title, description, payload, ai_confidence, priority, status, source, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'ai', datetime('now', ?), ?)
  `);

  insertApproval.run('content', 'publish_blog',
    'Blog Post: "7 Email Subject Line Formulas That Double Open Rates"',
    'AI-generated blog post based on top-performing content patterns. Includes SEO-optimized headline, meta description, and internal linking suggestions.',
    JSON.stringify({ type: 'blog', headline: '7 Email Subject Line Formulas That Double Open Rates', word_count: 1842, seo_score: 92, tone: 'professional', preview: 'Your email subject line is the gatekeeper between your message and your audience. Here are 7 proven formulas that consistently achieve 2x open rates...' }),
    0.91, 'high', '-2 hours', wsId);

  insertApproval.run('social', 'schedule_post',
    'Instagram Carousel: Spring Collection Launch',
    'AI created a 5-slide carousel post announcing the Spring 2026 collection. Scheduled for tomorrow at 11:30 AM EST (peak engagement window).',
    JSON.stringify({ platform: 'instagram', post_type: 'carousel', slides: 5, scheduled_time: '2026-02-28T11:30:00Z', caption: 'Spring is calling. Our new collection just dropped — fresh colors, timeless cuts, made for the season ahead.', hashtags: ['#SpringCollection', '#NewArrivals', '#FashionForward'] }),
    0.87, 'medium', '-4 hours', wsId);

  insertApproval.run('seo', 'update_meta',
    'SEO Meta Overhaul: 12 Product Pages Below Score 60',
    'AI identified 12 product pages with SEO scores below 60. Proposed new meta titles, descriptions, and heading structures for each.',
    JSON.stringify({ pages_affected: 12, avg_current_score: 47, avg_proposed_score: 84, changes: ['meta titles', 'meta descriptions', 'H1 restructure', 'alt text updates'] }),
    0.83, 'medium', '-6 hours', wsId);

  insertApproval.run('email-sms', 'send_campaign',
    'Re-engagement Email: "We Miss You" to Inactive Subscribers',
    'Automated re-engagement campaign targeting 1,247 subscribers inactive for 30+ days. Includes personalized subject lines and a 15% discount offer.',
    JSON.stringify({ campaign_type: 'reengagement', recipients: 1247, subject_line: "We miss you — here's 15% off to welcome you back", segments: ['inactive_30d'], discount: '15%', estimated_open_rate: 0.24 }),
    0.78, 'high', '-8 hours', wsId);

  insertApproval.run('ads', 'adjust_budget',
    'Meta Ads: Increase Budget for High-ROAS "Summer Retargeting" Campaign',
    'Campaign "Summer Sale Retargeting" is achieving 4.2x ROAS, significantly above the 2.5x target. AI recommends increasing daily budget from $50 to $85.',
    JSON.stringify({ platform: 'meta', campaign: 'Summer Sale Retargeting', current_budget: 50, proposed_budget: 85, current_roas: 4.2, target_roas: 2.5, recommendation: 'Scale winning campaign while ROAS remains strong' }),
    0.95, 'urgent', '-1 hours', wsId);

  insertApproval.run('content', 'publish_blog',
    'Product Guide: "The Complete Guide to Sustainable Fashion in 2026"',
    'Long-form SEO content piece targeting high-volume keyword cluster. 3,200 words with product callouts and internal links.',
    JSON.stringify({ type: 'guide', headline: 'The Complete Guide to Sustainable Fashion in 2026', word_count: 3200, seo_score: 88, target_keyword: 'sustainable fashion 2026', estimated_traffic: '2.4K monthly', preview: 'Sustainable fashion is no longer a niche — it is the new standard. In this comprehensive guide, we break down everything you need to know...' }),
    0.85, 'medium', '-12 hours', wsId);

  insertApproval.run('reviews', 'respond_review',
    'Auto-Responses for 4 New Google Reviews',
    'AI drafted personalized responses for 4 new Google reviews (3 positive, 1 neutral). Each response references specific details from the review.',
    JSON.stringify({ reviews: 4, positive: 3, neutral: 1, negative: 0, platform: 'google', responses_drafted: 4, avg_response_length: 85 }),
    0.72, 'low', '-16 hours', wsId);

  // --- Action Log (25 entries across 3 days) ---
  const insertAction = db.prepare(`
    INSERT INTO ae_action_log (module_id, action_type, mode, description, status, duration_ms, created_at, completed_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?, '+' || ? || ' seconds'), ?)
  `);

  const actions = [
    ['email-sms', 'send_campaign', 'autopilot', 'Sent weekly newsletter "This Week in E-commerce" to 4,218 subscribers', 'completed', 3200, '-1 hours', '-1 hours', '3'],
    ['ads', 'adjust_budget', 'autopilot', 'Decreased TikTok Ads budget by 15% for underperforming "Brand Awareness Q1" campaign', 'completed', 1100, '-2 hours', '-2 hours', '1'],
    ['reviews', 'respond_review', 'autopilot', 'Auto-responded to 5-star Google review from "Sarah M." thanking for fast shipping', 'completed', 890, '-3 hours', '-3 hours', '1'],
    ['content', 'generate_content', 'copilot', 'Generated 3 social media captions for new product launch', 'completed', 2400, '-4 hours', '-4 hours', '2'],
    ['social', 'schedule_post', 'copilot', 'Scheduled LinkedIn article "5 Trends Shaping E-commerce in 2026" for Thursday 9am', 'completed', 1500, '-5 hours', '-5 hours', '2'],
    ['seo', 'optimize_keywords', 'copilot', 'Updated meta descriptions for 8 blog posts targeting "sustainable fashion" cluster', 'completed', 4200, '-7 hours', '-7 hours', '4'],
    ['ads', 'create_ad_copy', 'autopilot', 'Generated 5 ad variants for Meta "Spring Collection" campaign', 'completed', 3100, '-8 hours', '-8 hours', '3'],
    ['email-sms', 'send_campaign', 'autopilot', 'Sent abandoned cart recovery email to 342 users', 'completed', 2800, '-10 hours', '-10 hours', '3'],
    ['reviews', 'respond_review', 'autopilot', 'Auto-responded to 3-star review from "James K." about delivery delay', 'completed', 1200, '-11 hours', '-11 hours', '1'],
    ['content', 'publish_blog', 'copilot', 'Published blog post "How to Build a Brand on Instagram in 2026"', 'completed', 1800, '-14 hours', '-14 hours', '2'],
    ['ads', 'adjust_budget', 'autopilot', 'Paused Google Ads campaign "Holiday Clearance" — budget depleted', 'completed', 600, '-18 hours', '-18 hours', '1'],
    ['social', 'schedule_post', 'copilot', 'Scheduled Twitter thread: "Our sustainability journey — a thread 🧵"', 'completed', 1100, '-20 hours', '-20 hours', '1'],
    ['email-sms', 'generate_content', 'autopilot', 'Failed to generate welcome email — template not found', 'failed', 450, '-22 hours', '-22 hours', '0'],
    ['seo', 'generate_report', 'copilot', 'Generated weekly SEO performance report for Feb 17-23', 'completed', 5200, '-1 days', '-1 days', '5'],
    ['reviews', 'respond_review', 'autopilot', 'Auto-responded to 4 new Trustpilot reviews (all positive)', 'completed', 2100, '-1 days', '-1 days', '2'],
    ['ads', 'create_ad_copy', 'autopilot', 'Generated retargeting ad copy for cart abandoners — 3 variants', 'completed', 2900, '-1 days', '-1 days', '3'],
    ['content', 'generate_content', 'copilot', 'Generated email newsletter draft "Monthly Recap: February Highlights"', 'completed', 3400, '-1 days', '-1 days', '3'],
    ['email-sms', 'send_campaign', 'autopilot', 'Sent promotional email "Flash Sale: 24 Hours Only" to 6,521 subscribers', 'completed', 4100, '-2 days', '-2 days', '4'],
    ['social', 'schedule_post', 'copilot', 'Auto-published Instagram story: Behind-the-scenes at the warehouse', 'completed', 800, '-2 days', '-2 days', '1'],
    ['ads', 'adjust_budget', 'autopilot', 'Increased Google Ads budget by 30% for "Spring Keywords" campaign — CTR above threshold', 'completed', 900, '-2 days', '-2 days', '1'],
    ['seo', 'update_meta', 'copilot', 'Failed to update meta tags — API rate limit exceeded', 'failed', 320, '-2 days', '-2 days', '0'],
    ['reviews', 'respond_review', 'autopilot', 'Auto-responded to 1-star review — flagged for manual review due to complaint severity', 'cancelled', 400, '-2 days', '-2 days', '0'],
    ['content', 'publish_blog', 'copilot', 'Published product comparison: "Top 5 Eco-Friendly Alternatives"', 'completed', 2200, '-2 days', '-2 days', '2'],
    ['email-sms', 'send_campaign', 'autopilot', 'Sent welcome sequence email #2 to 189 new subscribers', 'completed', 1600, '-3 days', '-3 days', '2'],
    ['ads', 'generate_report', 'autopilot', 'Generated weekly ad performance report across all platforms', 'completed', 6100, '-3 days', '-3 days', '6'],
  ];

  for (const a of actions) {
    insertAction.run(...a, wsId);
  }

  // --- Rules (10 automation rules) ---
  const insertRule = db.prepare(`
    INSERT INTO ae_rules (module_id, name, trigger_type, trigger_config, action_type, action_config, requires_approval, status, last_triggered, run_count, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?, datetime('now', '-30 days'), ?)
  `);

  insertRule.run('content', 'Weekly Blog Post Generator', 'schedule',
    JSON.stringify({ frequency: 'weekly', day: 'monday', time: '09:00' }),
    'generate_content', JSON.stringify({ type: 'blog', tone: 'professional', wordTarget: 1200 }),
    1, 'active', '-2 days', 8, wsId);

  insertRule.run('social', 'Daily Social Post Scheduler', 'schedule',
    JSON.stringify({ frequency: 'daily', time: '10:00' }),
    'schedule_post', JSON.stringify({ platforms: ['instagram', 'twitter', 'linkedin'] }),
    1, 'active', '-6 hours', 24, wsId);

  insertRule.run('email-sms', 'Weekly Newsletter Send', 'schedule',
    JSON.stringify({ frequency: 'weekly', day: 'wednesday', time: '08:00' }),
    'send_campaign', JSON.stringify({ template: 'weekly_newsletter', segment: 'active_subscribers' }),
    0, 'active', '-4 days', 12, wsId);

  insertRule.run('reports', 'Monthly Performance Report', 'schedule',
    JSON.stringify({ frequency: 'monthly', day: 1, time: '07:00' }),
    'generate_report', JSON.stringify({ report_type: 'monthly_summary', include: ['revenue', 'traffic', 'conversions', 'engagement'] }),
    1, 'active', '-25 days', 3, wsId);

  insertRule.run('seo', 'Bi-weekly SEO Audit', 'schedule',
    JSON.stringify({ frequency: 'biweekly', day: 'friday', time: '14:00' }),
    'generate_report', JSON.stringify({ report_type: 'seo_audit', check: ['meta_tags', 'broken_links', 'page_speed', 'keyword_rankings'] }),
    1, 'active', '-10 days', 6, wsId);

  insertRule.run('reviews', 'Review Auto-Response', 'event',
    JSON.stringify({ event: 'new_review', platforms: ['google', 'trustpilot'], min_rating: 3 }),
    'respond_review', JSON.stringify({ tone: 'grateful', include_name: true, max_length: 100 }),
    0, 'active', '-3 hours', 47, wsId);

  insertRule.run('email-sms', 'New Subscriber Welcome', 'event',
    JSON.stringify({ event: 'new_subscriber', source: 'any' }),
    'send_campaign', JSON.stringify({ template: 'welcome_sequence', delay: '0m' }),
    0, 'active', '-1 days', 189, wsId);

  insertRule.run('content', 'Content Republish on Milestone', 'event',
    JSON.stringify({ event: 'content_milestone', metric: 'views', threshold: 1000 }),
    'schedule_post', JSON.stringify({ action: 'reshare_to_social', platforms: ['twitter', 'linkedin'] }),
    1, 'inactive', '-15 days', 5, wsId);

  insertRule.run('ads', 'Budget Adjustment on ROAS', 'threshold',
    JSON.stringify({ metric: 'roas', operator: '>', value: 3.5, window: '7d' }),
    'adjust_budget', JSON.stringify({ action: 'increase', percentage: 20, max_daily: 200 }),
    0, 'active', '-2 days', 11, wsId);

  insertRule.run('ads', 'Alert on Engagement Drop', 'threshold',
    JSON.stringify({ metric: 'ctr', operator: '<', value: 1.0, window: '3d' }),
    'generate_report', JSON.stringify({ action: 'alert_and_report', notify: true }),
    1, 'inactive', '-7 days', 3, wsId);

  // --- Notifications (15 demo notifications) ---
  const insertNotif = db.prepare(`
    INSERT INTO ae_notifications (type, title, message, module_id, read, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?), ?)
  `);

  insertNotif.run('action_completed', 'Newsletter sent successfully', 'Weekly newsletter "This Week in E-commerce" sent to 4,218 subscribers', 'email-sms', 0, '-1 hours', wsId);
  insertNotif.run('suggestion_ready', 'New blog post ready for review', 'AI generated: "7 Email Subject Line Formulas That Double Open Rates"', 'content', 0, '-2 hours', wsId);
  insertNotif.run('action_completed', 'Ad budget adjusted', 'Decreased TikTok Ads budget by 15% for underperforming campaign', 'ads', 0, '-2 hours', wsId);
  insertNotif.run('suggestion_ready', 'Instagram carousel ready', 'Spring Collection Launch carousel scheduled for review', 'social', 0, '-4 hours', wsId);
  insertNotif.run('action_completed', 'Review response sent', 'Auto-responded to 5-star Google review from "Sarah M."', 'reviews', 0, '-3 hours', wsId);
  insertNotif.run('rule_triggered', 'Daily Social Post rule fired', 'Daily Social Post Scheduler generated new content', 'social', 1, '-6 hours', wsId);
  insertNotif.run('suggestion_ready', 'SEO overhaul proposed', '12 product pages identified for meta tag improvements', 'seo', 1, '-6 hours', wsId);
  insertNotif.run('action_completed', 'Abandoned cart emails sent', 'Recovery email sent to 342 users with cart items', 'email-sms', 1, '-10 hours', wsId);
  insertNotif.run('action_failed', 'Welcome email generation failed', 'Template not found for welcome email generation', 'email-sms', 1, '-22 hours', wsId);
  insertNotif.run('rule_triggered', 'Review Auto-Response triggered', 'New Google review detected — auto-response generated', 'reviews', 1, '-11 hours', wsId);
  insertNotif.run('action_completed', 'SEO report generated', 'Weekly SEO performance report for Feb 17-23 ready', 'seo', 1, '-1 days', wsId);
  insertNotif.run('suggestion_ready', 'Re-engagement campaign ready', '"We Miss You" email targeting 1,247 inactive subscribers', 'email-sms', 1, '-8 hours', wsId);
  insertNotif.run('action_completed', 'Flash sale email sent', 'Promotional email sent to 6,521 subscribers', 'email-sms', 1, '-2 days', wsId);
  insertNotif.run('rule_triggered', 'ROAS threshold exceeded', 'Budget Adjustment rule triggered for Meta Ads campaign', 'ads', 1, '-2 days', wsId);
  insertNotif.run('action_completed', 'Ad report generated', 'Weekly ad performance report across all platforms complete', 'ads', 1, '-3 days', wsId);
}

module.exports = { initDatabase, AUTOMATABLE_MODULES, createNotification };
