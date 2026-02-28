import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';
import ProductInput from './components/ProductInput';
import Dashboard from './components/Dashboard';
import CampaignHistory from './components/CampaignHistory';

const API_BASE = import.meta.env.VITE_API_URL || '';

const STEPS = [
  { key: 'Product', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'Angles', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { key: 'Scripts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'Hooks', icon: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' },
  { key: 'Storyboard', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'Videos', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { key: 'Gallery', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { key: 'UGC Briefs', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'Export', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
];

export default function VideoMarketingPage() {
  usePageTitle('Video Marketing');
  const { dark } = useTheme();
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`);
      const data = await res.json();
      setCampaigns(data);
    } catch (e) {
      console.error('Failed to fetch campaigns:', e);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const loadCampaign = async (id) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      setActiveCampaign(data);
      const stages = ['angles', 'scripts', 'hooks', 'storyboard', 'ugc'];
      let lastStep = 0;
      if (data.generations) {
        stages.forEach((stage, i) => {
          if (data.generations.some(g => g.stage === stage)) lastStep = i + 1;
        });
      }
      setCurrentStep(Math.min(lastStep + 1, STEPS.length - 1));
      // Close sidebar on mobile after selecting a campaign
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (e) {
      console.error('Failed to load campaign:', e);
    }
  };

  const createCampaign = async (productData) => {
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: productData.name, productData }),
      });
      const campaign = await res.json();
      setActiveCampaign({ ...campaign, product_data: productData, generations: [], favorites: [] });
      setCurrentStep(1);
      fetchCampaigns();
    } catch (e) {
      console.error('Failed to create campaign:', e);
    }
  };

  const handleNewCampaign = () => { setActiveCampaign(null); setCurrentStep(0); };

  const deleteCampaign = async (id) => {
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (activeCampaign?.id === id) { setActiveCampaign(null); setCurrentStep(0); }
      fetchCampaigns();
    } catch (e) {
      console.error('Failed to delete campaign:', e);
    }
  };

  const hasCampaigns = campaigns.length > 0;
  const showingForm = currentStep === 0 || !activeCampaign;

  // When no campaigns exist and no active campaign, show a full-width welcome layout
  if (!hasCampaigns && showingForm) {
    return (
      <div className="h-full overflow-y-auto">
        <ModuleWrapper moduleId="video-marketing">
        <div className="p-6 sm:p-10 lg:p-16 max-w-5xl mx-auto">
          <ProductInput onSubmit={createCampaign} welcome />
        </div>
        </ModuleWrapper>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ModuleWrapper moduleId="video-marketing">
      {/* Mobile overlay when sidebar is open */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Campaign sidebar */}
      <aside className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-30 w-64 md:relative md:inset-auto md:z-auto' : 'w-0'} transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col overflow-hidden flex-shrink-0 relative`}>
        <div className={`absolute inset-0 ${dark ? 'bg-[#050508]' : 'bg-white/60'}`} />
        <div className={`absolute inset-y-0 right-0 w-px ${dark ? 'bg-indigo-500/[0.06]' : 'bg-[#e8e0d4]'}`} />

        <div className="relative px-3 py-3">
          <button
            onClick={handleNewCampaign}
            className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: dark ? '#8b5cf6' : 'var(--lp-terra)',
              color: '#fff',
              boxShadow: dark ? '0 4px 16px -4px rgba(139,92,246,0.3)' : '0 4px 16px -4px rgba(196,93,62,0.25)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </button>
        </div>

        <CampaignHistory
          campaigns={campaigns}
          activeCampaignId={activeCampaign?.id}
          onSelect={loadCampaign}
          onDelete={deleteCampaign}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Step nav */}
        {activeCampaign && (
          <div className={`flex items-center gap-0.5 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar flex-shrink-0 relative border-b ${dark ? 'border-indigo-500/[0.06]' : 'border-[#e8e0d4]'}`}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`mr-2 p-1.5 rounded-md transition-all duration-300 flex-shrink-0 ${dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]' : 'text-[#94908A] hover:text-[#332F2B] hover:bg-[#EDE5DA]/60'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="flex items-center gap-1.5 mr-3 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: dark ? '#4ade80' : 'var(--lp-sage)', boxShadow: dark ? '0 0 6px rgba(74,222,128,0.5)' : 'none' }} />
              <span className={`text-xs font-semibold truncate max-w-[120px] ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
                {activeCampaign.product_name || activeCampaign.product_data?.name}
              </span>
            </div>

            <div className={`flex-shrink-0 w-px h-4 mx-1 ${dark ? 'bg-indigo-500/10' : 'bg-[#e8e0d4]'}`} />

            {STEPS.map((step, i) => (
              <button
                key={step.key}
                onClick={() => setCurrentStep(i)}
                className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  i === currentStep
                    ? dark ? 'text-violet-300' : 'text-[#C45D3E]'
                    : i < currentStep
                      ? dark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]' : 'text-[#332F2B] hover:text-[#C45D3E] hover:bg-[#EDE5DA]/60'
                      : dark ? 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.03]' : 'text-[#94908A] hover:text-[#332F2B] hover:bg-[#EDE5DA]/60'
                }`}
                title={step.key}
              >
                {i === currentStep && (
                  <div className="absolute inset-0 rounded-md" style={{
                    background: dark ? 'rgba(139,92,246,0.1)' : 'rgba(196,93,62,0.08)',
                    border: dark ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(196,93,62,0.15)',
                  }} />
                )}
                <svg className="w-3.5 h-3.5 flex-shrink-0 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                </svg>
                <span className="hidden sm:inline relative">{step.key}</span>
                {i === currentStep && (
                  <span className="absolute -bottom-px left-2 right-2 h-px" style={{ background: dark ? 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' : 'linear-gradient(90deg, transparent, rgba(196,93,62,0.4), transparent)' }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-6 lg:p-8">
            {showingForm ? (
              <div className="max-w-3xl mx-auto">
                <ProductInput onSubmit={createCampaign} />
              </div>
            ) : (
              <Dashboard
                campaign={activeCampaign}
                setCampaign={setActiveCampaign}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
              />
            )}
          </div>
        </div>
      </div>
      </ModuleWrapper>
    </div>
  );
}
