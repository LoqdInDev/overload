import { useState, useCallback } from 'react';
import AngleCards from './AngleCards';
import ScriptViewer from './ScriptViewer';
import HookTable from './HookTable';
import StoryboardView from './StoryboardView';
import VideoGenerator from './VideoGenerator';
import VideoGallery from './VideoGallery';
import UGCBriefs from './UGCBriefs';
import ExportPanel from './ExportPanel';
import GenerationProgress from './GenerationProgress';

function getLatestGeneration(campaign, stage) {
  if (!campaign?.generations) return null;
  const gens = campaign.generations
    .filter(g => g.stage === stage)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return gens[0] || null;
}

export default function Dashboard({ campaign, setCampaign, currentStep, setCurrentStep }) {
  const [selectedAngles, setSelectedAngles] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');

  const productProfile = campaign.product_data;

  const anglesGen = getLatestGeneration(campaign, 'angles');
  const scriptsGen = getLatestGeneration(campaign, 'scripts');
  const hooksGen = getLatestGeneration(campaign, 'hooks');
  const storyboardGen = getLatestGeneration(campaign, 'storyboard');
  const ugcGen = getLatestGeneration(campaign, 'ugc');

  const angles = anglesGen?.output || [];
  const scripts = scriptsGen?.output || [];
  const hooks = hooksGen?.output || [];
  const storyboards = storyboardGen?.output || [];
  const ugcBriefs = ugcGen?.output || [];

  const callSSE = useCallback(async (url, body) => {
    setGenerating(true);
    setStreamText('');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'chunk') {
                setStreamText(prev => prev + event.text);
              } else if (event.type === 'result') {
                result = event.data;
              } else if (event.type === 'error') {
                throw new Error(event.error);
              }
            } catch (e) {
              if (e.message !== 'Unexpected end of JSON input') {
                console.error('SSE parse error:', e);
              }
            }
          }
        }
      }

      return result;
    } finally {
      setGenerating(false);
      setStreamText('');
    }
  }, []);

  const addGeneration = useCallback((stage, data, genId) => {
    setCampaign(prev => ({
      ...prev,
      generations: [
        ...(prev.generations || []),
        { id: genId, stage, output: data, created_at: new Date().toISOString() },
      ],
    }));
  }, [setCampaign]);

  const generateAngles = async () => {
    const result = await callSSE('/api/generate/angles', { campaignId: campaign.id, productProfile });
    if (result) addGeneration('angles', result.data, result.generationId);
  };

  const generateScripts = async () => {
    const selected = selectedAngles.map(i => angles[i]).filter(Boolean);
    if (!selected.length) { alert('Please select at least one angle first.'); return; }
    const result = await callSSE('/api/generate/scripts', {
      campaignId: campaign.id, productProfile, selectedAngles: selected, duration: 30, platform: 'tiktok',
    });
    if (result) addGeneration('scripts', result.data, result.generationId);
  };

  const generateHooks = async () => {
    const result = await callSSE('/api/generate/hooks', { campaignId: campaign.id, productProfile });
    if (result) addGeneration('hooks', result.data, result.generationId);
  };

  const generateStoryboard = async () => {
    if (!scripts.length) { alert('Generate scripts first.'); return; }
    const result = await callSSE('/api/generate/storyboard', { campaignId: campaign.id, scripts });
    if (result) addGeneration('storyboard', result.data, result.generationId);
  };

  const generateUGC = async () => {
    if (!scripts.length) { alert('Generate scripts first.'); return; }
    const result = await callSSE('/api/generate/ugc', { campaignId: campaign.id, productProfile, scripts });
    if (result) addGeneration('ugc', result.data, result.generationId);
  };

  const toggleAngle = (index) => {
    setSelectedAngles(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const MAX_STEP = 8;

  return (
    <div>
      <GenerationProgress visible={generating} streamText={streamText} />

      {currentStep === 1 && (
        <AngleCards
          angles={angles}
          selectedAngles={selectedAngles}
          onToggleSelect={toggleAngle}
          onGenerate={generateAngles}
          generating={generating}
        />
      )}

      {currentStep === 2 && (
        <ScriptViewer
          scripts={scripts}
          onGenerate={generateScripts}
          generating={generating}
          hasAnglesSelected={selectedAngles.length > 0}
        />
      )}

      {currentStep === 3 && (
        <HookTable
          hooks={hooks}
          onGenerate={generateHooks}
          generating={generating}
          campaignId={campaign.id}
          productImageUrl={productProfile?.images?.[0]}
        />
      )}

      {currentStep === 4 && (
        <StoryboardView
          storyboards={storyboards}
          onGenerate={generateStoryboard}
          generating={generating}
          hasScripts={scripts.length > 0}
          campaignId={campaign.id}
          productImages={productProfile?.images || []}
          onGoToVideos={() => setCurrentStep(5)}
        />
      )}

      {currentStep === 5 && (
        <VideoGenerator
          storyboards={storyboards}
          campaignId={campaign.id}
          productProfile={productProfile}
        />
      )}

      {currentStep === 6 && (
        <VideoGallery campaignId={campaign.id} />
      )}

      {currentStep === 7 && (
        <UGCBriefs
          briefs={ugcBriefs}
          onGenerate={generateUGC}
          generating={generating}
          hasScripts={scripts.length > 0}
        />
      )}

      {currentStep === 8 && (
        <ExportPanel
          campaignId={campaign.id}
          campaignName={campaign.product_name}
        />
      )}

      {/* Step navigation */}
      <div className="flex justify-between mt-8 pt-5 border-t border-white/5">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep <= 1}
          className="btn-ghost disabled:opacity-20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(MAX_STEP, currentStep + 1))}
          disabled={currentStep >= MAX_STEP}
          className="btn-primary disabled:opacity-20"
        >
          Next Step
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </button>
      </div>
    </div>
  );
}
