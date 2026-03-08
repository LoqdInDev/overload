import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { postJSON, fetchJSON, API_BASE } from '../../../lib/api';

const ARCHETYPES = [
  {
    id: 'talking-head',
    icon: '🗣️',
    label: 'Talking Head Review',
    sub: 'Person speaks to camera — trust, testimonials, reviews',
    scenes: [
      { label: 'Hook', duration: 5, visual: 'Person holds product directly to camera, close-up face, genuine excitement. Stop-scroll energy.', vo: 'Hook line — grab attention in 3 seconds.' },
      { label: 'Story', duration: 8, visual: 'Person gestures and speaks naturally, medium shot, relaxed home or lifestyle background.', vo: 'The problem they had before finding this product.' },
      { label: 'Demo', duration: 8, visual: 'Hands show product features, close-up detail shots highlighting the key benefit.', vo: "Here's how it works and why it's different." },
      { label: 'CTA', duration: 5, visual: 'Person smiles directly at camera, holds product prominently and confidently.', vo: '"Link in bio" — offer or CTA.' },
    ],
  },
  {
    id: 'unboxing',
    icon: '📦',
    label: 'Unboxing Journey',
    sub: 'Package → opening → reveal — ideal for new products',
    scenes: [
      { label: 'Package Arrives', duration: 5, visual: 'Branded package on a clean surface, hands approach from above with anticipation.', vo: 'It finally arrived!' },
      { label: 'Opening', duration: 8, visual: 'Close-up hands carefully opening box flaps, tissue paper and brand details visible.', vo: 'Oh my god, the packaging alone…' },
      { label: 'Reveal', duration: 8, visual: 'Product lifted from box into frame, clean background, golden light or neutral studio.', vo: 'First impression: absolutely gorgeous.' },
      { label: 'First Use', duration: 5, visual: 'Hands interact naturally with product in an everyday, authentic setting.', vo: 'And it actually feels amazing.' },
    ],
  },
  {
    id: 'before-after',
    icon: '✨',
    label: 'Before / After',
    sub: 'Problem → discovery → transformation — beauty, fitness, cleaning',
    scenes: [
      { label: 'Before — Problem', duration: 8, visual: 'Scene clearly shows the struggle or pain point, relatable real-life setting.', vo: 'I was so frustrated with…' },
      { label: 'Discovery', duration: 5, visual: 'Product enters the frame dramatically. Hands hold it up with relief or excitement.', vo: 'Then I found this.' },
      { label: 'After — Result', duration: 8, visual: 'Transformed outcome shown clearly — confident, happy, clean, or improved result.', vo: 'After just X days…' },
      { label: 'CTA', duration: 5, visual: 'Direct camera address with product held prominently. Warm, credible energy.', vo: 'You seriously need to try this.' },
    ],
  },
  {
    id: 'lifestyle',
    icon: '🌿',
    label: 'Lifestyle Vibes',
    sub: 'No talking — pure aspiration, atmosphere, and product beauty',
    scenes: [
      { label: 'Establishing', duration: 5, visual: 'Aspirational wide shot — morning light, golden hour, or clean workspace before product appears.', vo: '' },
      { label: 'Integration', duration: 8, visual: 'Product used naturally and candidly within the lifestyle scene, authentic and unposed.', vo: '' },
      { label: 'Close-Up', duration: 5, visual: 'Macro or detail shot of product — texture, craftsmanship, or key visual detail in sharp focus.', vo: '' },
      { label: 'Vibe Shot', duration: 5, visual: 'Cinematic wide shot with product as the visual hero, natural light, beautiful depth of field.', vo: '' },
    ],
  },
  {
    id: 'demo',
    icon: '🎯',
    label: 'Product Demo',
    sub: 'Feature by feature — tech, tools, functional products',
    scenes: [
      { label: 'Tease', duration: 5, visual: 'Product partially obscured, hands slowly bring it into frame building anticipation.', vo: 'Watch what this actually does.' },
      { label: 'Feature 1', duration: 8, visual: 'Close-up confident demonstration of the main feature. Hands interact clearly and precisely.', vo: 'First — it does this.' },
      { label: 'Feature 2', duration: 8, visual: 'Second key feature demonstrated from a different angle or setting. Hands show detail.', vo: 'But what really got me was…' },
      { label: 'Hero Shot', duration: 5, visual: 'Full product hero shot — perfect lighting, clean background, product as the undeniable star.', vo: 'This is the one.' },
    ],
  },
];

const MOOD_TAGS = ['Bold', 'Elegant', 'Raw/Authentic', 'Playful', 'Cinematic', 'Minimal'];
const RATIOS = [
  { value: '9:16', label: '9:16', sub: 'TikTok' },
  { value: '1:1', label: '1:1', sub: 'Instagram' },
  { value: '16:9', label: '16:9', sub: 'YouTube' },
];
const STEP_LABELS = ['Product', 'Video Type', 'Scenes', 'Settings', 'Results'];

function buildScenePrompt(scene, productName, moods) {
  const moodStr = moods.length ? ` ${moods.join(', ')} mood.` : '';
  const productStr = productName ? ` Product: ${productName}.` : '';
  return `${scene.visual}${moodStr}${productStr} Cinematic, professional quality, short-form social media video.`.trim();
}

export default function UGCVideoStudio({ image, onClose }) {
  const { dark } = useTheme();
  const [step, setStep] = useState(1);

  // Step 1
  const [productName, setProductName] = useState('');
  // Step 2
  const [archetypeId, setArchetypeId] = useState('');
  // Step 3 — editable scenes
  const [scenes, setScenes] = useState([]);
  // Step 4
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [moods, setMoods] = useState([]);
  // Step 5 — per-scene generation state
  const [sceneGenerating, setSceneGenerating] = useState({});
  const [sceneResults, setSceneResults] = useState({});
  const [sceneErrors, setSceneErrors] = useState({});
  const pollRefs = useRef({});

  useEffect(() => {
    return () => { Object.values(pollRefs.current).forEach(clearInterval); };
  }, []);

  const toggleMood = (m) => setMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const selectArchetype = (id) => {
    setArchetypeId(id);
    const arch = ARCHETYPES.find(a => a.id === id);
    if (arch) setScenes(arch.scenes.map(s => ({ ...s })));
  };

  const updateScene = (i, field, value) =>
    setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const removeScene = (i) => setScenes(prev => prev.filter((_, idx) => idx !== i));

  const addScene = () => setScenes(prev => [
    ...prev,
    { label: `Scene ${prev.length + 1}`, duration: 5, visual: '', vo: '' },
  ]);

  const pollScene = (jobId, i) => {
    let polls = 0;
    if (pollRefs.current[i]) clearInterval(pollRefs.current[i]);
    pollRefs.current[i] = setInterval(async () => {
      polls++;
      if (polls > 80) {
        clearInterval(pollRefs.current[i]);
        setSceneErrors(prev => ({ ...prev, [i]: 'Timed out. Try regenerating this scene.' }));
        setSceneGenerating(prev => ({ ...prev, [i]: false }));
        return;
      }
      try {
        const job = await fetchJSON(`/api/video/status/${jobId}`);
        if (job.status === 'completed') {
          clearInterval(pollRefs.current[i]);
          setSceneResults(prev => ({ ...prev, [i]: job.result }));
          setSceneGenerating(prev => ({ ...prev, [i]: false }));
        } else if (job.status === 'failed') {
          clearInterval(pollRefs.current[i]);
          setSceneErrors(prev => ({ ...prev, [i]: job.result?.error || 'Generation failed.' }));
          setSceneGenerating(prev => ({ ...prev, [i]: false }));
        }
      } catch {}
    }, 3000);
  };

  const fireScene = async (scene, i) => {
    setSceneGenerating(prev => ({ ...prev, [i]: true }));
    setSceneErrors(prev => ({ ...prev, [i]: null }));
    try {
      const { jobId } = await postJSON('/api/video/generate-quick', {
        campaignId: 'ugc-studio',
        hookText: buildScenePrompt(scene, productName, moods),
        productImageUrl: image.url,
        duration: scene.duration,
        aspectRatio,
      });
      pollScene(jobId, i);
    } catch (e) {
      setSceneErrors(prev => ({ ...prev, [i]: e.message || 'Failed to start.' }));
      setSceneGenerating(prev => ({ ...prev, [i]: false }));
    }
  };

  const generateAll = async () => {
    setSceneResults({});
    setSceneErrors({});
    Object.values(pollRefs.current).forEach(clearInterval);
    pollRefs.current = {};
    const genMap = {};
    scenes.forEach((_, i) => { genMap[i] = true; });
    setSceneGenerating(genMap);
    setStep(5);
    for (let i = 0; i < scenes.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 3000));
      fireScene(scenes[i], i);
    }
  };

  const regenerateScene = (i) => {
    setSceneResults(prev => { const n = { ...prev }; delete n[i]; return n; });
    fireScene(scenes[i], i);
  };

  // Theme tokens
  const bg = dark ? 'rgba(5,5,8,0.97)' : 'rgba(245,240,232,0.97)';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = dark ? 'rgba(255,255,255,0.07)' : '#e8e0d4';
  const accent = dark ? '#8b5cf6' : '#C45D3E';
  const accentBg = dark ? 'rgba(139,92,246,0.12)' : 'rgba(196,93,62,0.08)';
  const accentBorder = dark ? 'rgba(139,92,246,0.25)' : 'rgba(196,93,62,0.2)';
  const textPrimary = dark ? '#f1f5f9' : '#332F2B';
  const textSecondary = dark ? '#94a3b8' : '#94908A';
  const inputCls = dark
    ? 'w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white/[0.04] border border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-violet-500/40 transition-colors'
    : 'w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white border border-[#e8e0d4] text-[#332F2B] placeholder-[#94908A] focus:border-[#C45D3E]/30 transition-colors';
  const btnPrimary = {
    background: dark ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#C45D3E',
    boxShadow: dark ? '0 4px 16px -4px rgba(139,92,246,0.35)' : '0 4px 16px -4px rgba(196,93,62,0.3)',
  };

  const anyGenerating = Object.values(sceneGenerating).some(Boolean);
  const completedCount = Object.values(sceneResults).length;
  const totalScenes = scenes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden animate-fade-in"
        style={{ background: bg, border: `1px solid ${border}`, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>UGC Video Studio</h2>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
              {step === 5
                ? anyGenerating
                  ? `Generating… ${completedCount} of ${totalScenes} scenes ready`
                  : `${completedCount} of ${totalScenes} scenes complete`
                : `Step ${step} of 5 — ${STEP_LABELS[step - 1]}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className="rounded-full transition-all duration-300"
                  style={{
                    width: s === step ? 18 : 6,
                    height: 6,
                    background: s <= step ? accent : (dark ? 'rgba(255,255,255,0.1)' : '#e8e0d4'),
                    opacity: s < step ? 0.5 : 1,
                  }} />
              ))}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <svg className="w-4 h-4" fill="none" stroke={textSecondary} viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1 — Product */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-5 items-start">
                <img src={image.url} alt={image.alt || 'Creative image'}
                  className="w-36 h-36 object-cover rounded-xl flex-shrink-0"
                  style={{ border: `1px solid ${accentBorder}` }} />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>
                      This image is your video foundation.
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                      WaveSpeed will animate it scene-by-scene based on your instructions. You'll get 4 individual clips — ready to edit in CapCut or Premiere.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: textSecondary }}>
                      Product name <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      placeholder="e.g. Matte Lip Kit, Wireless Earbuds, Supplement…"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-4 grid grid-cols-2 gap-y-2.5 gap-x-4"
                style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                {[
                  { icon: '🎬', text: '4 individual video clips' },
                  { icon: '⚡', text: 'Scenes fire one after another' },
                  { icon: '✂️', text: 'Ready to edit in CapCut' },
                  { icon: '⬇️', text: 'Download each scene separately' },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs" style={{ color: textSecondary }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — Archetype */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm font-semibold" style={{ color: textPrimary }}>What type of UGC video?</p>
              <div className="space-y-2">
                {ARCHETYPES.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => selectArchetype(a.id)}
                    className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: archetypeId === a.id ? accentBg : card,
                      border: `1px solid ${archetypeId === a.id ? accent : border}`,
                    }}>
                    <span className="text-2xl flex-shrink-0 mt-0.5">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: textPrimary }}>{a.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{a.sub}</p>
                    </div>
                    {archetypeId === a.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: accent }}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — Scene Builder */}
          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: textPrimary }}>
                  Scene Builder
                  <span className="ml-2 text-xs font-normal" style={{ color: textSecondary }}>
                    {scenes.length} scenes · {scenes.reduce((t, s) => t + s.duration, 0)}s total
                  </span>
                </p>
                <span className="text-xs" style={{ color: textSecondary }}>Edit each scene below</span>
              </div>

              {scenes.map((scene, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3"
                  style={{ background: card, border: `1px solid ${border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accent }}>
                        {i + 1}
                      </div>
                      <input
                        value={scene.label}
                        onChange={e => updateScene(i, 'label', e.target.value)}
                        className="text-sm font-semibold bg-transparent border-none outline-none"
                        style={{ color: textPrimary, width: 120 }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[5, 8].map(d => (
                          <button key={d} type="button"
                            onClick={() => updateScene(i, 'duration', d)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all"
                            style={{
                              background: scene.duration === d ? accentBg : 'transparent',
                              border: `1px solid ${scene.duration === d ? accentBorder : border}`,
                              color: scene.duration === d ? accent : textSecondary,
                            }}>
                            {d}s
                          </button>
                        ))}
                      </div>
                      {scenes.length > 2 && (
                        <button type="button" onClick={() => removeScene(i)}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold mb-1 tracking-wide"
                      style={{ color: textSecondary }}>VISUAL DIRECTION</label>
                    <textarea
                      value={scene.visual}
                      onChange={e => updateScene(i, 'visual', e.target.value)}
                      rows={2}
                      placeholder="Describe what the camera sees and what's happening…"
                      className={inputCls + ' resize-none text-xs'}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold mb-1 tracking-wide"
                      style={{ color: textSecondary }}>
                      VOICEOVER / ON-SCREEN TEXT <span className="font-normal opacity-50">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={scene.vo}
                      onChange={e => updateScene(i, 'vo', e.target.value)}
                      placeholder="What they say or what appears on screen…"
                      className={inputCls + ' text-xs'}
                    />
                  </div>
                </div>
              ))}

              {scenes.length < 6 && (
                <button type="button" onClick={addScene}
                  className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ border: `1px dashed ${border}`, color: textSecondary }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Scene
                </button>
              )}
            </div>
          )}

          {/* STEP 4 — Tone & Settings */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-medium mb-3" style={{ color: textSecondary }}>Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {RATIOS.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setAspectRatio(r.value)}
                      className="py-3 rounded-xl transition-all duration-150 text-center"
                      style={{
                        background: aspectRatio === r.value ? accentBg : card,
                        border: `1px solid ${aspectRatio === r.value ? accent : border}`,
                      }}>
                      <div className="text-sm font-bold"
                        style={{ color: aspectRatio === r.value ? accent : textPrimary }}>
                        {r.label}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: textSecondary }}>{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: textSecondary }}>
                  Mood / Tone <span className="font-normal opacity-60">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_TAGS.map(m => (
                    <button key={m} type="button"
                      onClick={() => toggleMood(m)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                      style={{
                        background: moods.includes(m) ? accentBg : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                        border: `1px solid ${moods.includes(m) ? accentBorder : border}`,
                        color: moods.includes(m) ? accent : textSecondary,
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Package summary */}
              <div className="rounded-xl p-4 space-y-2.5"
                style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                <p className="text-xs font-semibold" style={{ color: accent }}>Your video package — {scenes.reduce((t, s) => t + s.duration, 0)}s total</p>
                <div className="space-y-1.5">
                  {scenes.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: accent, color: '#fff' }}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-medium flex-1" style={{ color: textPrimary }}>{s.label}</span>
                      <span className="text-[10px]" style={{ color: textSecondary }}>{s.duration}s · {aspectRatio}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — Results */}
          {step === 5 && (
            <div className="space-y-3 animate-fade-in">
              {anyGenerating && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-1"
                  style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                  <div className="flex gap-1">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: accent, animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: accent }}>
                    Generating scenes one by one… ~60–90s per clip
                  </span>
                </div>
              )}

              {scenes.map((scene, i) => {
                const result = sceneResults[i];
                const err = sceneErrors[i];
                const isGen = sceneGenerating[i];

                return (
                  <div key={i} className="rounded-xl overflow-hidden transition-all duration-300"
                    style={{ border: `1px solid ${result ? accentBorder : border}` }}>
                    {/* Scene header bar */}
                    <div className="flex items-center justify-between px-4 py-2.5"
                      style={{
                        background: result ? accentBg : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                        borderBottom: `1px solid ${border}`,
                      }}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{
                            background: result ? accent : isGen ? (dark ? 'rgba(255,255,255,0.15)' : '#d4c4b4') : (dark ? 'rgba(255,255,255,0.08)' : '#e8e0d4'),
                            color: result ? '#fff' : textSecondary,
                          }}>
                          {result ? '✓' : i + 1}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: textPrimary }}>{scene.label}</span>
                        <span className="text-[10px]" style={{ color: textSecondary }}>{scene.duration}s · {aspectRatio}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {result && (
                          <a
                            href={`${API_BASE}${result.localPath}`}
                            download={`scene_${String(i + 1).padStart(2, '0')}.mp4`}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                            style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accent }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Download
                          </a>
                        )}
                        {(result || err) && (
                          <button type="button"
                            onClick={() => regenerateScene(i)}
                            disabled={isGen}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: textSecondary, border: `1px solid ${border}` }}>
                            Retry
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Loading */}
                    {isGen && !result && (
                      <div className="flex items-center justify-center gap-3 py-8"
                        style={{ background: dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                        <div className="flex gap-1.5">
                          {[0, 150, 300].map(delay => (
                            <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: accent, animationDelay: `${delay}ms` }} />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: textSecondary }}>Generating scene {i + 1}…</span>
                      </div>
                    )}

                    {/* Error */}
                    {err && !isGen && (
                      <div className="flex items-center gap-2 px-4 py-3 text-xs"
                        style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171' }}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        {err}
                      </div>
                    )}

                    {/* Video */}
                    {result && (
                      <video
                        src={`${API_BASE}${result.localPath}`}
                        controls
                        className="w-full bg-black"
                        style={{ maxHeight: 220 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer Nav ── */}
        {step < 5 && (
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
            style={{ borderTop: `1px solid ${border}` }}>
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: textSecondary }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 2 && !archetypeId}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={btnPrimary}>
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={generateAll}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={btnPrimary}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Generate All {scenes.length} Scenes
              </button>
            )}
          </div>
        )}

        {/* Step 5 footer */}
        {step === 5 && (
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
            style={{ borderTop: `1px solid ${border}` }}>
            <button
              onClick={() => { setStep(4); setSceneResults({}); setSceneErrors({}); setSceneGenerating({}); }}
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: textSecondary }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Change Settings
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: textPrimary, border: `1px solid ${border}` }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
