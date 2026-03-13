import { useState, useRef, useCallback } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const VOICES = typeof window !== 'undefined' && window.speechSynthesis
  ? [] // populated on mount
  : [];

export default function VoiceoverPanel({ editor }) {
  const { dark } = useTheme();
  const { addMusic, playheadTime } = editor;
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const synthRef = useRef(null);

  const label = dark ? 'text-gray-400' : 'text-[#5c5955]';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B] placeholder-[#94908A]'
  } border focus:outline-none`;
  const chipActive = dark ? 'bg-violet-500/15 border-violet-500/20 text-violet-300' : 'bg-[#C45D3E]/10 border-[#C45D3E]/20 text-[#C45D3E]';
  const chipIdle = dark ? 'border-white/[0.08] text-gray-500 hover:text-white' : 'border-[#e8e0d4] text-[#94908A] hover:text-[#332F2B]';

  // Load voices
  const loadVoices = useCallback(() => {
    if (!window.speechSynthesis) return;
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      setVoices(v);
      if (!selectedVoice && v.length > 0) {
        const english = v.find(voice => voice.lang.startsWith('en'));
        setSelectedVoice((english || v[0]).name);
      }
    }
  }, [selectedVoice]);

  // Load voices on first render
  useState(() => {
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  });

  const preview = () => {
    if (!text.trim() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onend = () => setPreviewing(false);
    utterance.onerror = () => setPreviewing(false);
    setPreviewing(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopPreview = () => {
    window.speechSynthesis?.cancel();
    setPreviewing(false);
  };

  const generateAndAdd = async () => {
    if (!text.trim() || !window.speechSynthesis) return;
    setGenerating(true);

    try {
      // Use MediaRecorder + SpeechSynthesis to capture audio
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Estimate duration based on word count and rate
      const words = text.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(2, (words / 2.5) / rate);

      // We can't directly capture SpeechSynthesis output as audio stream in most browsers
      // So we add it as a timed music track with TTS playback synced
      const trackTitle = `Voiceover: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`;

      // Create a silent audio blob to represent the voiceover track on the timeline
      // The actual speech will play via SpeechSynthesis during playback
      addMusic(trackTitle, `tts://${encodeURIComponent(JSON.stringify({ text, voice: selectedVoice, rate, pitch }))}`, estimatedDuration);

      setText('');
    } catch (err) {
      console.error('TTS generation failed:', err);
    }
    setGenerating(false);
  };

  const hasSupport = typeof window !== 'undefined' && window.speechSynthesis;

  if (!hasSupport) {
    return (
      <div className={`text-center py-8 ${label}`}>
        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-[11px]">Text-to-Speech not supported</p>
        <p className="text-[10px] opacity-60 mt-1">Your browser does not support the Speech Synthesis API</p>
      </div>
    );
  }

  // Group voices by language
  const enVoices = voices.filter(v => v.lang.startsWith('en'));
  const otherVoices = voices.filter(v => !v.lang.startsWith('en'));

  return (
    <div className="space-y-3">
      <p className={`text-[11px] font-medium ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
        AI Voiceover
      </p>

      {/* Text input */}
      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Script</label>
        <textarea
          className={`${inputCls} min-h-[80px] resize-none`}
          placeholder="Type what you want the voiceover to say..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
        />
        <p className={`text-[9px] mt-0.5 ${label} opacity-60`}>
          {text.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      </div>

      {/* Voice selector */}
      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Voice</label>
        <select
          className={inputCls}
          value={selectedVoice}
          onChange={e => setSelectedVoice(e.target.value)}
        >
          {enVoices.length > 0 && (
            <optgroup label="English">
              {enVoices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </optgroup>
          )}
          {otherVoices.length > 0 && (
            <optgroup label="Other Languages">
              {otherVoices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Speed & Pitch */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Speed</label>
          <input type="range" className="w-full accent-violet-500" min={0.5} max={2} step={0.1} value={rate}
            onChange={e => setRate(parseFloat(e.target.value))} />
          <span className={`text-[9px] ${label}`}>{rate}x</span>
        </div>
        <div>
          <label className={`text-[10px] font-medium mb-1 block ${label}`}>Pitch</label>
          <input type="range" className="w-full accent-violet-500" min={0.5} max={2} step={0.1} value={pitch}
            onChange={e => setPitch(parseFloat(e.target.value))} />
          <span className={`text-[9px] ${label}`}>{pitch}x</span>
        </div>
      </div>

      {/* Quick rate presets */}
      <div>
        <label className={`text-[10px] font-medium mb-1 block ${label}`}>Speed Preset</label>
        <div className="flex gap-1">
          {[
            { label: 'Slow', rate: 0.75 },
            { label: 'Normal', rate: 1 },
            { label: 'Fast', rate: 1.25 },
            { label: 'Rapid', rate: 1.5 },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => setRate(p.rate)}
              className={`flex-1 px-2 py-1 rounded text-[9px] font-medium border transition-all ${
                rate === p.rate ? chipActive : chipIdle
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={previewing ? stopPreview : preview}
          disabled={!text.trim()}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-medium border transition-all disabled:opacity-40 ${chipIdle}`}
        >
          {previewing ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              Stop
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Preview
            </>
          )}
        </button>
        <button
          onClick={generateAndAdd}
          disabled={!text.trim() || generating}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40 ${
            dark ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-[#C45D3E] text-white hover:bg-[#b5533a]'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {generating ? 'Adding...' : 'Add to Timeline'}
        </button>
      </div>
    </div>
  );
}
