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

// ── Visual prompt builder options ──────────────────────────────────
const BUILDER_OPTIONS = {
  camera: [
    { value: 'close-up', label: 'Close-Up', prompt: 'tight close-up shot' },
    { value: 'medium', label: 'Medium Shot', prompt: 'medium shot' },
    { value: 'wide', label: 'Wide Shot', prompt: 'wide establishing shot' },
    { value: 'pov', label: 'POV', prompt: 'POV first-person perspective' },
    { value: 'over-shoulder', label: 'Over-Shoulder', prompt: 'over-the-shoulder shot' },
  ],
  setting: [
    { value: 'studio', label: 'Studio', prompt: 'clean studio background' },
    { value: 'home', label: 'Home', prompt: 'cozy home environment' },
    { value: 'urban', label: 'Urban', prompt: 'urban street setting' },
    { value: 'outdoors', label: 'Outdoors', prompt: 'natural outdoor setting' },
    { value: 'cafe', label: 'Café', prompt: 'warm coffee shop interior' },
    { value: 'office', label: 'Office', prompt: 'modern office workspace' },
  ],
  lighting: [
    { value: 'natural', label: 'Natural', prompt: 'soft natural daylight' },
    { value: 'golden-hour', label: 'Golden Hour', prompt: 'warm golden hour sunlight' },
    { value: 'dramatic', label: 'Dramatic', prompt: 'dramatic high-contrast lighting' },
    { value: 'studio-lit', label: 'Studio Lit', prompt: 'professional studio lighting' },
    { value: 'backlit', label: 'Backlit', prompt: 'beautiful backlit glow' },
  ],
  subject: [
    { value: 'model', label: 'Person', prompt: 'person as main subject' },
    { value: 'product', label: 'Product', prompt: 'product as hero of the shot' },
    { value: 'both', label: 'Both', prompt: 'person and product together in frame' },
  ],
};

const BUILDER_LABELS = {
  camera: 'Camera',
  setting: 'Setting',
  lighting: 'Lighting',
  subject: 'Subject',
};

function composeVisual(archBase, builder) {
  const extras = [];
  for (const key of ['camera', 'setting', 'lighting', 'subject']) {
    if (builder[key]) {
      const opt = BUILDER_OPTIONS[key].find(o => o.value === builder[key]);
      if (opt) extras.push(opt.prompt);
    }
  }
  if (!extras.length) return archBase;
  return `${archBase} ${extras.join(', ')}.`.replace(/\.\./, '.').trim();
}

function emptyBuilder() {
  return { camera: null, setting: null, lighting: null, subject: null };
}

function sceneFromArchetype(s) {
  return { ...s, archBase: s.visual, builder: emptyBuilder(), manualMode: false, imgSrc: 'model', enableAudio: false };
}

function buildScenePrompt(scene, productName, moods, withAudio = false) {
  const moodStr = moods.length ? ` ${moods.join(', ')} mood.` : '';
  const productStr = productName ? ` Product: ${productName}.` : '';
  const voStr = withAudio && scene.vo ? ` A person says "${scene.vo}".` : '';
  const lipStr = scene.vo ? ' Person speaking naturally to camera, mouth and lips moving.' : '';
  return `${scene.visual}${lipStr}${voStr}${moodStr}${productStr} Cinematic, professional quality, short-form social media video.`.trim();
}

// ── Sub-component: chip row for builder ───────────────────────────
function ChipRow({ label, options, value, onSelect, accent, accentBg, accentBorder, border, textSecondary, dark }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide mb-1.5" style={{ color: textSecondary }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button key={opt.value} type="button"
              onClick={() => onSelect(active ? null : opt.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150"
              style={{
                background: active ? accentBg : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                border: `1px solid ${active ? accentBorder : border}`,
                color: active ? accent : textSecondary,
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function UGCVideoStudio({ image, onClose, onImageClear, inline = false }) {
  const { dark } = useTheme();
  const [step, setStep] = useState(1);

  // Step 1
  const [productName, setProductName] = useState('');
  const [productPhoto, setProductPhoto] = useState(null);
  const [localImage, setLocalImage] = useState(null); // image uploaded directly in inline mode
  const productPhotoRef = useRef(null);
  const localImageRef = useRef(null);
  // Step 2
  const [archetypeId, setArchetypeId] = useState('');
  // Step 3 — editable scenes (now include builder + archBase + manualMode)
  const [scenes, setScenes] = useState([]);
  // Step 4
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [moods, setMoods] = useState([]);
  const [voiceId, setVoiceId] = useState('Calm_Woman');
  // Step 5 — per-scene generation state
  const [sceneGenerating, setSceneGenerating] = useState({});
  const [sceneResults, setSceneResults] = useState({});
  const [sceneErrors, setSceneErrors] = useState({});
  const [sceneJobIds, setSceneJobIds] = useState({});
  const [sceneLipsync, setSceneLipsync] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  // The effective image to use (pre-loaded prop OR locally uploaded)
  const activeImage = image || localImage;

  const resetStudio = () => {
    setStep(1);
    setProductName('');
    setProductPhoto(null);
    setLocalImage(null);
    setArchetypeId('');
    setScenes([]);
    setAspectRatio('9:16');
    setMoods([]);
    setVoiceId('Calm_Woman');
    setSceneResults({});
    setSceneErrors({});
    setSceneGenerating({});
    setSceneLipsync({});
    setGeneratingAll(false);
    if (onImageClear) onImageClear();
  };

  const toggleMood = (m) => setMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleProductPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProductPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleLocalImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLocalImage({ url: ev.target.result, alt: file.name });
    reader.readAsDataURL(file);
  };

  const selectArchetype = (id) => {
    setArchetypeId(id);
    const arch = ARCHETYPES.find(a => a.id === id);
    if (arch) setScenes(arch.scenes.map(sceneFromArchetype));
  };

  const updateScene = (i, field, value) =>
    setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const updateBuilder = (i, key, value) => {
    setScenes(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      const newBuilder = { ...s.builder, [key]: value };
      const newVisual = s.manualMode ? s.visual : composeVisual(s.archBase, newBuilder);
      return { ...s, builder: newBuilder, visual: newVisual };
    }));
  };

  const toggleManualMode = (i) => {
    setScenes(prev => prev.map((s, idx) => {
      if (idx !== i) return s;
      if (!s.manualMode) return { ...s, manualMode: true };
      // Switching back to builder: recompose from builder state
      return { ...s, manualMode: false, visual: composeVisual(s.archBase, s.builder) };
    }));
  };

  const removeScene = (i) => setScenes(prev => prev.filter((_, idx) => idx !== i));

  const addScene = () => setScenes(prev => [
    ...prev,
    { label: `Scene ${prev.length + 1}`, duration: 5, visual: '', vo: '', imgSrc: 'model', archBase: '', builder: emptyBuilder(), manualMode: false, enableAudio: false },
  ]);

  const pollSceneAsync = async (jobId, i) => {
    for (let polls = 0; polls <= 200; polls++) {
      await new Promise(r => setTimeout(r, 3000));
      if (!activeRef.current) return;
      try {
        const job = await fetchJSON(`/api/video/status/${jobId}`);
        if (job.status === 'completed') {
          setSceneResults(prev => ({ ...prev, [i]: job.result }));
          setSceneGenerating(prev => ({ ...prev, [i]: false }));
          return;
        }
        if (job.status === 'failed') {
          setSceneErrors(prev => ({ ...prev, [i]: job.result?.error || 'Generation failed.' }));
          setSceneGenerating(prev => ({ ...prev, [i]: false }));
          return;
        }
      } catch { /* transient — keep polling */ }
    }
    setSceneErrors(prev => ({ ...prev, [i]: 'Timed out after 10 minutes. Try regenerating this scene.' }));
    setSceneGenerating(prev => ({ ...prev, [i]: false }));
  };

  const fireScene = async (scene, i) => {
    setSceneGenerating(prev => ({ ...prev, [i]: true }));
    setSceneErrors(prev => ({ ...prev, [i]: null }));
    try {
      const sceneImage = scene.imgSrc === 'product' && productPhoto
        ? productPhoto
        : (activeImage?.url || null);
      const { jobId } = await postJSON('/api/video/generate-quick', {
        hookText: buildScenePrompt(scene, productName, moods, scene.enableAudio),
        productImageUrl: sceneImage,
        duration: scene.duration,
        aspectRatio,
        sound: scene.enableAudio,
      });
      setSceneJobIds(prev => ({ ...prev, [i]: jobId }));
      await pollSceneAsync(jobId, i);
    } catch (e) {
      setSceneErrors(prev => ({ ...prev, [i]: e.message || 'Failed to start.' }));
      setSceneGenerating(prev => ({ ...prev, [i]: false }));
    }
  };

  const generateAll = async () => {
    setSceneResults({});
    setSceneErrors({});
    setSceneLipsync({});
    setSceneGenerating({});
    setGeneratingAll(true);
    setStep(5);
    for (let i = 0; i < scenes.length; i++) {
      if (!activeRef.current) break;
      await fireScene(scenes[i], i);
    }
    setGeneratingAll(false);
  };

  const regenerateScene = (i) => {
    setSceneResults(prev => { const n = { ...prev }; delete n[i]; return n; });
    setSceneErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
    setSceneLipsync(prev => { const n = { ...prev }; delete n[i]; return n; });
    fireScene(scenes[i], i);
  };

  const recoverScene = async (i) => {
    const jobId = sceneJobIds[i];
    if (!jobId) return;
    setSceneGenerating(prev => ({ ...prev, [i]: true }));
    setSceneErrors(prev => ({ ...prev, [i]: null }));
    try {
      const res = await postJSON(`/api/video/recover/${jobId}`, {});
      if (res.success && res.recovered) {
        setSceneResults(prev => ({ ...prev, [i]: res.result }));
      } else {
        setSceneErrors(prev => ({ ...prev, [i]: res.error || 'Video not ready yet. Try again in a minute.' }));
      }
    } catch (e) {
      setSceneErrors(prev => ({ ...prev, [i]: e.message || 'Recovery failed.' }));
    }
    setSceneGenerating(prev => ({ ...prev, [i]: false }));
  };

  const handleLipsync = async (i) => {
    const videoResult = sceneResults[i];
    const scene = scenes[i];
    setSceneLipsync(prev => ({ ...prev, [i]: { status: 'loading', result: null, error: null } }));
    try {
      const res = await postJSON('/api/video/lipsync', {
        voText: scene.vo,
        videoUrl: videoResult.videoUrl || null,
        localPath: videoResult.localPath || null,
        voiceId,
      });
      if (res.success) {
        setSceneLipsync(prev => ({ ...prev, [i]: { status: 'done', result: res, error: null } }));
      } else {
        setSceneLipsync(prev => ({ ...prev, [i]: { status: 'error', result: null, error: res.error || 'Lip-sync failed' } }));
      }
    } catch (e) {
      setSceneLipsync(prev => ({ ...prev, [i]: { status: 'error', result: null, error: e.message } }));
    }
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

  // ── Inner content (same for both modal and inline) ────────────────
  const headerEl = (
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
        {/* In modal mode show X button; in inline mode show nothing */}
        {!inline && (
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            <svg className="w-4 h-4" fill="none" stroke={textSecondary} viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  const bodyEl = (
    <div className="flex-1 overflow-y-auto p-6">

      {/* STEP 1 — Product */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in" style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Image display / upload */}
          {activeImage ? (
            <div className="flex gap-5 items-start">
              <img src={activeImage.url} alt={activeImage.alt || 'Creative image'}
                className="w-36 h-36 object-cover rounded-xl flex-shrink-0"
                style={{ border: `1px solid ${accentBorder}` }} />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>
                    This image is your video foundation.
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                    WaveSpeed will animate it scene-by-scene based on your instructions. You'll get individual clips — ready to edit in CapCut or Premiere.
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
                    placeholder="e.g. Matte Lip Kit, Wireless Earbuds…"
                    className={inputCls}
                  />
                </div>
                <button type="button"
                  onClick={() => { setLocalImage(null); if (onImageClear) onImageClear(); }}
                  className="text-[10px] px-2 py-1 rounded-lg transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
                  Use a different image
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: textPrimary }}>Upload your image</p>
              <p className="text-xs" style={{ color: textSecondary }}>
                Add a model or product photo — WaveSpeed will animate it into video scenes.
              </p>
              <button type="button" onClick={() => localImageRef.current?.click()}
                className="w-full py-8 rounded-xl text-sm font-medium flex flex-col items-center justify-center gap-3 transition-all hover:opacity-80"
                style={{ border: `2px dashed ${border}`, color: textSecondary }}>
                <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Click to upload model or product photo
              </button>
              <input ref={localImageRef} type="file" accept="image/*" className="hidden"
                onChange={handleLocalImageUpload} />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: textSecondary }}>
                  Product name <span className="font-normal opacity-60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="e.g. Matte Lip Kit, Wireless Earbuds…"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Optional product photo (secondary image for product-only scenes) */}
          {activeImage && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: textSecondary }}>
                Product photo <span className="font-normal opacity-60">(optional — for product-only scenes)</span>
              </label>
              {productPhoto ? (
                <div className="flex items-center gap-3">
                  <img src={productPhoto} alt="Product" className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    style={{ border: `1px solid ${accentBorder}` }} />
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1" style={{ color: textPrimary }}>Product photo added</p>
                    <p className="text-[10px] mb-2" style={{ color: textSecondary }}>Assign scenes to this in the Scene Builder</p>
                    <button type="button" onClick={() => setProductPhoto(null)}
                      className="text-[10px] px-2 py-1 rounded-lg transition-all"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => productPhotoRef.current?.click()}
                  className="w-full py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ border: `1px dashed ${border}`, color: textSecondary }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Upload product photo
                </button>
              )}
              <input ref={productPhotoRef} type="file" accept="image/*" className="hidden"
                onChange={handleProductPhotoUpload} />
            </div>
          )}

          <div className="rounded-xl p-4 grid grid-cols-2 gap-y-2.5 gap-x-4"
            style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
            {[
              { icon: '🎬', text: 'Multiple video clips' },
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
        <div className="space-y-4 animate-fade-in" style={{ maxWidth: 520, margin: '0 auto' }}>
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
            <div key={i} className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${border}` }}>
              {/* Scene header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ background: card }}>
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
                  <button type="button"
                    onClick={() => updateScene(i, 'enableAudio', !scene.enableAudio)}
                    title={scene.enableAudio ? 'Audio ON (Kling v2.6) — click to make silent' : 'Silent — click to enable native audio'}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all"
                    style={{
                      background: scene.enableAudio ? accentBg : 'transparent',
                      border: `1px solid ${scene.enableAudio ? accentBorder : border}`,
                      color: scene.enableAudio ? accent : textSecondary,
                    }}>
                    {scene.enableAudio ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M19.07 4.93a10 10 0 010 14.14" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                    {scene.enableAudio ? 'Audio' : 'Silent'}
                  </button>
                  {scenes.length > 1 && (
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

              {/* Visual Direction + Builder */}
              <div className="px-4 py-3 space-y-3"
                style={{ borderTop: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)' }}>

                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold tracking-wide" style={{ color: textSecondary }}>
                    VISUAL DIRECTION
                  </label>
                  {scene.manualMode && (
                    <button type="button" onClick={() => toggleManualMode(i)}
                      className="text-[10px] font-medium transition-colors"
                      style={{ color: textSecondary }}>
                      ↺ Reset from builder
                    </button>
                  )}
                </div>

                {/* Builder chips — always visible */}
                <div className="space-y-2.5 pb-2">
                  {Object.entries(BUILDER_OPTIONS).map(([key, options]) => (
                    <ChipRow
                      key={key}
                      label={BUILDER_LABELS[key]}
                      options={options}
                      value={scene.builder[key]}
                      onSelect={(val) => updateBuilder(i, key, val)}
                      accent={accent}
                      accentBg={accentBg}
                      accentBorder={accentBorder}
                      border={border}
                      textSecondary={textSecondary}
                      dark={dark}
                    />
                  ))}
                </div>

                {/* Visual prompt textarea — always visible, editable */}
                <textarea
                  value={scene.visual}
                  onChange={e => setScenes(prev => prev.map((s, idx) =>
                    idx === i ? { ...s, visual: e.target.value, manualMode: true } : s
                  ))}
                  rows={3}
                  placeholder="Describe what the camera sees and what's happening…"
                  className={inputCls + ' resize-none text-xs'}
                />

                {/* Voiceover */}
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
        <div className="space-y-5 animate-fade-in" style={{ maxWidth: 520, margin: '0 auto' }}>
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

          {/* Voice picker — only show when some scenes have audio and others are silent (lip-sync applies to silent ones) */}
          {scenes.some(s => s.enableAudio) && scenes.some(s => !s.enableAudio) && <div className="rounded-xl p-4 space-y-2.5" style={{ background: card, border: `1px solid ${border}` }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: textPrimary }}>Lip-Sync Voice</p>
              <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                Used for Lip-Sync VO on silent scenes. Toggle audio per-scene in Step 3.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'Calm_Woman', label: 'Calm Woman' },
                { id: 'Calm_Man', label: 'Calm Man' },
                { id: 'Friendly_Person', label: 'Friendly' },
                { id: 'Lively_Girl', label: 'Lively Girl' },
                { id: 'Deep_Voice_Man', label: 'Deep Man' },
                { id: 'Inspirational_girl', label: 'Inspirational' },
                { id: 'Casual_Guy', label: 'Casual Guy' },
                { id: 'Determined_Man', label: 'Determined' },
                { id: 'Wise_Woman', label: 'Wise Woman' },
                { id: 'Sweet_Girl_2', label: 'Sweet Girl' },
              ].map(v => (
                <button key={v.id} type="button"
                  onClick={() => setVoiceId(v.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left transition-all"
                  style={{
                    background: voiceId === v.id ? accentBg : 'transparent',
                    border: `1px solid ${voiceId === v.id ? accentBorder : border}`,
                    color: voiceId === v.id ? accent : textSecondary,
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>}

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
                  <span className="text-[10px]" style={{ color: textSecondary }}>{s.duration}s · {aspectRatio}{s.enableAudio ? ' · 🔊' : ''}</span>
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
                Scenes generate one at a time — up to 7 min per clip. Please keep this tab open.
              </span>
            </div>
          )}

          {scenes.some(s => s.enableAudio) ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accent }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M19.07 4.93a10 10 0 010 14.14" />
              </svg>
              {scenes.every(s => s.enableAudio)
                ? 'All scenes generating with native audio (Kling v2.6).'
                : `${scenes.filter(s => s.enableAudio).length} scene(s) generating with audio — others are silent.`}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: textSecondary }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              Silent clips — add voiceover, music, or captions in CapCut or Premiere.
            </div>
          )}

          {scenes.map((scene, i) => {
            const result = sceneResults[i];
            const err = sceneErrors[i];
            const isGen = sceneGenerating[i];
            const ls = sceneLipsync[i];
            const displayResult = ls?.status === 'done' ? ls.result : result;

            return (
              <div key={i} className="rounded-xl overflow-hidden transition-all duration-300"
                style={{ border: `1px solid ${ls?.status === 'done' ? accentBorder : result ? accentBorder : border}` }}>
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
                    {scene.enableAudio && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: accentBg, color: accent }}>🔊 Audio</span>
                    )}
                    {ls?.status === 'done' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: accentBg, color: accent }}>Lip-synced</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {result && scene.vo && !scene.enableAudio && !ls && (
                      <button type="button"
                        onClick={() => handleLipsync(i)}
                        className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                        style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', border: `1px solid ${border}`, color: textSecondary }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Lip-Sync VO
                      </button>
                    )}
                    {displayResult && (displayResult.localPath || displayResult.videoUrl) && (
                      <a
                        href={displayResult.localPath ? `${API_BASE}${displayResult.localPath}` : displayResult.videoUrl}
                        target={displayResult.localPath ? undefined : '_blank'}
                        rel={displayResult.localPath ? undefined : 'noreferrer'}
                        download={displayResult.localPath ? `scene_${String(i + 1).padStart(2, '0')}${ls?.status === 'done' ? '_lipsync' : ''}.mp4` : undefined}
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

                {!isGen && !result && !err && generatingAll && (
                  <div className="flex items-center justify-center gap-2 py-8"
                    style={{ background: dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                    <span className="text-xs" style={{ color: textSecondary }}>In queue — starts after previous scene completes</span>
                  </div>
                )}

                {isGen && !result && (
                  <div className="flex items-center justify-center gap-3 py-8"
                    style={{ background: dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map(delay => (
                        <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: accent, animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: textSecondary }}>Generating scene {i + 1}… up to 7 min</span>
                  </div>
                )}

                {ls?.status === 'loading' && (
                  <div className="flex items-center gap-3 px-4 py-3 text-xs"
                    style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderTop: `1px solid ${border}` }}>
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: accent, animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span style={{ color: textSecondary }}>Generating voiceover + syncing lips… ~2 min</span>
                  </div>
                )}

                {ls?.status === 'error' && (
                  <div className="flex items-center justify-between px-4 py-2.5 text-xs gap-2"
                    style={{ background: 'rgba(239,68,68,0.06)', borderTop: `1px solid ${border}` }}>
                    <span style={{ color: '#f87171' }}>{ls.error}</span>
                    <button type="button" onClick={() => handleLipsync(i)}
                      className="text-[10px] font-medium px-2 py-1 rounded flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                      Retry
                    </button>
                  </div>
                )}

                {displayResult && (displayResult.localPath || displayResult.videoUrl) && (
                  <video
                    src={displayResult.localPath ? `${API_BASE}${displayResult.localPath}` : displayResult.videoUrl}
                    controls
                    className="w-full bg-black"
                    style={{ maxHeight: 220 }}
                  />
                )}

                {err && !isGen && (
                  <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs"
                    style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171' }}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      {err}
                    </div>
                    {sceneJobIds[i] && err.includes('imed out') && (
                      <button type="button" onClick={() => recoverScene(i)}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                        Recover
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const footerEl = (
    <>
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
              disabled={(step === 1 && !activeImage) || (step === 2 && !archetypeId) || (step === 3 && scenes.length === 0)}
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
            onClick={inline ? resetStudio : onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: textPrimary, border: `1px solid ${border}` }}>
            {inline ? 'New Video' : 'Done'}
          </button>
        </div>
      )}
    </>
  );

  // ── Inline mode: render as full-height flex column ─────────────────
  if (inline) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: bg }}>
        {headerEl}
        {bodyEl}
        {footerEl}
      </div>
    );
  }

  // ── Modal mode: fixed overlay ─────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden animate-fade-in"
        style={{ background: bg, border: `1px solid ${border}`, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        {headerEl}
        {bodyEl}
        {footerEl}
      </div>
    </div>
  );
}
