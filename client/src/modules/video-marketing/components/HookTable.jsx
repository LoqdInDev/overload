import { useState, useMemo } from 'react';
import { EmptyState } from './AngleCards';
import QuickVideoButton from './QuickVideoButton';

const HOOK_TYPES = ['All', 'BOLD CLAIM', 'QUESTION', 'NEGATIVE', 'STORY', 'RESULT'];

export default function HookTable({ hooks, onGenerate, generating, campaignId, productImageUrl }) {
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('scroll_stop_rating');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    if (!hooks?.length) return [];
    let result = [...hooks];
    if (filter !== 'All') {
      result = result.filter(h =>
        (h.hook_type || '').toUpperCase().includes(filter)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      if (typeof aVal === 'number') {
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return sortDir === 'desc'
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
    return result;
  }, [hooks, filter, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  if (!hooks?.length) {
    return (
      <EmptyState
        title="Hook Factory"
        desc="Generate 50 scroll-stopping hooks — the first 3 seconds determine 80% of ad performance."
        buttonText={generating ? 'Generating...' : 'Generate 50 Hooks'}
        onClick={onGenerate}
        disabled={generating}
        icon="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-100">Hook Library</h3>
          <p className="text-sm text-gray-500 mt-1">{hooks.length} hooks generated</p>
        </div>
        <button onClick={onGenerate} disabled={generating} className="btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Regenerate
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {HOOK_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-xs rounded-xl whitespace-nowrap transition-all duration-200 font-medium ${
              filter === type
                ? 'bg-violet-500/20 text-violet-300 shadow-sm'
                : 'glass text-gray-500 hover:text-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3.5 text-[10px] text-gray-600 font-medium uppercase tracking-wider">#</th>
                <th
                  className="px-4 py-3.5 text-[10px] text-gray-600 font-medium uppercase tracking-wider cursor-pointer hover:text-gray-400 transition-colors"
                  onClick={() => toggleSort('hook_type')}
                >
                  Type {sortBy === 'hook_type' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3.5 text-[10px] text-gray-600 font-medium uppercase tracking-wider">Hook Text</th>
                <th
                  className="px-4 py-3.5 text-[10px] text-gray-600 font-medium uppercase tracking-wider cursor-pointer hover:text-gray-400 transition-colors"
                  onClick={() => toggleSort('scroll_stop_rating')}
                >
                  Rating {sortBy === 'scroll_stop_rating' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3.5 text-[10px] text-gray-600 font-medium uppercase tracking-wider hidden lg:table-cell">Visual</th>
                <th className="px-4 py-3.5 text-[10px] text-gray-600 font-medium uppercase tracking-wider">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((hook, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 text-gray-600 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] glass px-2.5 py-1 rounded-lg text-gray-400 font-medium">
                      {hook.hook_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-200 max-w-md leading-relaxed">"{hook.hook_text}"</td>
                  <td className="px-4 py-3.5">
                    <RatingBadge rating={hook.scroll_stop_rating} />
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs max-w-xs truncate hidden lg:table-cell">
                    {hook.visual_suggestion}
                  </td>
                  <td className="px-4 py-3.5">
                    <QuickVideoButton
                      hookText={`${hook.hook_text}. ${hook.visual_suggestion || ''}`}
                      campaignId={campaignId}
                      productImageUrl={productImageUrl}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RatingBadge({ rating }) {
  const color = rating >= 8
    ? 'bg-emerald-500/10 text-emerald-400'
    : rating >= 6
    ? 'bg-amber-500/10 text-amber-400'
    : 'bg-gray-500/10 text-gray-400';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        rating >= 8 ? 'bg-emerald-400' : rating >= 6 ? 'bg-amber-400' : 'bg-gray-400'
      }`} />
      {rating}/10
    </span>
  );
}
