const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');

const VALID_RECIPE_ID = /^[a-z0-9-]+$/;

const RECIPES = [
  {
    id: 'blog-social-blast',
    name: 'Blog → Social Blast',
    description: 'When a new blog post is published, automatically generate 5 social media posts and queue them for approval.',
    category: 'Content & Social',
    icon: '📝',
    modules: ['content', 'social'],
    trigger: { type: 'event', config: { event: 'content_published', content_type: 'blog' } },
    action: { type: 'schedule_post', config: { format: 'social_posts', count: 5, platforms: ['instagram', 'twitter', 'linkedin'] } },
    requires_approval: true,
    difficulty: 'starter',
    saves: '3 hrs/week',
    installs: 2847,
  },
  {
    id: 'weekly-content-calendar',
    name: 'Weekly Content Calendar',
    description: 'Every Monday morning, generate a full content plan for the week based on your top SEO keywords and trends.',
    category: 'Content & Social',
    icon: '🗓️',
    modules: ['content', 'seo'],
    trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'monday', time: '08:00' } },
    action: { type: 'generate_content', config: { type: 'content_calendar', days: 7 } },
    requires_approval: true,
    difficulty: 'starter',
    saves: '2 hrs/week',
    installs: 1923,
  },
  {
    id: 'daily-content-brief',
    name: 'Daily Content Brief',
    description: 'Every morning, generate a content brief with fresh topic ideas and angles to keep your content team inspired.',
    category: 'Content & Social',
    icon: '✨',
    modules: ['content'],
    trigger: { type: 'schedule', config: { frequency: 'daily', time: '07:30' } },
    action: { type: 'generate_content', config: { type: 'content_brief', topics: 3 } },
    requires_approval: false,
    difficulty: 'starter',
    saves: '1 hr/day',
    installs: 1455,
  },
  {
    id: 'auto-review-responder',
    name: 'Auto Review Responder',
    description: 'When a positive review arrives (4+ stars), generate a warm personalized thank-you response and queue for approval.',
    category: 'Reviews & CRM',
    icon: '⭐',
    modules: ['reviews'],
    trigger: { type: 'event', config: { event: 'new_review', condition: 'rating >= 4' } },
    action: { type: 'respond_review', config: { tone: 'grateful', personalized: true } },
    requires_approval: true,
    difficulty: 'starter',
    saves: '4 hrs/week',
    installs: 3241,
  },
  {
    id: 'low-rating-escalation',
    name: 'Low Rating Alert & Response',
    description: 'When a review below 3 stars arrives, immediately draft an empathetic response and escalate to your support team.',
    category: 'Reviews & CRM',
    icon: '🚨',
    modules: ['reviews', 'customer-ai'],
    trigger: { type: 'event', config: { event: 'new_review', condition: 'rating < 3' } },
    action: { type: 'respond_review', config: { tone: 'empathetic', escalate: true, priority: 'high' } },
    requires_approval: true,
    difficulty: 'starter',
    saves: '2 hrs/week',
    installs: 2104,
  },
  {
    id: 'new-lead-welcome',
    name: 'New Lead Welcome Sequence',
    description: 'When a new contact is added to CRM, generate a personalized welcome email and queue it for sending within the hour.',
    category: 'Reviews & CRM',
    icon: '🤝',
    modules: ['crm', 'email-sms'],
    trigger: { type: 'event', config: { event: 'new_contact', source: 'crm' } },
    action: { type: 'send_campaign', config: { type: 'welcome_email', personalized: true } },
    requires_approval: true,
    difficulty: 'intermediate',
    saves: '3 hrs/week',
    installs: 1876,
  },
  {
    id: 'seo-content-briefs',
    name: 'Weekly SEO Content Briefs',
    description: 'Every week, generate detailed content briefs for your top keyword opportunities and save them to your content module.',
    category: 'SEO',
    icon: '🔍',
    modules: ['seo', 'content'],
    trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'tuesday', time: '09:00' } },
    action: { type: 'generate_content', config: { type: 'seo_brief', keywords: 5 } },
    requires_approval: false,
    difficulty: 'intermediate',
    saves: '4 hrs/week',
    installs: 1632,
  },
  {
    id: 'monthly-meta-audit',
    name: 'Monthly Meta Tag Audit',
    description: 'On the first of each month, audit all your page meta tags and generate a prioritized list of improvements.',
    category: 'SEO',
    icon: '🏷️',
    modules: ['seo'],
    trigger: { type: 'schedule', config: { frequency: 'monthly', day: '1', time: '08:00' } },
    action: { type: 'update_meta', config: { scope: 'all_pages', generate_recommendations: true } },
    requires_approval: true,
    difficulty: 'intermediate',
    saves: '3 hrs/month',
    installs: 987,
  },
  {
    id: 'competitor-keyword-gap',
    name: 'Competitor Keyword Gap Report',
    description: 'Weekly analysis of keyword gaps between you and your top competitors with specific content suggestions to close them.',
    category: 'SEO',
    icon: '🎯',
    modules: ['seo'],
    trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'wednesday', time: '10:00' } },
    action: { type: 'optimize_keywords', config: { type: 'gap_analysis', generate_report: true } },
    requires_approval: false,
    difficulty: 'advanced',
    saves: '5 hrs/week',
    installs: 743,
  },
  {
    id: 'roas-guardian',
    name: 'ROAS Guardian',
    description: 'When your ROAS drops below 2.0, automatically flag low-performing ads and generate a budget reallocation plan.',
    category: 'Ads & Budget',
    icon: '🛡️',
    modules: ['ads', 'budget-optimizer'],
    trigger: { type: 'threshold', config: { metric: 'roas', operator: '<', value: 2.0 } },
    action: { type: 'adjust_budget', config: { action: 'reallocate', protect_top_performers: true } },
    requires_approval: true,
    difficulty: 'advanced',
    saves: '10 hrs/month',
    installs: 1289,
  },
  {
    id: 'weekly-budget-rebalancer',
    name: 'Weekly Budget Rebalancer',
    description: 'Every Friday, analyze your ad spend efficiency across all channels and generate a smart budget reallocation suggestion.',
    category: 'Ads & Budget',
    icon: '⚖️',
    modules: ['budget-optimizer', 'ads'],
    trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'friday', time: '16:00' } },
    action: { type: 'adjust_budget', config: { type: 'rebalance', analysis_window: '7_days' } },
    requires_approval: true,
    difficulty: 'intermediate',
    saves: '3 hrs/week',
    installs: 1104,
  },
  {
    id: 'ad-performance-report',
    name: 'Weekly Ad Performance Report',
    description: "Every Friday, generate a comprehensive ad performance report with insights and next week's recommendations.",
    category: 'Ads & Budget',
    icon: '📊',
    modules: ['ads'],
    trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'friday', time: '17:00' } },
    action: { type: 'generate_report', config: { type: 'ad_performance', period: '7_days' } },
    requires_approval: false,
    difficulty: 'starter',
    saves: '2 hrs/week',
    installs: 2156,
  },
  {
    id: 'reengagement-campaign',
    name: 'Re-engagement Campaign',
    description: 'When a subscriber goes 30 days without engagement, automatically trigger a personalized re-engagement email sequence.',
    category: 'Email',
    icon: '💌',
    modules: ['email-sms'],
    trigger: { type: 'event', config: { event: 'subscriber_inactive', days: 30 } },
    action: { type: 'send_campaign', config: { type: 'reengagement', sequence_length: 3 } },
    requires_approval: false,
    difficulty: 'intermediate',
    saves: '4 hrs/week',
    installs: 1897,
  },
  {
    id: 'monthly-newsletter',
    name: 'Monthly Newsletter Generator',
    description: 'On the 1st of each month, generate a full newsletter draft using your best content from the past month.',
    category: 'Email',
    icon: '📧',
    modules: ['email-sms', 'content'],
    trigger: { type: 'schedule', config: { frequency: 'monthly', day: '1', time: '09:00' } },
    action: { type: 'send_campaign', config: { type: 'newsletter', include_top_content: true } },
    requires_approval: true,
    difficulty: 'starter',
    saves: '4 hrs/month',
    installs: 2543,
  },
  {
    id: 'weekly-performance-report',
    name: 'Weekly Performance Report',
    description: 'Every Monday, generate a cross-module performance summary with highlights, concerns, and your top 3 priorities for the week.',
    category: 'Reports',
    icon: '📈',
    modules: ['reports'],
    trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'monday', time: '08:00' } },
    action: { type: 'generate_report', config: { type: 'cross_module_summary', modules: 'all' } },
    requires_approval: false,
    difficulty: 'starter',
    saves: '2 hrs/week',
    installs: 3012,
  },
  {
    id: 'goal-progress-update',
    name: 'Friday Goal Progress Update',
    description: 'Every Friday afternoon, check your goal tracker and generate a progress update highlighting wins and at-risk goals.',
    category: 'Reports',
    icon: '🏆',
    modules: ['goal-tracker'],
    trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'friday', time: '15:00' } },
    action: { type: 'generate_report', config: { type: 'goal_progress', highlight_risks: true } },
    requires_approval: false,
    difficulty: 'starter',
    saves: '1 hr/week',
    installs: 1678,
  },
  {
    id: 'kb-gap-filler',
    name: 'Knowledge Base Gap Filler',
    description: 'Monthly, automatically detect gaps in your knowledge base and generate draft articles for the most critical missing topics.',
    category: 'Knowledge Base',
    icon: '📚',
    modules: ['knowledge-base'],
    trigger: { type: 'schedule', config: { frequency: 'monthly', day: '15', time: '10:00' } },
    action: { type: 'generate_content', config: { type: 'kb_articles', count: 3, priority: 'gaps' } },
    requires_approval: true,
    difficulty: 'intermediate',
    saves: '5 hrs/month',
    installs: 892,
  },
  {
    id: 'ticket-to-faq',
    name: 'Support Ticket → FAQ Article',
    description: 'When a support ticket is resolved, automatically suggest a FAQ article to prevent future tickets on the same topic.',
    category: 'Knowledge Base',
    icon: '💡',
    modules: ['customer-ai', 'knowledge-base'],
    trigger: { type: 'event', config: { event: 'ticket_closed', auto_suggest_kb: true } },
    action: { type: 'generate_content', config: { type: 'faq_article', based_on: 'ticket' } },
    requires_approval: true,
    difficulty: 'intermediate',
    saves: '3 hrs/week',
    installs: 1134,
  },
  {
    id: 'influencer-outreach',
    name: 'Influencer Outreach Sequence',
    description: 'When a new influencer campaign starts, generate personalized outreach emails for each influencer and queue for review.',
    category: 'Growth',
    icon: '🌟',
    modules: ['influencers'],
    trigger: { type: 'event', config: { event: 'campaign_created', type: 'influencer' } },
    action: { type: 'generate_content', config: { type: 'outreach_emails', personalized: true } },
    requires_approval: true,
    difficulty: 'intermediate',
    saves: '6 hrs/campaign',
    installs: 765,
  },
  {
    id: 'affiliate-monthly-report',
    name: 'Monthly Affiliate Report',
    description: 'On the last day of each month, generate a complete affiliate performance report with top performers and outstanding payouts.',
    category: 'Growth',
    icon: '🤑',
    modules: ['affiliates'],
    trigger: { type: 'schedule', config: { frequency: 'monthly', day: 'last', time: '10:00' } },
    action: { type: 'generate_report', config: { type: 'affiliate_performance', include_payouts: true } },
    requires_approval: false,
    difficulty: 'starter',
    saves: '3 hrs/month',
    installs: 634,
  },
];

// GET /marketplace/recipes — list all recipes with install status
router.get('/recipes', (req, res) => {
  const wsId = req.workspace.id;
  const { category, search } = req.query;

  let installedIds = new Set();
  try {
    const installed = db.prepare(
      "SELECT trigger_config FROM ae_rules WHERE workspace_id = ? AND trigger_config LIKE '%marketplace_recipe_id%'"
    ).all(wsId);
    for (const row of installed) {
      try {
        const cfg = typeof row.trigger_config === 'string' ? JSON.parse(row.trigger_config) : row.trigger_config;
        if (cfg?.marketplace_recipe_id) installedIds.add(cfg.marketplace_recipe_id);
      } catch {}
    }
  } catch {}

  let results = RECIPES;
  if (category && category !== 'All') {
    results = results.filter(r => r.category === category);
  }
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(r =>
      r.name.toLowerCase().includes(s) ||
      r.description.toLowerCase().includes(s) ||
      r.category.toLowerCase().includes(s)
    );
  }

  res.json(results.map(r => ({ ...r, installed: installedIds.has(r.id) })));
});

// POST /marketplace/install/:recipeId — install a recipe as an automation rule
router.post('/install/:recipeId', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { recipeId } = req.params;

    if (!VALID_RECIPE_ID.test(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    try {
      const existing = db.prepare(
        "SELECT id FROM ae_rules WHERE workspace_id = ? AND trigger_config LIKE ?"
      ).get(wsId, `%"marketplace_recipe_id":"${recipeId}"%`);
      if (existing) return res.status(409).json({ error: 'Recipe already installed' });
    } catch {}

    const triggerConfig = JSON.stringify({ ...recipe.trigger.config, marketplace_recipe_id: recipe.id });
    const actionConfig = JSON.stringify(recipe.action.config);

    const result = db.prepare(
      `INSERT INTO ae_rules (workspace_id, module_id, name, trigger_type, trigger_config, action_type, action_config, requires_approval, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    ).run(wsId, recipe.modules[0], recipe.name, recipe.trigger.type, triggerConfig, recipe.action.type, actionConfig, recipe.requires_approval ? 1 : 0);

    try { logActivity('automation-engine', 'install_recipe', `Installed recipe: ${recipe.name}`, recipe.name, result.lastInsertRowid, wsId); } catch {}

    res.json({ success: true, rule_id: result.lastInsertRowid });
  } catch (err) {
    console.error('[marketplace] install error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /marketplace/uninstall/:recipeId — uninstall (delete the created rule)
router.delete('/uninstall/:recipeId', (req, res) => {
  const wsId = req.workspace.id;
  const { recipeId } = req.params;

  if (!VALID_RECIPE_ID.test(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

  db.prepare(
    "DELETE FROM ae_rules WHERE workspace_id = ? AND trigger_config LIKE ?"
  ).run(wsId, `%"marketplace_recipe_id":"${recipeId}"%`);

  logActivity('automation-engine', 'uninstall_recipe', `Uninstalled recipe: ${recipeId}`, null, null, wsId);
  res.json({ success: true });
});

module.exports = router;
