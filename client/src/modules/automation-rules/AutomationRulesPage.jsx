import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON } from '../../lib/api';
import { MODULE_REGISTRY } from '../../config/modules';

const AUTOMATABLE = MODULE_REGISTRY.filter(m => m.automatable);

const TRIGGER_COLORS = {
  schedule: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  event: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  threshold: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
};

const ACTION_TYPES = [
  'generate_content', 'schedule_post', 'send_campaign', 'adjust_budget',
  'generate_report', 'update_meta', 'respond_review', 'optimize_keywords',
];

const FALLBACK_RULES = [
  { id: 1, module_id: 'content', name: 'Weekly Blog Generator', trigger_type: 'schedule', trigger_config: { frequency: 'weekly', day: 'Monday', time: '09:00' }, action_type: 'generate_content', action_config: { type: 'blog_post', length: 'long' }, status: 'active', requires_approval: true, run_count: 12, last_triggered: new Date(Date.now() - 172800000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 2, module_id: 'social', name: 'Daily Social Post', trigger_type: 'schedule', trigger_config: { frequency: 'daily', time: '10:00' }, action_type: 'schedule_post', action_config: { platforms: ['instagram', 'twitter'] }, status: 'active', requires_approval: false, run_count: 45, last_triggered: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 3, module_id: 'reviews', name: 'Review Auto-Response', trigger_type: 'event', trigger_config: { event: 'new_review', condition: 'rating >= 4' }, action_type: 'respond_review', action_config: { tone: 'thankful' }, status: 'active', requires_approval: true, run_count: 28, last_triggered: new Date(Date.now() - 43200000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 4, module_id: 'ads', name: 'Budget Adjustment on ROAS', trigger_type: 'threshold', trigger_config: { metric: 'roas', operator: '>', value: 4.0 }, action_type: 'adjust_budget', action_config: { change: '+15%' }, status: 'active', requires_approval: false, run_count: 8, last_triggered: new Date(Date.now() - 259200000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 5, module_id: 'email-sms', name: 'Weekly Newsletter', trigger_type: 'schedule', trigger_config: { frequency: 'weekly', day: 'Thursday', time: '14:00' }, action_type: 'send_campaign', action_config: { type: 'newsletter' }, status: 'active', requires_approval: true, run_count: 6, last_triggered: new Date(Date.now() - 604800000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
  { id: 6, module_id: 'seo', name: 'Bi-weekly SEO Audit', trigger_type: 'schedule', trigger_config: { frequency: 'biweekly', day: 'Wednesday', time: '08:00' }, action_type: 'optimize_keywords', action_config: { depth: 'full' }, status: 'inactive', requires_approval: true, run_count: 3, last_triggered: new Date(Date.now() - 1209600000).toISOString(), created_at: new Date(Date.now() - 2592000000).toISOString() },
];

const CATEGORY_COLORS = {
  'Content & Social': '#3b82f6',
  'Reviews & CRM': '#8b5cf6',
  'SEO': '#5E8E6E',
  'Ads & Budget': '#f59e0b',
  'Email': '#ec4899',
  'Reports': '#06b6d4',
  'Knowledge Base': '#f97316',
  'Growth': '#e11d48',
};

const DIFFICULTY_STYLES = {
  starter: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Starter' },
  intermediate: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Intermediate' },
  advanced: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', label: 'Advanced' },
};

// All marketplace recipes — defined client-side for instant rendering
const RECIPES = [
  { id: 'blog-social-blast', name: 'Blog → Social Blast', description: 'When a new blog post is published, automatically generate 5 social media posts and queue them for approval.', category: 'Content & Social', icon: '📝', modules: ['content', 'social'], trigger: { type: 'event', config: { event: 'content_published', content_type: 'blog' } }, action: { type: 'schedule_post', config: { format: 'social_posts', count: 5 } }, requires_approval: true, difficulty: 'starter', saves: '3 hrs/week' },
  { id: 'weekly-content-calendar', name: 'Weekly Content Calendar', description: 'Every Monday morning, generate a full content plan for the week based on your top SEO keywords and trends.', category: 'Content & Social', icon: '🗓️', modules: ['content', 'seo'], trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'monday', time: '08:00' } }, action: { type: 'generate_content', config: { type: 'content_calendar', days: 7 } }, requires_approval: true, difficulty: 'starter', saves: '2 hrs/week' },
  { id: 'daily-content-brief', name: 'Daily Content Brief', description: 'Every morning, generate a content brief with fresh topic ideas and angles to keep your content team inspired.', category: 'Content & Social', icon: '✨', modules: ['content'], trigger: { type: 'schedule', config: { frequency: 'daily', time: '07:30' } }, action: { type: 'generate_content', config: { type: 'content_brief', topics: 3 } }, requires_approval: false, difficulty: 'starter', saves: '1 hr/day' },
  { id: 'auto-review-responder', name: 'Auto Review Responder', description: 'When a positive review arrives (4+ stars), generate a warm personalized thank-you response and queue for approval.', category: 'Reviews & CRM', icon: '⭐', modules: ['reviews'], trigger: { type: 'event', config: { event: 'new_review', condition: 'rating >= 4' } }, action: { type: 'respond_review', config: { tone: 'grateful', personalized: true } }, requires_approval: true, difficulty: 'starter', saves: '4 hrs/week' },
  { id: 'low-rating-escalation', name: 'Low Rating Alert & Response', description: 'When a review below 3 stars arrives, immediately draft an empathetic response and escalate to your support team.', category: 'Reviews & CRM', icon: '🚨', modules: ['reviews', 'customer-ai'], trigger: { type: 'event', config: { event: 'new_review', condition: 'rating < 3' } }, action: { type: 'respond_review', config: { tone: 'empathetic', escalate: true } }, requires_approval: true, difficulty: 'starter', saves: '2 hrs/week' },
  { id: 'new-lead-welcome', name: 'New Lead Welcome Sequence', description: 'When a new contact is added to CRM, generate a personalized welcome email and queue it for sending within the hour.', category: 'Reviews & CRM', icon: '🤝', modules: ['crm', 'email-sms'], trigger: { type: 'event', config: { event: 'new_contact', source: 'crm' } }, action: { type: 'send_campaign', config: { type: 'welcome_email', personalized: true } }, requires_approval: true, difficulty: 'intermediate', saves: '3 hrs/week' },
  { id: 'seo-content-briefs', name: 'Weekly SEO Content Briefs', description: 'Every week, generate detailed content briefs for your top keyword opportunities and save them to your content module.', category: 'SEO', icon: '🔍', modules: ['seo', 'content'], trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'tuesday', time: '09:00' } }, action: { type: 'generate_content', config: { type: 'seo_brief', keywords: 5 } }, requires_approval: false, difficulty: 'intermediate', saves: '4 hrs/week' },
  { id: 'monthly-meta-audit', name: 'Monthly Meta Tag Audit', description: 'On the first of each month, audit all your page meta tags and generate a prioritized list of improvements.', category: 'SEO', icon: '🏷️', modules: ['seo'], trigger: { type: 'schedule', config: { frequency: 'monthly', day: '1', time: '08:00' } }, action: { type: 'update_meta', config: { scope: 'all_pages', generate_recommendations: true } }, requires_approval: true, difficulty: 'intermediate', saves: '3 hrs/month' },
  { id: 'competitor-keyword-gap', name: 'Competitor Keyword Gap Report', description: 'Weekly analysis of keyword gaps between you and your top competitors with specific content suggestions to close them.', category: 'SEO', icon: '🎯', modules: ['seo'], trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'wednesday', time: '10:00' } }, action: { type: 'optimize_keywords', config: { type: 'gap_analysis', generate_report: true } }, requires_approval: false, difficulty: 'advanced', saves: '5 hrs/week' },
  { id: 'roas-guardian', name: 'ROAS Guardian', description: 'When your ROAS drops below 2.0, automatically flag low-performing ads and generate a budget reallocation plan.', category: 'Ads & Budget', icon: '🛡️', modules: ['ads', 'budget-optimizer'], trigger: { type: 'threshold', config: { metric: 'roas', operator: '<', value: 2.0 } }, action: { type: 'adjust_budget', config: { action: 'reallocate', protect_top_performers: true } }, requires_approval: true, difficulty: 'advanced', saves: '10 hrs/month' },
  { id: 'weekly-budget-rebalancer', name: 'Weekly Budget Rebalancer', description: 'Every Friday, analyze your ad spend efficiency across all channels and generate a smart budget reallocation suggestion.', category: 'Ads & Budget', icon: '⚖️', modules: ['budget-optimizer', 'ads'], trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'friday', time: '16:00' } }, action: { type: 'adjust_budget', config: { type: 'rebalance', analysis_window: '7_days' } }, requires_approval: true, difficulty: 'intermediate', saves: '3 hrs/week' },
  { id: 'ad-performance-report', name: 'Weekly Ad Performance Report', description: 'Every Friday, generate a comprehensive ad performance report with insights and next week\'s recommendations.', category: 'Ads & Budget', icon: '📊', modules: ['ads'], trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'friday', time: '17:00' } }, action: { type: 'generate_report', config: { type: 'ad_performance', period: '7_days' } }, requires_approval: false, difficulty: 'starter', saves: '2 hrs/week' },
  { id: 'reengagement-campaign', name: 'Re-engagement Campaign', description: 'When a subscriber goes 30 days without engagement, automatically trigger a personalized re-engagement email sequence.', category: 'Email', icon: '💌', modules: ['email-sms'], trigger: { type: 'event', config: { event: 'subscriber_inactive', days: 30 } }, action: { type: 'send_campaign', config: { type: 'reengagement', sequence_length: 3 } }, requires_approval: false, difficulty: 'intermediate', saves: '4 hrs/week' },
  { id: 'monthly-newsletter', name: 'Monthly Newsletter Generator', description: 'On the 1st of each month, generate a full newsletter draft using your best content from the past month.', category: 'Email', icon: '📧', modules: ['email-sms', 'content'], trigger: { type: 'schedule', config: { frequency: 'monthly', day: '1', time: '09:00' } }, action: { type: 'send_campaign', config: { type: 'newsletter', include_top_content: true } }, requires_approval: true, difficulty: 'starter', saves: '4 hrs/month' },
  { id: 'weekly-performance-report', name: 'Weekly Performance Report', description: 'Every Monday, generate a cross-module performance summary with highlights, concerns, and your top 3 priorities for the week.', category: 'Reports', icon: '📈', modules: ['reports'], trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'monday', time: '08:00' } }, action: { type: 'generate_report', config: { type: 'cross_module_summary', modules: 'all' } }, requires_approval: false, difficulty: 'starter', saves: '2 hrs/week' },
  { id: 'goal-progress-update', name: 'Friday Goal Progress Update', description: 'Every Friday afternoon, check your goal tracker and generate a progress update highlighting wins and at-risk goals.', category: 'Reports', icon: '🏆', modules: ['goal-tracker'], trigger: { type: 'schedule', config: { frequency: 'weekly', day: 'friday', time: '15:00' } }, action: { type: 'generate_report', config: { type: 'goal_progress', highlight_risks: true } }, requires_approval: false, difficulty: 'starter', saves: '1 hr/week' },
  { id: 'kb-gap-filler', name: 'Knowledge Base Gap Filler', description: 'Monthly, automatically detect gaps in your knowledge base and generate draft articles for the most critical missing topics.', category: 'Knowledge Base', icon: '📚', modules: ['knowledge-base'], trigger: { type: 'schedule', config: { frequency: 'monthly', day: '15', time: '10:00' } }, action: { type: 'generate_content', config: { type: 'kb_articles', count: 3, priority: 'gaps' } }, requires_approval: true, difficulty: 'intermediate', saves: '5 hrs/month' },
  { id: 'ticket-to-faq', name: 'Support Ticket → FAQ Article', description: 'When a support ticket is resolved, automatically suggest a FAQ article to prevent future tickets on the same topic.', category: 'Knowledge Base', icon: '💡', modules: ['customer-ai', 'knowledge-base'], trigger: { type: 'event', config: { event: 'ticket_closed', auto_suggest_kb: true } }, action: { type: 'generate_content', config: { type: 'faq_article', based_on: 'ticket' } }, requires_approval: true, difficulty: 'intermediate', saves: '3 hrs/week' },
  { id: 'influencer-outreach', name: 'Influencer Outreach Sequence', description: 'When a new influencer campaign starts, generate personalized outreach emails for each influencer and queue for review.', category: 'Growth', icon: '🌟', modules: ['influencers'], trigger: { type: 'event', config: { event: 'campaign_created', type: 'influencer' } }, action: { type: 'generate_content', config: { type: 'outreach_emails', personalized: true } }, requires_approval: true, difficulty: 'intermediate', saves: '6 hrs/campaign' },
  { id: 'affiliate-monthly-report', name: 'Monthly Affiliate Report', description: 'On the last day of each month, generate a complete affiliate performance report with top performers and outstanding payouts.', category: 'Growth', icon: '🤑', modules: ['affiliates'], trigger: { type: 'schedule', config: { frequency: 'monthly', day: 'last', time: '10:00' } }, action: { type: 'generate_report', config: { type: 'affiliate_performance', include_payouts: true } }, requires_approval: false, difficulty: 'starter', saves: '3 hrs/month' },
];

export default function AutomationRulesPage() {
  usePageTitle('Automation Rules');
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const cardBg = dark ? 'rgba(255,255,255,0.02)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const selectBg = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const selectBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  // Always load all rules (unfiltered) so marketplace can compute installed status
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJSON('/api/automation/rules');
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules(FALLBACK_RULES);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  // Filtered view for My Rules tab
  const displayedRules = filterModule === 'all'
    ? rules
    : rules.filter(r => r.module_id === filterModule);

  async function toggleStatus(rule) {
    setTogglingId(rule.id);
    try {
      await putJSON(`/api/automation/rules/${rule.id}`, { status: rule.status === 'active' ? 'inactive' : 'active' });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' } : r));
    } catch { /* silent */ }
    setTogglingId(null);
  }

  async function deleteRule(id) {
    try {
      await deleteJSON(`/api/automation/rules/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch { /* silent */ }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const grouped = {};
  for (const rule of displayedRules) {
    if (!grouped[rule.module_id]) grouped[rule.module_id] = [];
    grouped[rule.module_id].push(rule);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#5E8E6E' }}>Automation</div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif', color: textPrimary }}>
            {activeTab === 'rules' ? 'Automation Rules' : 'Recipe Marketplace'}
          </h1>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>
            {activeTab === 'rules'
              ? `${displayedRules.length} rule${displayedRules.length !== 1 ? 's' : ''} configured across your modules`
              : 'Install pre-built automation recipes with one click'}
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', width: 'fit-content' }}>
          {[
            { id: 'rules', label: 'My Rules' },
            { id: 'marketplace', label: '✦ Marketplace' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="py-1.5 px-5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? (dark ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
                color: activeTab === tab.id ? textPrimary : textSecondary,
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Rules Tab */}
        {activeTab === 'rules' ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <select
                value={filterModule}
                onChange={e => setFilterModule(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: selectBg, border: `1px solid ${selectBorder}`, color: textPrimary }}
              >
                <option value="all">All Modules</option>
                {AUTOMATABLE.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: '#5E8E6E', color: '#ffffff' }}
              >+ Create Rule</button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} />
                ))}
              </div>
            ) : displayedRules.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="text-4xl mb-3">⚡</div>
                <h2 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>No automation rules yet</h2>
                <p className="text-xs mb-4" style={{ color: textSecondary }}>Create a custom rule or browse ready-made recipes</p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: '#5E8E6E', color: '#ffffff' }}
                >Browse Marketplace</button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([moduleId, moduleRules]) => {
                  const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
                  return (
                    <div key={moduleId}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full" style={{ background: mod?.color || '#94908A' }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: mod?.color || textSecondary }}>
                          {mod?.name || moduleId}
                        </span>
                        <span className="text-[10px]" style={{ color: textSecondary }}>({moduleRules.length})</span>
                      </div>
                      <div className="space-y-2">
                        {moduleRules.map(rule => {
                          const tc = TRIGGER_COLORS[rule.trigger_type] || TRIGGER_COLORS.schedule;
                          const isExpanded = expandedId === rule.id;
                          return (
                            <div key={rule.id} className="rounded-xl overflow-hidden transition-all" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                              <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : rule.id)}>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: tc.bg, color: tc.color }}>
                                  {rule.trigger_type}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: textPrimary }}>{rule.name}</p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px]" style={{ color: textSecondary }}>{rule.run_count} runs</span>
                                    <span className="text-[10px]" style={{ color: textSecondary }}>Last: {timeAgo(rule.last_triggered)}</span>
                                    {rule.requires_approval && (
                                      <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: 'rgba(212,160,23,0.1)', color: '#D4A017' }}>needs approval</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); toggleStatus(rule); }}
                                  disabled={togglingId === rule.id}
                                  className="w-9 h-5 rounded-full transition-all flex-shrink-0 relative"
                                  style={{ background: rule.status === 'active' ? '#22c55e' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }}
                                >
                                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: rule.status === 'active' ? '18px' : '2px' }} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); if (confirm('Delete this rule?')) deleteRule(rule.id); }}
                                  className="p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-red-500/10"
                                  style={{ color: textSecondary }}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-1 space-y-2" style={{ borderTop: `1px solid ${cardBorder}` }}>
                                  {rule.trigger_config && (
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Trigger Config</span>
                                      <pre className="mt-1 text-[11px] p-2 rounded-lg overflow-auto max-h-32" style={{ background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', color: textSecondary }}>
                                        {JSON.stringify(rule.trigger_config, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {rule.action_config && (
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Action Config</span>
                                      <pre className="mt-1 text-[11px] p-2 rounded-lg overflow-auto max-h-32" style={{ background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', color: textSecondary }}>
                                        {JSON.stringify(rule.action_config, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <MarketplaceTab dark={dark} rules={rules} onInstalled={loadRules} />
        )}

        {showCreate && (
          <CreateRuleModal dark={dark} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadRules(); }} />
        )}
      </div>
    </div>
  );
}

// Compute which recipe IDs are installed from the rules list
function getInstalledRecipeIds(rules) {
  const ids = new Set();
  for (const rule of rules) {
    try {
      const cfg = typeof rule.trigger_config === 'string'
        ? JSON.parse(rule.trigger_config)
        : rule.trigger_config;
      if (cfg?.marketplace_recipe_id) ids.add(cfg.marketplace_recipe_id);
    } catch {}
  }
  return ids;
}

function MarketplaceTab({ dark, rules, onInstalled }) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  // acting: { id, type: 'install' | 'uninstall' } | null
  const [acting, setActing] = useState(null);
  const [justInstalled, setJustInstalled] = useState(null);
  // Local override map: recipeId → true/false, set only after API success
  const [localOverrides, setLocalOverrides] = useState({});

  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const cardBg = dark ? 'rgba(255,255,255,0.02)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  const installedIds = getInstalledRecipeIds(rules);
  const categories = ['All', ...new Set(RECIPES.map(r => r.category))];

  const filtered = RECIPES.filter(r => {
    const matchesCat = category === 'All' || r.category === category;
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  function isInstalled(recipeId) {
    if (recipeId in localOverrides) return localOverrides[recipeId];
    return installedIds.has(recipeId);
  }

  async function install(recipe) {
    setActing({ id: recipe.id, type: 'install' });
    try {
      await postJSON(`/api/automation/marketplace/install/${recipe.id}`, {});
      setLocalOverrides(prev => ({ ...prev, [recipe.id]: true }));
      setJustInstalled(recipe.id);
      setTimeout(() => setJustInstalled(null), 3000);
      onInstalled?.();
    } catch { /* silent */ }
    setActing(null);
  }

  async function uninstall(recipe) {
    setActing({ id: recipe.id, type: 'uninstall' });
    try {
      await deleteJSON(`/api/automation/marketplace/uninstall/${recipe.id}`);
      setLocalOverrides(prev => ({ ...prev, [recipe.id]: false }));
      onInstalled?.();
    } catch { /* silent */ }
    setActing(null);
  }

  const installedCount = RECIPES.filter(r => isInstalled(r.id) || localOverrides[r.id]).length;

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-5 text-[11px]" style={{ color: textSecondary }}>
        <span><strong style={{ color: textPrimary }}>{RECIPES.length}</strong> recipes available</span>
        {installedCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            <strong style={{ color: textPrimary }}>{installedCount}</strong> installed
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: textSecondary }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
          style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {categories.map(cat => {
          const color = cat === 'All' ? '#5E8E6E' : (CATEGORY_COLORS[cat] || '#5E8E6E');
          const isActive = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: isActive ? color : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                color: isActive ? '#ffffff' : textSecondary,
                border: `1px solid ${isActive ? 'transparent' : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
              }}
            >{cat}</button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm font-medium mb-1" style={{ color: textPrimary }}>No recipes found</p>
          <p className="text-xs" style={{ color: textSecondary }}>Try a different category or search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(recipe => {
            const catColor = CATEGORY_COLORS[recipe.category] || '#5E8E6E';
            const diff = DIFFICULTY_STYLES[recipe.difficulty] || DIFFICULTY_STYLES.starter;
            const isInstalling = acting?.id === recipe.id && acting?.type === 'install';
            const isUninstalling = acting?.id === recipe.id && acting?.type === 'uninstall';
            const installed = isInstalled(recipe.id);
            const wasJustInstalled = justInstalled === recipe.id;

            return (
              <div
                key={recipe.id}
                className="rounded-2xl flex flex-col overflow-hidden transition-all"
                style={{
                  background: cardBg,
                  border: `1px solid ${installed ? catColor + '40' : cardBorder}`,
                  boxShadow: installed ? `0 0 0 1px ${catColor}20` : 'none',
                }}
              >
                <div className="h-0.5" style={{ background: catColor }} />
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${catColor}18` }}>
                      {recipe.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug" style={{ color: textPrimary }}>{recipe.name}</p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: catColor }}>{recipe.category}</p>
                    </div>
                  </div>

                  <p className="text-[12px] leading-relaxed mb-3 flex-1" style={{ color: textSecondary }}>
                    {recipe.description}
                  </p>

                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {(recipe.modules || []).map(mod => (
                      <span key={mod} className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: textSecondary }}>
                        {mod}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: diff.bg, color: diff.color }}>
                      {diff.label}
                    </span>
                    <span className="text-[10px]" style={{ color: textSecondary }}>⚡ {recipe.saves}</span>
                    <span className="ml-auto text-[10px]" style={{ color: textSecondary }}>
                      {recipe.requires_approval ? '👁 Approval needed' : '🤖 Fully auto'}
                    </span>
                  </div>

                  {wasJustInstalled ? (
                    <div className="w-full py-2 rounded-xl text-xs font-semibold text-center" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                      ✓ Installed! View in My Rules
                    </div>
                  ) : isInstalling ? (
                    <button disabled className="w-full py-2 rounded-xl text-xs font-semibold" style={{ background: catColor, color: '#ffffff', opacity: 0.6 }}>
                      Installing...
                    </button>
                  ) : isUninstalling ? (
                    <button disabled className="w-full py-2 rounded-xl text-xs font-semibold" style={{ background: 'transparent', border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, color: textSecondary, opacity: 0.5 }}>
                      Removing...
                    </button>
                  ) : installed ? (
                    <button
                      onClick={() => uninstall(recipe)}
                      className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: 'transparent', border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, color: textSecondary }}
                    >
                      ✓ Installed — Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => install(recipe)}
                      className="w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 hover:scale-[1.01]"
                      style={{ background: catColor, color: '#ffffff' }}
                    >
                      + Install Recipe
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateRuleModal({ dark, onClose, onCreated }) {
  const [form, setForm] = useState({
    module_id: AUTOMATABLE[0]?.id || '',
    name: '',
    trigger_type: 'schedule',
    frequency: 'daily',
    day: 'monday',
    time: '09:00',
    event_type: 'new_data',
    metric: 'views',
    operator: '>',
    threshold_value: '100',
    action_type: 'generate_content',
    requires_approval: true,
  });
  const [saving, setSaving] = useState(false);

  const cardBg = dark ? '#1E1C1A' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';
  const inputBg = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    let trigger_config = {};
    if (form.trigger_type === 'schedule') {
      trigger_config = { frequency: form.frequency, day: form.day, time: form.time };
    } else if (form.trigger_type === 'event') {
      trigger_config = { event: form.event_type };
    } else {
      trigger_config = { metric: form.metric, operator: form.operator, value: Number(form.threshold_value) };
    }

    try {
      await postJSON('/api/automation/rules', {
        module_id: form.module_id,
        name: form.name,
        trigger_type: form.trigger_type,
        trigger_config,
        action_type: form.action_type,
        action_config: {},
        requires_approval: form.requires_approval,
      });
      onCreated();
    } catch { /* silent */ }
    setSaving(false);
  }

  const labelStyle = { color: textSecondary, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { background: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary, fontSize: 13 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif', color: textPrimary }}>Create Rule</h2>
          <button onClick={onClose} className="p-1" style={{ color: textSecondary }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1" style={labelStyle}>Module</label>
            <select value={form.module_id} onChange={e => setForm(f => ({ ...f, module_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg" style={inputStyle}>
              {AUTOMATABLE.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>Rule Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekly Blog Generator" className="w-full px-3 py-2 rounded-lg" style={inputStyle} />
          </div>

          <div>
            <label className="block mb-1" style={labelStyle}>Trigger Type</label>
            <div className="flex gap-2">
              {['schedule', 'event', 'threshold'].map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, trigger_type: t }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.trigger_type === t ? TRIGGER_COLORS[t].bg : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                    color: form.trigger_type === t ? TRIGGER_COLORS[t].color : textSecondary,
                    border: `1px solid ${form.trigger_type === t ? TRIGGER_COLORS[t].color + '33' : 'transparent'}`,
                  }}>{t}</button>
              ))}
            </div>
          </div>

          {form.trigger_type === 'schedule' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1" style={labelStyle}>Frequency</label>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle}>
                  {['daily', 'weekly', 'biweekly', 'monthly'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Day</label>
                <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Time</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle} />
              </div>
            </div>
          )}

          {form.trigger_type === 'event' && (
            <div>
              <label className="block mb-1" style={labelStyle}>Event Type</label>
              <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg" style={inputStyle}>
                {['new_data', 'new_review', 'new_subscriber', 'content_milestone', 'metric_change'].map(e => (
                  <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {form.trigger_type === 'threshold' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1" style={labelStyle}>Metric</label>
                <input value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle} />
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Operator</label>
                <select value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle}>
                  {['>', '<', '>=', '<=', '='].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1" style={labelStyle}>Value</label>
                <input type="number" value={form.threshold_value} onChange={e => setForm(f => ({ ...f, threshold_value: e.target.value }))}
                  className="w-full px-2 py-2 rounded-lg text-xs" style={inputStyle} />
              </div>
            </div>
          )}

          <div>
            <label className="block mb-1" style={labelStyle}>Action Type</label>
            <select value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg" style={inputStyle}>
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label style={labelStyle}>Requires Approval</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, requires_approval: !f.requires_approval }))}
              className="w-9 h-5 rounded-full transition-all relative"
              style={{ background: form.requires_approval ? '#D4A017' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: form.requires_approval ? '18px' : '2px' }} />
            </button>
          </div>
          <p className="text-[10px]" style={{ color: textSecondary }}>
            {form.requires_approval ? 'Copilot mode — AI will suggest, you approve' : 'Autopilot mode — AI will execute automatically'}
          </p>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving || !form.name.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#5E8E6E', color: '#ffffff', opacity: saving || !form.name.trim() ? 0.5 : 1 }}>
              {saving ? 'Creating...' : 'Create Rule'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm"
              style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: textSecondary }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
