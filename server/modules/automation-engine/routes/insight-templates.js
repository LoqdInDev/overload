const INSIGHT_TEMPLATES = {
  analytics: [
    { type: 'trend', text: 'AI detected a 15% traffic spike in the last 24 hours', detail: 'Most growth from organic search and direct visits' },
    { type: 'recommendation', text: 'Consider scheduling content for peak hours (2-4 PM)', detail: 'Based on historical interaction data patterns' },
    { type: 'dependency', text: '4 automation rules reference analytics data', detail: 'SEO Audit, Budget Adjustment, Engagement Alert, Monthly Report' },
  ],
  connect: [
    { type: 'dependency', text: '3 automations depend on this integration', detail: 'Content, Email & SMS, and Social modules reference this' },
    { type: 'trend', text: 'API usage increased 22% this week', detail: 'Most calls from content generation workflows' },
  ],
  planning: [
    { type: 'recommendation', text: 'AI suggests scheduling content for peak engagement windows', detail: 'Tuesday and Thursday mornings show highest open rates' },
    { type: 'trend', text: '8 upcoming tasks this week across automated modules', detail: 'Autopilot can handle 3 of these automatically' },
    { type: 'dependency', text: 'This connects to 5 automation workflows', detail: 'See Automation Rules for scheduling details' },
  ],
  ecommerce: [
    { type: 'trend', text: 'Revenue up 12% week-over-week across tracked products', detail: 'Top-performing products driving most growth' },
    { type: 'recommendation', text: 'Consider enabling autopilot for product feed optimization', detail: 'AI can auto-adjust pricing and descriptions based on demand' },
  ],
  testing: [
    { type: 'recommendation', text: 'AI suggests testing headline variations for top landing pages', detail: '3 pages with >1000 views have below-average conversion rates' },
    { type: 'trend', text: 'Last A/B test improved conversions by 23%', detail: 'Winner: shorter headline with social proof' },
  ],
  default: [
    { type: 'dependency', text: 'This module connects to the automation ecosystem', detail: 'Enable copilot mode on compatible modules for AI assistance' },
    { type: 'recommendation', text: '12 modules support AI-powered automation', detail: 'Visit Automation Settings to configure your preferences' },
  ],
};

const MODULE_CATEGORY_MAP = {
  'analytics': 'analytics',
  'calendar': 'planning',
  'competitors': 'analytics',
  'crm': 'analytics',
  'funnels': 'planning',
  'website-builder': 'planning',
  'integrations': 'connect',
  'api-manager': 'connect',
  'webhooks': 'connect',
  'workflow-builder': 'planning',
  'scheduler': 'planning',
  'ecommerce-hub': 'ecommerce',
  'knowledge-base': 'connect',
  'brand-hub': 'planning',
  'team': 'connect',
  'client-manager': 'connect',
  'affiliates': 'ecommerce',
  'product-feeds': 'ecommerce',
  'ab-testing': 'testing',
  'budget-optimizer': 'analytics',
  'audience-builder': 'analytics',
  'goal-tracker': 'analytics',
  'referral-loyalty': 'ecommerce',
  'autopilot': 'planning',
  'the-advisor': 'planning',
};

module.exports = { INSIGHT_TEMPLATES, MODULE_CATEGORY_MAP };
