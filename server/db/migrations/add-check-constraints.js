/**
 * Migration: Application-Level CHECK Constraints
 *
 * SQLite does not support adding CHECK constraints to existing tables via ALTER TABLE.
 * Instead, this migration documents the intended constraints and points to the
 * `server/middleware/validateStatus.js` module, which provides runtime validation.
 *
 * This file serves as the migration record and can optionally be called at startup
 * to log a reminder about which tables have status/enum fields that should be
 * validated at the application level.
 *
 * Existing CHECK constraints (already enforced at the schema level):
 *   - af_programs.status        IN ('active', 'paused', 'closed')
 *   - af_affiliates.status      IN ('active', 'inactive', 'pending', 'suspended')
 *   - af_payouts.status         IN ('pending', 'paid')
 *   - af_programs.commission_type IN ('percentage', 'flat')
 *   - cr_reports.status         IN ('draft', 'published')
 *   - cr_schedules.frequency    IN ('weekly', 'monthly', 'quarterly')
 *   - pf_feeds.format           IN ('csv', 'xml', 'json')
 *   - pf_rules.rule_type        IN ('replace', 'prefix', 'suffix', 'remove')
 *   - vm_campaigns.stage        IN ('angles', 'scripts', 'hooks', 'storyboard', 'ugc', 'iteration')
 *
 * Tables with status fields that lack CHECK constraints (validated by middleware):
 *   - abt_tests, ap_config, ap_actions, ap_insights, ae_approval_queue, ae_rules,
 *     bo_budgets, bo_allocations, mc_events, cb_bots, cm_clients, cm_projects,
 *     es_campaigns, fn_funnels, gt_goals, inf_campaigns, inf_outreach,
 *     int_connections, kb_articles, pa_campaigns, pp_releases, rl_programs,
 *     rv_reviews, sc_scheduled_tasks, sm_posts, sm_calendar, sc_tickets,
 *     tm_members, tm_invites, wb_sites, wh_webhooks, wf_workflows, wf_runs
 *
 * See: server/middleware/validateStatus.js for the STATUS_MAPS and validator functions.
 */

const { STATUS_MAPS } = require('../../middleware/validateStatus');

/**
 * Run this migration to log which tables have application-level status validation.
 * This is purely informational and does not modify the database schema.
 */
function runMigration() {
  const tableCount = Object.keys(STATUS_MAPS).length;
  console.log(
    `  Check constraints migration: ${tableCount} status/enum field(s) registered for application-level validation`
  );
}

module.exports = { runMigration };
