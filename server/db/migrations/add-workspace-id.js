const { db, getDefaultWorkspaceId } = require('../database');

// All module tables that need workspace_id
const TABLES = [
  // Shared
  'products', 'activity_log',
  // A/B Testing
  'abt_tests', 'abt_variants',
  // Affiliates
  'af_programs', 'af_affiliates', 'af_payouts',
  // Analytics
  'an_snapshots',
  // API Manager
  'api_keys', 'api_logs',
  // Audience Builder
  'ab_audiences', 'ab_segments',
  // Automation Engine
  'ae_module_modes', 'ae_approval_queue', 'ae_action_log', 'ae_rules', 'ae_notifications', 'ae_settings',
  // Autopilot
  'ap_config', 'ap_actions', 'ap_insights',
  // Brand Profile
  'bp_profiles', 'bp_media',
  // Brand Strategy
  'bs_brands', 'bs_guidelines', 'bs_personas',
  // Budget Optimizer
  'bo_budgets', 'bo_allocations',
  // Calendar
  'mc_events', 'mc_campaigns',
  // Chatbot
  'cb_bots', 'cb_flows', 'cb_conversations',
  // Client Manager
  'cm_clients', 'cm_projects',
  // Competitors
  'ci_competitors', 'ci_reports', 'ci_alerts',
  // Content Creation
  'cc_projects',
  // Creative Design
  'cd_projects', 'cd_images',
  // CRM
  'crm_contacts', 'crm_deals', 'crm_activities',
  // Customer Intelligence
  'ci_segments', 'ci_insights',
  // Ecommerce Hub
  'eh_stores', 'eh_orders', 'eh_products',
  // Email & SMS
  'es_campaigns', 'es_templates', 'es_contacts',
  // Funnels
  'fn_funnels', 'fn_pages', 'fn_conversions',
  // Goal Tracker
  'gt_goals', 'gt_milestones',
  // Influencers
  'inf_influencers', 'inf_campaigns', 'inf_outreach',
  // Integrations
  'int_connections', 'int_sync_logs', 'int_oauth_states',
  // Knowledge Base
  'kb_articles', 'kb_categories',
  // Onboarding
  'onboarding_state',
  // Paid Advertising
  'pa_campaigns',
  // PR & Press
  'pp_releases', 'pp_contacts',
  // Product Feeds
  'pf_feeds', 'pf_products', 'pf_rules',
  // Referral & Loyalty
  'rl_programs', 'rl_members',
  // Reports
  'cr_reports', 'cr_templates', 'cr_schedules',
  // Reviews
  'rv_reviews', 'rv_responses', 'rv_sources',
  // Scheduler
  'sc_scheduled_tasks', 'sc_task_logs',
  // SEO
  'seo_projects', 'seo_keywords', 'seo_audits',
  // Social Media
  'sm_posts', 'sm_accounts', 'sm_calendar',
  // Support Center
  'sc_tickets', 'sc_templates',
  // Team
  'tm_members', 'tm_invites',
  // The Advisor
  'adv_briefings', 'adv_actions',
  // Video Marketing
  'vm_campaigns', 'vm_generations', 'vm_favorites', 'vm_video_jobs',
  // Webhooks
  'wh_webhooks', 'wh_webhook_logs',
  // Website Builder
  'wb_sites', 'wb_pages',
  // Workflow Builder
  'wf_workflows', 'wf_steps', 'wf_runs',
];

function hasColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

function tableExists(table) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
}

function runMigration() {
  const defaultWsId = getDefaultWorkspaceId();

  let migrated = 0;
  for (const table of TABLES) {
    if (!tableExists(table)) continue;
    if (hasColumn(table, 'workspace_id')) continue;

    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN workspace_id TEXT`);
      if (defaultWsId) {
        db.prepare(`UPDATE ${table} SET workspace_id = ? WHERE workspace_id IS NULL`).run(defaultWsId);
      }
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_ws ON ${table}(workspace_id)`);
      migrated++;
    } catch (err) {
      console.error(`  Migration warning for ${table}:`, err.message);
    }
  }

  // Fix int_connections: remove old UNIQUE(provider_id), make it UNIQUE(workspace_id, provider_id)
  fixIntConnections();

  // Fix ae_settings: make key workspace-scoped
  fixAeSettings();

  if (migrated > 0) {
    console.log(`  Workspace migration: added workspace_id to ${migrated} table(s)`);
  }
}

function fixIntConnections() {
  if (!tableExists('int_connections')) return;
  // Check if the unique index already includes workspace_id
  const indices = db.prepare("PRAGMA index_list(int_connections)").all();
  const hasWsUnique = indices.some(idx => {
    const cols = db.prepare(`PRAGMA index_info(${idx.name})`).all();
    return cols.some(c => c.name === 'workspace_id') && cols.some(c => c.name === 'provider_id');
  });
  if (hasWsUnique) return;

  try {
    // Drop the old unique index on provider_id if it exists
    for (const idx of indices) {
      if (idx.unique) {
        const cols = db.prepare(`PRAGMA index_info(${idx.name})`).all();
        if (cols.length === 1 && cols[0].name === 'provider_id') {
          db.exec(`DROP INDEX IF EXISTS ${idx.name}`);
        }
      }
    }
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_int_conn_ws_provider ON int_connections(workspace_id, provider_id)');
  } catch (err) {
    console.error('  Migration warning for int_connections unique index:', err.message);
  }
}

function fixAeSettings() {
  if (!tableExists('ae_settings')) return;
  // ae_settings uses key as PRIMARY KEY. We need workspace-scoped keys.
  // Since SQLite can't change PKs, we'll create a unique index instead.
  const indices = db.prepare("PRAGMA index_list(ae_settings)").all();
  const hasWsKey = indices.some(idx => {
    const cols = db.prepare(`PRAGMA index_info(${idx.name})`).all();
    return cols.some(c => c.name === 'workspace_id') && cols.some(c => c.name === 'key');
  });
  if (hasWsKey) return;

  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_ae_settings_ws_key ON ae_settings(workspace_id, key)');
  } catch (err) {
    console.error('  Migration warning for ae_settings unique index:', err.message);
  }
}

module.exports = { runMigration };
