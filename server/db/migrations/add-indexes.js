const { db } = require('../database');

/**
 * Migration: Add missing database indexes
 *
 * Adds indexes on:
 * - All workspace_id columns (nearly every table)
 * - email in users
 * - user_id in refresh_tokens
 * - status columns on heavily-queried tables
 * - All foreign key columns
 *
 * All statements use IF NOT EXISTS so they are idempotent.
 */
function runMigration() {
  const statements = [
    // ========================
    // Auth tables (server/services/auth.js)
    // ========================
    // users — email is already UNIQUE (implicit index), but add explicit index for lookups
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    // refresh_tokens — user_id FK
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
    // refresh_tokens — expires_at for cleanup queries
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)',

    // ========================
    // Shared tables (server/db/database.js)
    // ========================
    // products
    'CREATE INDEX IF NOT EXISTS idx_products_workspace_id ON products(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_source_module ON products(source_module)',
    // activity_log
    'CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_activity_log_module_id ON activity_log(module_id)',
    'CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)',
    // workspaces — owner_id FK
    'CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id)',
    // workspace_members — user_id FK, workspace_id FK
    'CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id)',

    // ========================
    // A/B Testing
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_abt_tests_workspace_id ON abt_tests(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_abt_tests_status ON abt_tests(status)',
    'CREATE INDEX IF NOT EXISTS idx_abt_variants_workspace_id ON abt_variants(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_abt_variants_test_id ON abt_variants(test_id)',

    // ========================
    // Affiliates
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_af_programs_workspace_id ON af_programs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_af_programs_status ON af_programs(status)',
    'CREATE INDEX IF NOT EXISTS idx_af_affiliates_workspace_id ON af_affiliates(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_af_affiliates_program_id ON af_affiliates(program_id)',
    'CREATE INDEX IF NOT EXISTS idx_af_affiliates_status ON af_affiliates(status)',
    'CREATE INDEX IF NOT EXISTS idx_af_payouts_workspace_id ON af_payouts(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_af_payouts_affiliate_id ON af_payouts(affiliate_id)',
    'CREATE INDEX IF NOT EXISTS idx_af_payouts_status ON af_payouts(status)',

    // ========================
    // Analytics
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_an_snapshots_workspace_id ON an_snapshots(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_an_snapshots_module_id ON an_snapshots(module_id)',

    // ========================
    // API Manager
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status)',
    'CREATE INDEX IF NOT EXISTS idx_api_logs_workspace_id ON api_logs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_api_logs_key_id ON api_logs(key_id)',

    // ========================
    // Audience Builder
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_ab_audiences_workspace_id ON ab_audiences(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ab_audiences_status ON ab_audiences(status)',
    'CREATE INDEX IF NOT EXISTS idx_ab_segments_workspace_id ON ab_segments(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ab_segments_audience_id ON ab_segments(audience_id)',

    // ========================
    // Automation Engine
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_ae_module_modes_workspace_id ON ae_module_modes(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_approval_queue_workspace_id ON ae_approval_queue(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_approval_queue_status ON ae_approval_queue(status)',
    'CREATE INDEX IF NOT EXISTS idx_ae_approval_queue_module_id ON ae_approval_queue(module_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_action_log_workspace_id ON ae_action_log(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_action_log_status ON ae_action_log(status)',
    'CREATE INDEX IF NOT EXISTS idx_ae_action_log_module_id ON ae_action_log(module_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_action_log_approval_id ON ae_action_log(approval_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_rules_workspace_id ON ae_rules(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_rules_status ON ae_rules(status)',
    'CREATE INDEX IF NOT EXISTS idx_ae_rules_module_id ON ae_rules(module_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_notifications_workspace_id ON ae_notifications(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ae_notifications_read ON ae_notifications(read)',
    'CREATE INDEX IF NOT EXISTS idx_ae_settings_workspace_id ON ae_settings(workspace_id)',

    // ========================
    // Autopilot
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_ap_config_workspace_id ON ap_config(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ap_config_status ON ap_config(status)',
    'CREATE INDEX IF NOT EXISTS idx_ap_config_brand_id ON ap_config(brand_id)',
    'CREATE INDEX IF NOT EXISTS idx_ap_actions_workspace_id ON ap_actions(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ap_actions_config_id ON ap_actions(config_id)',
    'CREATE INDEX IF NOT EXISTS idx_ap_actions_status ON ap_actions(status)',
    'CREATE INDEX IF NOT EXISTS idx_ap_insights_workspace_id ON ap_insights(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ap_insights_config_id ON ap_insights(config_id)',
    'CREATE INDEX IF NOT EXISTS idx_ap_insights_status ON ap_insights(status)',

    // ========================
    // Brand Profile
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_bp_profiles_workspace_id ON bp_profiles(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_bp_media_workspace_id ON bp_media(workspace_id)',

    // ========================
    // Brand Strategy
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_bs_brands_workspace_id ON bs_brands(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_bs_guidelines_workspace_id ON bs_guidelines(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_bs_guidelines_brand_id ON bs_guidelines(brand_id)',
    'CREATE INDEX IF NOT EXISTS idx_bs_personas_workspace_id ON bs_personas(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_bs_personas_brand_id ON bs_personas(brand_id)',

    // ========================
    // Budget Optimizer
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_bo_budgets_workspace_id ON bo_budgets(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_bo_budgets_status ON bo_budgets(status)',
    'CREATE INDEX IF NOT EXISTS idx_bo_allocations_workspace_id ON bo_allocations(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_bo_allocations_budget_id ON bo_allocations(budget_id)',
    'CREATE INDEX IF NOT EXISTS idx_bo_allocations_status ON bo_allocations(status)',

    // ========================
    // Calendar
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_mc_events_workspace_id ON mc_events(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_mc_events_status ON mc_events(status)',
    'CREATE INDEX IF NOT EXISTS idx_mc_campaigns_workspace_id ON mc_campaigns(workspace_id)',

    // ========================
    // Chatbot
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_cb_bots_workspace_id ON cb_bots(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cb_bots_status ON cb_bots(status)',
    'CREATE INDEX IF NOT EXISTS idx_cb_flows_workspace_id ON cb_flows(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cb_flows_bot_id ON cb_flows(bot_id)',
    'CREATE INDEX IF NOT EXISTS idx_cb_conversations_workspace_id ON cb_conversations(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cb_conversations_bot_id ON cb_conversations(bot_id)',

    // ========================
    // Client Manager
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_cm_clients_workspace_id ON cm_clients(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cm_clients_status ON cm_clients(status)',
    'CREATE INDEX IF NOT EXISTS idx_cm_projects_workspace_id ON cm_projects(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cm_projects_client_id ON cm_projects(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_cm_projects_status ON cm_projects(status)',

    // ========================
    // Competitors
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_ci_competitors_workspace_id ON ci_competitors(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ci_reports_workspace_id ON ci_reports(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ci_reports_competitor_id ON ci_reports(competitor_id)',
    'CREATE INDEX IF NOT EXISTS idx_ci_alerts_workspace_id ON ci_alerts(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ci_alerts_competitor_id ON ci_alerts(competitor_id)',

    // ========================
    // Content Creation
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_cc_projects_workspace_id ON cc_projects(workspace_id)',

    // ========================
    // Creative Design
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_cd_projects_workspace_id ON cd_projects(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cd_images_workspace_id ON cd_images(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cd_images_project_id ON cd_images(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_cd_images_status ON cd_images(status)',

    // ========================
    // CRM
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_crm_contacts_workspace_id ON crm_contacts(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_deals_workspace_id ON crm_deals(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_deals_contact_id ON crm_deals(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_activities_workspace_id ON crm_activities(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_id ON crm_activities(contact_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_activities_deal_id ON crm_activities(deal_id)',

    // ========================
    // Customer Intelligence
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_ci_segments_workspace_id ON ci_segments(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ci_insights_workspace_id ON ci_insights(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_ci_insights_segment_id ON ci_insights(segment_id)',

    // ========================
    // Ecommerce Hub
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_eh_stores_workspace_id ON eh_stores(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_eh_stores_status ON eh_stores(status)',
    'CREATE INDEX IF NOT EXISTS idx_eh_orders_workspace_id ON eh_orders(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_eh_orders_store_id ON eh_orders(store_id)',
    'CREATE INDEX IF NOT EXISTS idx_eh_orders_status ON eh_orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_eh_products_workspace_id ON eh_products(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_eh_products_store_id ON eh_products(store_id)',
    'CREATE INDEX IF NOT EXISTS idx_eh_products_status ON eh_products(status)',

    // ========================
    // Email & SMS
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_es_campaigns_workspace_id ON es_campaigns(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_es_campaigns_status ON es_campaigns(status)',
    'CREATE INDEX IF NOT EXISTS idx_es_templates_workspace_id ON es_templates(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_es_contacts_workspace_id ON es_contacts(workspace_id)',

    // ========================
    // Funnels
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_fn_funnels_workspace_id ON fn_funnels(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_fn_funnels_status ON fn_funnels(status)',
    'CREATE INDEX IF NOT EXISTS idx_fn_pages_workspace_id ON fn_pages(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_fn_pages_funnel_id ON fn_pages(funnel_id)',
    'CREATE INDEX IF NOT EXISTS idx_fn_conversions_workspace_id ON fn_conversions(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_fn_conversions_funnel_id ON fn_conversions(funnel_id)',
    'CREATE INDEX IF NOT EXISTS idx_fn_conversions_page_id ON fn_conversions(page_id)',

    // ========================
    // Goal Tracker
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_gt_goals_workspace_id ON gt_goals(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_gt_goals_status ON gt_goals(status)',
    'CREATE INDEX IF NOT EXISTS idx_gt_milestones_workspace_id ON gt_milestones(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_gt_milestones_goal_id ON gt_milestones(goal_id)',

    // ========================
    // Influencers
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_inf_influencers_workspace_id ON inf_influencers(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_inf_campaigns_workspace_id ON inf_campaigns(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_inf_campaigns_status ON inf_campaigns(status)',
    'CREATE INDEX IF NOT EXISTS idx_inf_outreach_workspace_id ON inf_outreach(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_inf_outreach_influencer_id ON inf_outreach(influencer_id)',
    'CREATE INDEX IF NOT EXISTS idx_inf_outreach_campaign_id ON inf_outreach(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_inf_outreach_status ON inf_outreach(status)',

    // ========================
    // Integrations
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_int_connections_workspace_id ON int_connections(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_int_connections_status ON int_connections(status)',
    'CREATE INDEX IF NOT EXISTS idx_int_sync_logs_workspace_id ON int_sync_logs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_int_sync_logs_connection_id ON int_sync_logs(connection_id)',
    'CREATE INDEX IF NOT EXISTS idx_int_sync_logs_status ON int_sync_logs(status)',
    'CREATE INDEX IF NOT EXISTS idx_int_oauth_states_workspace_id ON int_oauth_states(workspace_id)',

    // ========================
    // Knowledge Base
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_kb_articles_workspace_id ON kb_articles(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status)',
    'CREATE INDEX IF NOT EXISTS idx_kb_categories_workspace_id ON kb_categories(workspace_id)',

    // ========================
    // Onboarding
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_onboarding_state_workspace_id ON onboarding_state(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_onboarding_state_user_id ON onboarding_state(user_id)',

    // ========================
    // Paid Advertising
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_pa_campaigns_workspace_id ON pa_campaigns(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_pa_campaigns_status ON pa_campaigns(status)',

    // ========================
    // PR & Press
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_pp_releases_workspace_id ON pp_releases(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_pp_releases_status ON pp_releases(status)',
    'CREATE INDEX IF NOT EXISTS idx_pp_contacts_workspace_id ON pp_contacts(workspace_id)',

    // ========================
    // Product Feeds
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_pf_feeds_workspace_id ON pf_feeds(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_pf_feeds_status ON pf_feeds(status)',
    'CREATE INDEX IF NOT EXISTS idx_pf_products_workspace_id ON pf_products(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_pf_products_feed_id ON pf_products(feed_id)',
    'CREATE INDEX IF NOT EXISTS idx_pf_rules_workspace_id ON pf_rules(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_pf_rules_feed_id ON pf_rules(feed_id)',

    // ========================
    // Referral & Loyalty
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_rl_programs_workspace_id ON rl_programs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_rl_programs_status ON rl_programs(status)',
    'CREATE INDEX IF NOT EXISTS idx_rl_members_workspace_id ON rl_members(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_rl_members_program_id ON rl_members(program_id)',

    // ========================
    // Reports
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_cr_reports_workspace_id ON cr_reports(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cr_reports_status ON cr_reports(status)',
    'CREATE INDEX IF NOT EXISTS idx_cr_templates_workspace_id ON cr_templates(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cr_schedules_workspace_id ON cr_schedules(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_cr_schedules_report_id ON cr_schedules(report_id)',

    // ========================
    // Reviews
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_rv_reviews_workspace_id ON rv_reviews(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_rv_responses_workspace_id ON rv_responses(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_rv_responses_review_id ON rv_responses(review_id)',
    'CREATE INDEX IF NOT EXISTS idx_rv_responses_status ON rv_responses(status)',
    'CREATE INDEX IF NOT EXISTS idx_rv_sources_workspace_id ON rv_sources(workspace_id)',

    // ========================
    // Scheduler
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_sc_scheduled_tasks_workspace_id ON sc_scheduled_tasks(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_sc_scheduled_tasks_status ON sc_scheduled_tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_sc_task_logs_workspace_id ON sc_task_logs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_sc_task_logs_task_id ON sc_task_logs(task_id)',
    'CREATE INDEX IF NOT EXISTS idx_sc_task_logs_status ON sc_task_logs(status)',

    // ========================
    // SEO
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_seo_projects_workspace_id ON seo_projects(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_seo_keywords_workspace_id ON seo_keywords(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_seo_keywords_project_id ON seo_keywords(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_seo_audits_workspace_id ON seo_audits(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_seo_audits_project_id ON seo_audits(project_id)',

    // ========================
    // Social Media
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_sm_posts_workspace_id ON sm_posts(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_sm_posts_status ON sm_posts(status)',
    'CREATE INDEX IF NOT EXISTS idx_sm_accounts_workspace_id ON sm_accounts(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_sm_calendar_workspace_id ON sm_calendar(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_sm_calendar_post_id ON sm_calendar(post_id)',
    'CREATE INDEX IF NOT EXISTS idx_sm_calendar_status ON sm_calendar(status)',

    // ========================
    // Support Center
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_sc_tickets_workspace_id ON sc_tickets(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_sc_tickets_status ON sc_tickets(status)',
    'CREATE INDEX IF NOT EXISTS idx_sc_templates_workspace_id ON sc_templates(workspace_id)',

    // ========================
    // Team
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_tm_members_workspace_id ON tm_members(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_tm_members_status ON tm_members(status)',
    'CREATE INDEX IF NOT EXISTS idx_tm_invites_workspace_id ON tm_invites(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_tm_invites_status ON tm_invites(status)',
    'CREATE INDEX IF NOT EXISTS idx_tm_invites_invited_by ON tm_invites(invited_by)',

    // ========================
    // The Advisor
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_adv_briefings_workspace_id ON adv_briefings(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_adv_actions_workspace_id ON adv_actions(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_adv_actions_briefing_id ON adv_actions(briefing_id)',
    'CREATE INDEX IF NOT EXISTS idx_adv_actions_status ON adv_actions(status)',

    // ========================
    // Video Marketing
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_vm_campaigns_workspace_id ON vm_campaigns(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_generations_workspace_id ON vm_generations(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_generations_campaign_id ON vm_generations(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_favorites_workspace_id ON vm_favorites(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_favorites_campaign_id ON vm_favorites(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_favorites_generation_id ON vm_favorites(generation_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_video_jobs_workspace_id ON vm_video_jobs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_video_jobs_campaign_id ON vm_video_jobs(campaign_id)',
    'CREATE INDEX IF NOT EXISTS idx_vm_video_jobs_status ON vm_video_jobs(status)',

    // ========================
    // Webhooks
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_wh_webhooks_workspace_id ON wh_webhooks(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_wh_webhooks_status ON wh_webhooks(status)',
    'CREATE INDEX IF NOT EXISTS idx_wh_webhook_logs_workspace_id ON wh_webhook_logs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_wh_webhook_logs_webhook_id ON wh_webhook_logs(webhook_id)',

    // ========================
    // Website Builder
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_wb_sites_workspace_id ON wb_sites(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_wb_sites_status ON wb_sites(status)',
    'CREATE INDEX IF NOT EXISTS idx_wb_pages_workspace_id ON wb_pages(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_wb_pages_site_id ON wb_pages(site_id)',

    // ========================
    // Workflow Builder
    // ========================
    'CREATE INDEX IF NOT EXISTS idx_wf_workflows_workspace_id ON wf_workflows(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_wf_workflows_status ON wf_workflows(status)',
    'CREATE INDEX IF NOT EXISTS idx_wf_steps_workspace_id ON wf_steps(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_wf_steps_workflow_id ON wf_steps(workflow_id)',
    'CREATE INDEX IF NOT EXISTS idx_wf_runs_workspace_id ON wf_runs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_wf_runs_workflow_id ON wf_runs(workflow_id)',
    'CREATE INDEX IF NOT EXISTS idx_wf_runs_status ON wf_runs(status)',
  ];

  let created = 0;
  for (const sql of statements) {
    try {
      // Only run if the table exists
      const tableMatch = sql.match(/ON (\w+)\(/);
      if (tableMatch) {
        const table = tableMatch[1];
        const exists = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
        ).get(table);
        if (!exists) continue;
      }
      db.exec(sql);
      created++;
    } catch (err) {
      // Log but don't fail — column may not exist yet on a fresh DB
      console.error(`  Index migration warning: ${err.message}`);
    }
  }

  if (created > 0) {
    console.log(`  Index migration: ensured ${created} index(es)`);
  }
}

module.exports = { runMigration };
