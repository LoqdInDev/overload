import { useTheme } from '../../../context/ThemeContext';

export default function CampaignHistory({ campaigns, activeCampaignId, onSelect, onDelete }) {
  const { dark } = useTheme();

  if (!campaigns.length) {
    return (
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${dark ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-[#F5F0E8] border border-[#e8e0d4]'}`}>
          <svg className={`w-5 h-5 ${dark ? 'text-gray-600' : 'text-[#94908A]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className={`text-xs font-medium ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>No campaigns yet</p>
        <p className={`text-[10px] mt-1 ${dark ? 'text-gray-700' : 'text-[#b5b0a8]'}`}>Create one to get started</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto px-3 py-1">
      <p className={`text-[10px] uppercase tracking-wider px-2 mb-2 font-semibold ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>Campaigns</p>
      {campaigns.map((c) => (
        <div
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer mb-1 transition-all duration-200 ${
            c.id === activeCampaignId
              ? dark ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-[#C45D3E]/[0.06] border border-[#C45D3E]/15'
              : dark ? 'hover:bg-white/5 border border-transparent' : 'hover:bg-[#F5F0E8] border border-transparent'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
            c.id === activeCampaignId
              ? dark ? 'bg-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 text-[#C45D3E]'
              : dark ? 'bg-white/5 text-gray-500 group-hover:text-gray-400' : 'bg-[#EDE5DA] text-[#94908A] group-hover:text-[#332F2B]'
          }`}>
            {(c.product_name || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm truncate ${
              c.id === activeCampaignId
                ? dark ? 'text-violet-200' : 'text-[#C45D3E] font-medium'
                : dark ? 'text-gray-400 group-hover:text-gray-200' : 'text-[#332F2B] group-hover:text-[#332F2B]'
            }`}>
              {c.product_name}
            </p>
            <p className={`text-[10px] ${dark ? 'text-gray-600' : 'text-[#94908A]'}`}>
              {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this campaign?')) onDelete(c.id);
            }}
            className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all ${dark ? 'hover:bg-red-500/10 text-gray-600 hover:text-red-400' : 'hover:bg-red-50 text-[#94908A] hover:text-red-500'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
