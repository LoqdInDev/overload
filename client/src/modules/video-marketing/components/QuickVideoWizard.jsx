import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { postJSON, fetchJSON, API_BASE } from '../../../lib/api';

const VIDEO_TYPES = [
  {
    id: 'product-hero',
    icon: '🎯',
    label: 'Product Hero',
    sub: 'Cinematic close-up, dramatic lighting',
    prompt: 'Cinematic close-up product showcase. Dramatic studio lighting, shallow depth of field, slow motion product reveal.',
  },
  {
    id: 'talking',
    icon: '🗣️',
    label: 'Talking Head',
    sub: 'Person speaks to camera with confidence',
    prompt: 'The person in the image looks directly into the camera and speaks with confidence and passion, as if addressing their audience.',
  },
  {
    id: 'lifestyle',
    icon: '🌿',
    label: 'Lifestyle',
    sub: 'Product in a natural aspirational setting',
    prompt: 'The subject is shown in a natural, aspirational lifestyle setting. Warm, candid atmosphere.',
  },
  {
    id: 'hands-on',
    icon: '👐',
    label: 'Hands-On Demo',
    sub: 'Hands interact with & demonstrate',
    prompt: 'Hands confidently interact with and demonstrate the product, detail-focused close-up.',
  },
  {
    id: 'custom',
    icon: '✍️',
    label: 'Custom',
    sub: 'Write your own description',
    prompt: '',
  },
];

const MOOD_TAGS = ['Bold', 'Elegant', 'Raw/Authentic', 'Playful', 'Cinematic', 'Minimal'];

const DURATIONS = [
  { value: 5, label: '5s' },
  { value: 8, label: '8s' },
  { value: 10, label: '10s' },
];

const RATIOS = [
  { value: '9:16', label: '9:16', sub: 'TikTok' },
  { value: '1:1', label: '1:1', sub: 'Instagram' },
  { value: '16:9', label: '16:9', sub: 'YouTube' },
];

function composePrompt({ videoType, description, moods, duration, aspectRatio, productName }) {
  const typeDef = VIDEO_TYPES.find(t => t.id === videoType);
  const base = typeDef?.prompt || '';
  const descPart = description.trim() ? ` ${description.trim()}.` : '';
  const moodPart = moods.length ? ` ${moods.join(', ')} mood.` : '';
  const contextPart = productName ? ` Subject: ${productName}.` : '';
  const techPart = ` Aspect ratio ${aspectRatio}. ${duration} second video. Vertical social media format.`;
  return `${base}${descPart}${moodPart}${contextPart}${techPart}`.trim();
}

export default function QuickVideoWizard({ image, onClose }) {
  const { dark } = useTheme();
  const [step, setStep] = useState(1);

  // Step 1
  const [productName, setProductName] = useState('');

  // Step 2
  const [videoType, setVideoType] = useState('product-hero');
  const [description, setDescription] = useState('');
  const [moods, setMoods] = useState([]);

  // Step 3
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [videoResult, setVideoResult] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // Auto-compose prompt when step 3 is entered or inputs change
  useEffect(() => {
    if (!promptDirty) {
      setEditedPrompt(composePrompt({ videoType, description, moods, duration, aspectRatio, productName }));
    }
  }, [videoType, description, moods, duration, aspectRatio, productName, promptDirty]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const toggleMood = (m) => setMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    setProgress('Sending to WaveSpeed AI…');
    try {
      const { jobId } = await postJSON('/api/video/generate-quick', {
        campaignId: 'creative-import',
        hookText: editedPrompt,
        productImageUrl: image.url,
      });
      setProgress('Generating your video… (this takes ~60–90s)');
      let polls = 0;
      pollRef.current = setInterval(async () => {
        polls++;
        if (polls > 60) {
          clearInterval(pollRef.current);
          setError('Timed out waiting for video. Check the Gallery tab later.');
          setGenerating(false);
          return;
        }
        try {
          const job = await fetchJSON(`/api/video/status/${jobId}`);
          if (job.status === 'completed') {
            clearInterval(pollRef.current);
            setVideoResult(job.result);
            setGenerating(false);
            setProgress('');
          } else if (job.status === 'failed') {
            clearInterval(pollRef.current);
            setError(job.result?.error || 'Video generation failed.');
            setGenerating(false);
          }
        } catch {}
      }, 3000);
    } catch (e) {
      setError(e.message || 'Failed to start generation.');
      setGenerating(false);
    }
  };

  const canNext1 = true; // product name optional
  const canNext2 = videoType !== 'custom' || description.trim().length > 0;

  const bg = dark ? 'rgba(5,5,8,0.97)' : 'rgba(245,240,232,0.97)';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = dark ? 'rgba(255,255,255,0.07)' : '#e8e0d4';
  const accent = dark ? '#8b5cf6' : '#C45D3E';
  const accentBg = dark ? 'rgba(139,92,246,0.12)' : 'rgba(196,93,62,0.08)';
  const accentBorder = dark ? 'rgba(139,92,246,0.25)' : 'rgba(196,93,62,0.2)';
  const textPrimary = dark ? '#f1f5f9' : '#332F2B';
  const textSecondary = dark ? '#94a3b8' : '#94908A';
  const inputCls = dark
    ? 'w-full rounded-xl px-4 py-3 text-sm focus:outline-none bg-white/[0.04] border border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-violet-500/40 transition-colors'
    : 'w-full rounded-xl px-4 py-3 text-sm focus:outline-none bg-white border border-[#e8e0d4] text-[#332F2B] placeholder-[#94908A] focus:border-[#C45D3E]/30 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden animate-fade-in"
        style={{ background: bg, border: `1px solid ${border}`, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>Create Video from Image</h2>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
              Step {step} of 3 — {step === 1 ? 'Your Image' : step === 2 ? 'What happens?' : 'Settings & Generate'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {[1,2,3].map(s => (
                <div key={s} className="rounded-full transition-all duration-300"
                  style={{
                    width: s === step ? 20 : 8, height: 8,
                    background: s <= step ? accent : (dark ? 'rgba(255,255,255,0.1)' : '#e8e0d4'),
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

        <div className="p-6">

          {/* ── STEP 1: Your Image ── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-5 items-start">
                <img src={image.url} alt={image.alt || 'Creative image'}
                  className="w-40 h-40 object-cover rounded-xl flex-shrink-0"
                  style={{ border: `1px solid ${accentBorder}` }} />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>
                      This image will be your video's visual foundation.
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                      WaveSpeed will animate it based on your instructions. The original look, subject, and style carry over into the video.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: textSecondary }}>
                      What is this? <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      placeholder="e.g. Double Layer Gold Bracelet, Running Shoes…"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: What happens? ── */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>What should happen in this video?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VIDEO_TYPES.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => setVideoType(t.id)}
                      className="flex items-start gap-3 p-3.5 rounded-xl text-left transition-all duration-200"
                      style={{
                        background: videoType === t.id ? accentBg : card,
                        border: `1px solid ${videoType === t.id ? accentBorder : border}`,
                        outline: videoType === t.id ? `2px solid ${accent}` : 'none',
                        outlineOffset: -1,
                      }}>
                      <span className="text-2xl flex-shrink-0 mt-0.5">{t.icon}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: textPrimary }}>{t.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{t.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: textSecondary }}>
                  {videoType === 'custom' ? 'Describe what you want *' : 'Add more detail (optional)'}
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder={videoType === 'talking'
                    ? 'e.g. "He talks about how the bracelet elevates any outfit, smiling and relaxed"'
                    : videoType === 'custom'
                    ? 'Describe exactly what should happen in the video…'
                    : 'e.g. "Focus on the clasp mechanism, very slow motion"'}
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: textSecondary }}>
                  Mood <span className="font-normal opacity-60">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_TAGS.map(m => (
                    <button key={m} type="button"
                      onClick={() => toggleMood(m)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
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
            </div>
          )}

          {/* ── STEP 3: Settings + Generate ── */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">

              {/* Duration + Ratio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: textSecondary }}>Duration</label>
                  <div className="flex gap-2">
                    {DURATIONS.map(d => (
                      <button key={d.value} type="button"
                        onClick={() => setDuration(d.value)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                        style={{
                          background: duration === d.value ? accentBg : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                          border: `1px solid ${duration === d.value ? accentBorder : border}`,
                          color: duration === d.value ? accent : textSecondary,
                        }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: textSecondary }}>Aspect Ratio</label>
                  <div className="flex gap-2">
                    {RATIOS.map(r => (
                      <button key={r.value} type="button"
                        onClick={() => setAspectRatio(r.value)}
                        className="flex-1 py-2 rounded-lg transition-all duration-150 text-center"
                        style={{
                          background: aspectRatio === r.value ? accentBg : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                          border: `1px solid ${aspectRatio === r.value ? accentBorder : border}`,
                          color: aspectRatio === r.value ? accent : textSecondary,
                        }}>
                        <div className="text-xs font-semibold">{r.label}</div>
                        <div className="text-[9px] mt-0.5 opacity-70">{r.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prompt preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: textSecondary }}>
                    AI Video Prompt <span className="font-normal opacity-60">(editable)</span>
                  </label>
                  {promptDirty && (
                    <button type="button" onClick={() => { setPromptDirty(false); }}
                      className="text-[10px]" style={{ color: accent }}>
                      ↺ Reset
                    </button>
                  )}
                </div>
                <textarea
                  value={editedPrompt}
                  onChange={e => { setEditedPrompt(e.target.value); setPromptDirty(true); }}
                  rows={4}
                  className={inputCls + ' resize-none text-xs'}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Video result */}
              {videoResult && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${accentBorder}` }}>
                  <video
                    src={`${API_BASE}${videoResult.localPath}`}
                    controls
                    className="w-full max-h-64 bg-black"
                  />
                  <div className="flex gap-2 p-3" style={{ background: accentBg }}>
                    <a
                      href={`${API_BASE}${videoResult.localPath}`}
                      download
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                      style={{ background: dark ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#C45D3E' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </a>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: textSecondary, border: `1px solid ${border}` }}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${border}` }}>
            {step > 1 && !videoResult ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-sm font-medium transition-all"
                style={{ color: textSecondary }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : <div />}

            {!videoResult && (
              step < 3 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 2 && !canNext2}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: dark ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#C45D3E',
                    boxShadow: dark ? '0 4px 16px -4px rgba(139,92,246,0.35)' : '0 4px 16px -4px rgba(196,93,62,0.3)',
                  }}>
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={generate}
                  disabled={generating || !!videoResult}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                  style={{
                    background: dark ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#C45D3E',
                    boxShadow: dark ? '0 4px 16px -4px rgba(139,92,246,0.35)' : '0 4px 16px -4px rgba(196,93,62,0.3)',
                  }}>
                  {generating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {progress || 'Generating…'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Generate Video
                    </>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
