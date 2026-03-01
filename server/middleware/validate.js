const { z } = require('zod');

/**
 * Express middleware factory — validates req.body against a Zod schema.
 * Returns 400 with structured errors on failure.
 *
 * Usage:
 *   const { validate, schemas } = require('../middleware/validate');
 *   router.post('/signup', validate(schemas.signup), handler);
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors });
    }
    req.body = result.data;
    next();
  };
}

// ── Reusable schemas ──────────────────────────────────────────────────

const schemas = {
  signup: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    displayName: z.string().min(1, 'Display name is required').max(100).optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  forgotPassword: z.object({
    email: z.string().email('Invalid email address'),
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),

  createWorkspace: z.object({
    name: z.string().min(1, 'Workspace name is required').max(100),
  }),

  createContact: z.object({
    name: z.string().min(1, 'Contact name is required').max(200),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    company: z.string().max(200).optional(),
    status: z.enum(['lead', 'prospect', 'customer', 'churned']).optional(),
  }),

  createDeal: z.object({
    title: z.string().min(1, 'Deal title is required').max(200),
    value: z.number().min(0).optional(),
    stage: z.string().max(50).optional(),
    contact_id: z.union([z.string(), z.number()]).optional(),
  }),

  createCampaign: z.object({
    name: z.string().min(1, 'Campaign name is required').max(200),
    type: z.enum(['email', 'sms']).optional(),
    subject: z.string().max(500).optional(),
    content: z.string().optional(),
    status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'paused']).optional(),
  }),

  createWebhook: z.object({
    name: z.string().min(1, 'Webhook name is required').max(200),
    url: z.string().url('Invalid URL'),
    events: z.array(z.string()).optional(),
    secret: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
};

module.exports = { validate, schemas, z };
