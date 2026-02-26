import { useState, useEffect } from 'react';
import { fetchJSON, connectSSE } from '../../lib/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const AI_TEMPLATES = [
  { name: 'Optimize Budget Split', prompt: 'Analyze current channel performance and recommend an optimized budget allocation to maximize overall ROAS' },
  { name: 'ROAS Improvement Plan', prompt: 'Create a detailed plan to improve ROAS across underperforming channels with specific tactical recommendations' },
  { name: 'Channel Performance Analysis', prompt: 'Provide a comprehensive performance analysis of each marketing channel with benchmarks and trends' },
  { name: 'Budget Forecast', prompt: 'Generate a 90-day budget forecast with projected spend, revenue, and ROAS by channel' },
];

export default function BudgetOptimizerPage() {
  usePageTitle('Budget Optimizer');
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const budgetsRes = await fetchJSON('/api/budget-optimizer/budgets');
        const budgetList = budgetsRes?.data || (Array.isArray(budgetsRes) ? budgetsRes : []);
        if (cancelled) return;
        setBudgets(budgetList);

        if (budgetList.length > 0 && budgetList[0].id) {
          const detailRes = await fetchJSON(`/api/budget-optimizer/budgets/${budgetList[0].id}`);
          if (!cancelled) {
            const detail = detailRes?.data || detailRes || {};
            setAllocations(Array.isArray(detail.allocations) ? detail.allocations : []);
          }
        }
      } catch (err) {
        console.error('Failed to load budget data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const totalBudget = allocations.reduce((sum, a) => sum + (a.budget || 0), 0);
  const totalSpent = allocations.reduce((sum, a) => sum + (a.spent || 0), 0);
  const bestRoas = allocations.length > 0 ? Math.max(...allocations.map(a => a.roas || 0)) : 0;
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const formatCurrency = (val) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toLocaleString()}`;
  };

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    const cancel = connectSSE('/api/budget-optimizer/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); }
    });
    return cancel;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#059669' }}>BUDGET OPTIMIZER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Budget Optimizer</h1><p className="text-base text-gray-500">Optimize spend across channels for maximum ROAS</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="panel rounded-2xl p-4 sm:p-6 animate-pulse"><div className="h-3 w-20 bg-white/5 rounded mb-2" /><div className="h-7 w-12 bg-white/5 rounded" /></div>
          ))}
        </div>
        <div className="text-center text-gray-500 py-12">Loading budget data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#059669' }}>BUDGET OPTIMIZER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Budget Optimizer</h1><p className="text-base text-gray-500">Optimize spend across channels for maximum ROAS</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'TOTAL BUDGET', v: allocations.length > 0 ? formatCurrency(totalBudget) : '$0' }, { l: 'ACTIVE CHANNELS', v: allocations.length }, { l: 'BEST ROAS', v: bestRoas > 0 ? `${bestRoas}x` : '0x' }, { l: 'BUDGET USED', v: `${budgetUsedPct}%` }].map((s, i) => (<div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {['overview', 'allocations', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(5,150,105,0.15)', borderColor: 'rgba(5,150,105,0.3)', color: '#34d399' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {allocations.length === 0 ? (
            <div className="panel rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-base">No budget allocations yet</p>
              <p className="text-gray-600 text-sm mt-1">Create a budget to start tracking channel allocations.</p>
            </div>
          ) : (
            allocations.map((a, idx) => { const pct = a.budget > 0 ? Math.round((a.spent / a.budget) * 100) : 0; return (<div key={a.id || idx} className="panel rounded-2xl p-4 sm:p-6"><div className="flex items-center justify-between mb-2"><p className="text-base font-semibold text-gray-200">{a.channel}</p><span className="text-base font-bold font-mono" style={{ color: '#34d399' }}>{a.roas}x ROAS</span></div><div className="w-full h-1.5 rounded-full bg-white/5 mb-1.5"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? '#f87171' : '#059669' }} /></div><div className="flex justify-between text-xs text-gray-500"><span>${(a.spent || 0).toLocaleString()} / ${(a.budget || 0).toLocaleString()}</span><span>{pct}% used</span></div></div>); })
          )}
        </div>
      )}
      {tab === 'allocations' && (
        <div className="panel rounded-2xl overflow-hidden animate-fade-in">
          {allocations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-base">No allocations to display</p>
              <p className="text-gray-600 text-sm mt-1">Create a budget with channel allocations to see them here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><div className="divide-y divide-indigo-500/[0.04] min-w-[480px]"><div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-3 text-xs text-gray-500 font-semibold uppercase"><span className="flex-1">Channel</span><span className="w-20 text-right">Budget</span><span className="w-20 text-right">Spent</span><span className="w-16 text-right">ROAS</span><span className="w-16 text-right">Share</span></div>{allocations.map((a, idx) => (<div key={a.id || idx} className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors"><span className="flex-1 text-sm font-semibold text-gray-300">{a.channel}</span><span className="w-20 text-right text-sm text-gray-400 font-mono">${(a.budget || 0).toLocaleString()}</span><span className="w-20 text-right text-sm text-gray-400 font-mono">${(a.spent || 0).toLocaleString()}</span><span className="w-16 text-right text-sm font-bold font-mono" style={{ color: '#34d399' }}>{a.roas}x</span><span className="w-16 text-right text-sm text-gray-500 font-mono">{totalBudget > 0 ? Math.round(((a.budget || 0) / totalBudget) * 100) : 0}%</span></div>))}<div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 border-t border-indigo-500/10"><span className="flex-1 text-sm font-bold text-gray-200">Total</span><span className="w-20 text-right text-sm font-bold text-gray-200 font-mono">${totalBudget.toLocaleString()}</span><span className="w-20 text-right text-sm font-bold text-gray-200 font-mono">${totalSpent.toLocaleString()}</span><span className="w-16" /><span className="w-16 text-right text-sm font-bold text-gray-200 font-mono">100%</span></div></div></div>
          )}
        </div>
      )}
      {tab === 'ai-tools' && (<div className="space-y-4 sm:space-y-6 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-emerald-500/20' : ''}`}><p className="text-sm font-bold text-gray-300">{t.name}</p><p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: '#34d399' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-emerald-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
      <AIInsightsPanel moduleId="budget-optimizer" />
    </div>
  );
}
