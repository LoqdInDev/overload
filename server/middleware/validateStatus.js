/**
 * Status / Enum Validation Middleware & Helpers
 *
 * Since SQLite doesn't support adding CHECK constraints after table creation,
 * this module provides application-level validation for status and enum fields.
 *
 * Usage:
 *
 *   const { createStatusValidator, validateField, STATUS_MAPS } = require('./validateStatus');
 *
 *   // As Express middleware for a specific route:
 *   router.post('/', createStatusValidator('status', ['draft', 'active', 'paused']), handler);
 *
 *   // As a standalone check inside a route handler:
 *   const error = validateField('status', req.body.status, ['draft', 'active', 'paused']);
 *   if (error) return res.status(400).json({ error });
 */

/**
 * Known status values by module/table, gathered from existing CHECK constraints
 * and schema defaults across the codebase. Routes can reference these directly
 * or define their own allowed lists.
 */
const STATUS_MAPS = {
  // Affiliates
  af_programs: ['active', 'paused', 'closed'],
  af_affiliates: ['active', 'inactive', 'pending', 'suspended'],
  af_payouts: ['pending', 'paid'],

  // Reports
  cr_reports: ['draft', 'published'],
  cr_schedules_frequency: ['weekly', 'monthly', 'quarterly'],

  // Product Feeds
  pf_feeds_format: ['csv', 'xml', 'json'],
  pf_feeds: ['active', 'paused', 'error'],
  pf_rules_type: ['replace', 'prefix', 'suffix', 'remove'],

  // Video Marketing
  vm_campaigns_stage: ['angles', 'scripts', 'hooks', 'storyboard', 'ugc', 'iteration'],
  vm_video_jobs: ['queued', 'processing', 'completed', 'failed'],

  // Common status patterns used across many modules
  common_draft_active: ['draft', 'active', 'paused', 'archived'],
  common_lifecycle: ['draft', 'active', 'paused', 'completed', 'archived'],

  // A/B Testing
  abt_tests: ['draft', 'running', 'paused', 'completed'],

  // Autopilot
  ap_config: ['inactive', 'active', 'paused'],
  ap_actions: ['pending', 'approved', 'rejected', 'executed'],
  ap_insights: ['new', 'acknowledged', 'dismissed'],

  // Automation Engine
  ae_approval_queue: ['pending', 'approved', 'rejected'],
  ae_rules: ['active', 'paused', 'disabled'],

  // Budget Optimizer
  bo_budgets: ['active', 'paused', 'completed'],

  // Calendar
  mc_events: ['planned', 'in-progress', 'completed', 'cancelled'],

  // Chatbot
  cb_bots: ['draft', 'active', 'paused'],

  // Client Manager
  cm_clients: ['active', 'inactive', 'churned'],
  cm_projects: ['active', 'completed', 'on-hold'],

  // Email & SMS
  es_campaigns: ['draft', 'scheduled', 'sending', 'sent', 'paused'],

  // Funnels
  fn_funnels: ['draft', 'active', 'paused', 'archived'],

  // Goal Tracker
  gt_goals: ['active', 'completed', 'abandoned'],

  // Influencers
  inf_campaigns: ['draft', 'active', 'completed'],
  inf_outreach: ['pending', 'accepted', 'declined', 'negotiating'],

  // Integrations
  int_connections: ['connected', 'disconnected', 'error'],

  // Knowledge Base
  kb_articles: ['draft', 'published', 'archived'],

  // Paid Advertising
  pa_campaigns: ['draft', 'active', 'paused', 'completed'],

  // PR & Press
  pp_releases: ['draft', 'published', 'archived'],

  // Referral & Loyalty
  rl_programs: ['active', 'paused', 'ended'],

  // Reviews
  rv_reviews: ['draft', 'published'],

  // Scheduler
  sc_scheduled_tasks: ['active', 'paused', 'completed'],

  // SEO
  seo_projects: ['active', 'paused', 'completed'],

  // Social Media
  sm_posts: ['draft', 'scheduled', 'published', 'failed'],
  sm_calendar: ['planned', 'confirmed', 'published'],

  // Support Center
  sc_tickets: ['open', 'in-progress', 'resolved', 'closed'],

  // Team
  tm_members: ['active', 'inactive', 'suspended'],
  tm_invites: ['pending', 'accepted', 'expired', 'revoked'],

  // Website Builder
  wb_sites: ['draft', 'published', 'maintenance'],

  // Webhooks
  wh_webhooks: ['active', 'paused', 'disabled'],

  // Workflow Builder
  wf_workflows: ['draft', 'active', 'paused', 'archived'],
};

/**
 * Validate a single field value against an allowed list.
 *
 * @param {string} fieldName - The name of the field (for error messages)
 * @param {*} value - The value to validate
 * @param {string[]} allowedValues - Array of allowed values
 * @returns {string|null} Error message if invalid, null if valid
 */
function validateField(fieldName, value, allowedValues) {
  if (value === undefined || value === null) {
    return null; // Allow undefined/null — let DB defaults or NOT NULL constraints handle it
  }
  if (!allowedValues.includes(value)) {
    return `Invalid ${fieldName}: "${value}". Allowed values: ${allowedValues.join(', ')}`;
  }
  return null;
}

/**
 * Create Express middleware that validates a field in req.body against allowed values.
 *
 * @param {string} fieldName - The body field to validate
 * @param {string[]} allowedValues - Array of allowed values
 * @returns {Function} Express middleware
 *
 * @example
 *   router.post('/', createStatusValidator('status', ['draft', 'active']), (req, res) => { ... });
 */
function createStatusValidator(fieldName, allowedValues) {
  return (req, res, next) => {
    const error = validateField(fieldName, req.body[fieldName], allowedValues);
    if (error) {
      return res.status(400).json({
        error,
        code: 'VALIDATION_ERROR',
      });
    }
    next();
  };
}

/**
 * Create middleware that validates multiple fields at once.
 *
 * @param {Object.<string, string[]>} fieldRules - Map of field names to allowed values
 * @returns {Function} Express middleware
 *
 * @example
 *   router.post('/', createMultiFieldValidator({
 *     status: ['draft', 'active'],
 *     priority: ['low', 'medium', 'high'],
 *   }), handler);
 */
function createMultiFieldValidator(fieldRules) {
  return (req, res, next) => {
    for (const [fieldName, allowedValues] of Object.entries(fieldRules)) {
      const error = validateField(fieldName, req.body[fieldName], allowedValues);
      if (error) {
        return res.status(400).json({
          error,
          code: 'VALIDATION_ERROR',
        });
      }
    }
    next();
  };
}

module.exports = {
  STATUS_MAPS,
  validateField,
  createStatusValidator,
  createMultiFieldValidator,
};
