import { useState, useCallback, useRef } from 'react';

let nextId = 1;
const uid = () => `ed_${nextId++}_${Date.now()}`;

const MAX_HISTORY = 40;
const STORAGE_KEY = 'overload_editor_projects';

export const ASPECT_RATIOS = [
  { key: '9:16', label: 'TikTok / Reels', w: 9, h: 16, css: '9/16' },
  { key: '1:1',  label: 'Instagram Post',  w: 1, h: 1,  css: '1/1' },
  { key: '16:9', label: 'YouTube',          w: 16, h: 9, css: '16/9' },
  { key: '4:5',  label: 'Facebook / IG Feed', w: 4, h: 5, css: '4/5' },
  { key: '4:3',  label: 'Classic',           w: 4, h: 3, css: '4/3' },
  { key: '21:9', label: 'Cinematic',         w: 21, h: 9, css: '21/9' },
];

export const TRANSITIONS = [
  { key: 'none', label: 'None' },
  { key: 'fade', label: 'Fade' },
  { key: 'dissolve', label: 'Dissolve' },
  { key: 'slide-left', label: 'Slide Left' },
  { key: 'slide-right', label: 'Slide Right' },
  { key: 'slide-up', label: 'Slide Up' },
  { key: 'wipe', label: 'Wipe' },
  { key: 'zoom', label: 'Zoom' },
];

export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export const ANIMATIONS = [
  { key: 'none', label: 'None' },
  { key: 'fade-in', label: 'Fade In' },
  { key: 'slide-up', label: 'Slide Up' },
  { key: 'slide-down', label: 'Slide Down' },
  { key: 'slide-left', label: 'Slide Left' },
  { key: 'slide-right', label: 'Slide Right' },
  { key: 'pop-in', label: 'Pop In' },
  { key: 'typewriter', label: 'Typewriter' },
  { key: 'bounce-in', label: 'Bounce In' },
  { key: 'blur-in', label: 'Blur In' },
];

export const TEMPLATES = [
  {
    key: 'product-showcase',
    name: 'Product Showcase',
    desc: '3 clips with zoom-ins and bold titles',
    build: (addClip, addOverlay) => {
      addOverlay('YOUR PRODUCT');
      addOverlay('Key Features');
      addOverlay('Get Yours Now!');
    },
    overlays: [
      { text: 'YOUR PRODUCT', x: 50, y: 20, fontSize: 42, color: '#ffffff', bg: 'rgba(0,0,0,0.5)', startTime: 0, endTime: 2, fontWeight: 'bold', animation: 'pop-in' },
      { text: 'Key Features', x: 50, y: 50, fontSize: 32, color: '#ffffff', bg: 'rgba(0,0,0,0.5)', startTime: 2, endTime: 4, fontWeight: 'bold', animation: 'slide-up' },
      { text: 'Get Yours Now!', x: 50, y: 80, fontSize: 36, color: '#ffdd00', bg: 'rgba(0,0,0,0.7)', startTime: 4, endTime: 6, fontWeight: 'bold', animation: 'bounce-in' },
    ],
  },
  {
    key: 'before-after',
    name: 'Before / After',
    desc: 'Side-by-side comparison layout',
    overlays: [
      { text: 'BEFORE', x: 50, y: 15, fontSize: 38, color: '#ff4444', bg: 'rgba(0,0,0,0.6)', startTime: 0, endTime: 3, fontWeight: 'bold', animation: 'fade-in' },
      { text: 'AFTER', x: 50, y: 15, fontSize: 38, color: '#44ff44', bg: 'rgba(0,0,0,0.6)', startTime: 3, endTime: 6, fontWeight: 'bold', animation: 'fade-in' },
    ],
  },
  {
    key: 'testimonial',
    name: 'Testimonial',
    desc: 'Quote with speaker name',
    overlays: [
      { text: '"This changed everything..."', x: 50, y: 40, fontSize: 28, color: '#ffffff', bg: 'rgba(0,0,0,0.5)', startTime: 0, endTime: 4, fontWeight: 'normal', animation: 'typewriter' },
      { text: '— Customer Name', x: 50, y: 60, fontSize: 22, color: '#cccccc', bg: 'transparent', startTime: 2, endTime: 4, fontWeight: 'normal', animation: 'fade-in' },
    ],
  },
  {
    key: 'hook-3scene',
    name: '3-Scene Hook',
    desc: 'Attention-grabbing opener with CTA',
    overlays: [
      { text: 'Wait for it...', x: 50, y: 50, fontSize: 36, color: '#ffffff', bg: 'rgba(0,0,0,0.6)', startTime: 0, endTime: 1.5, fontWeight: 'bold', animation: 'pop-in' },
      { text: 'THE REVEAL', x: 50, y: 50, fontSize: 44, color: '#ffdd00', bg: 'rgba(0,0,0,0.7)', startTime: 1.5, endTime: 3.5, fontWeight: 'bold', animation: 'bounce-in' },
      { text: 'Link in bio', x: 50, y: 85, fontSize: 24, color: '#ffffff', bg: 'rgba(0,0,0,0.5)', startTime: 3.5, endTime: 5, fontWeight: 'bold', animation: 'slide-up' },
    ],
  },
  {
    key: 'minimal-caption',
    name: 'Minimal Caption',
    desc: 'Clean lower-third text',
    overlays: [
      { text: 'Your caption here', x: 50, y: 85, fontSize: 26, color: '#ffffff', bg: 'rgba(0,0,0,0.4)', startTime: 0, endTime: 5, fontWeight: 'normal', animation: 'slide-up' },
    ],
  },
];

export default function useEditorState() {
  const [clips, setClips] = useState([]);
  const [musicTracks, setMusicTracks] = useState([]);
  const [textOverlays, setTextOverlays] = useState([]);
  const [logos, setLogos] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [selectedLogoId, setSelectedLogoId] = useState(null);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [projectName, setProjectName] = useState('');

  // Undo/redo
  const historyRef = useRef([]);
  const futureRef = useRef([]);

  const snapshot = () => JSON.stringify({ clips, musicTracks, textOverlays, logos });

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), snapshot()];
    futureRef.current = [];
  }, [clips, musicTracks, textOverlays, logos]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    futureRef.current.push(snapshot());
    const prev = JSON.parse(historyRef.current.pop());
    setClips(prev.clips);
    setMusicTracks(prev.musicTracks);
    setTextOverlays(prev.textOverlays);
    setLogos(prev.logos || []);
  }, [clips, musicTracks, textOverlays, logos]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    historyRef.current.push(snapshot());
    const next = JSON.parse(futureRef.current.pop());
    setClips(next.clips);
    setMusicTracks(next.musicTracks);
    setTextOverlays(next.textOverlays);
    setLogos(next.logos || []);
  }, [clips, musicTracks, textOverlays, logos]);

  // Clip operations
  const addClip = useCallback((sourceUrl, duration, thumbnail) => {
    pushHistory();
    const clip = {
      id: uid(),
      sourceUrl,
      duration: duration || 5,
      trimStart: 0,
      trimEnd: duration || 5,
      volume: 1,
      speed: 1,
      thumbnail,
      transition: 'none',
      filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, vignette: 0 },
      zoom: 1,   // 1 = no zoom, up to 3x
      panX: 50,  // percent — 50 = centered
      panY: 50,  // percent — 50 = centered
    };
    setClips(prev => [...prev, clip]);
    return clip.id;
  }, [pushHistory]);

  const removeClip = useCallback((id) => {
    pushHistory();
    setClips(prev => prev.filter(c => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  }, [pushHistory, selectedClipId]);

  const updateClip = useCallback((id, updates) => {
    pushHistory();
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [pushHistory]);

  const moveClip = useCallback((fromIndex, toIndex) => {
    pushHistory();
    setClips(prev => {
      const arr = [...prev];
      const [removed] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, removed);
      return arr;
    });
  }, [pushHistory]);

  const duplicateClip = useCallback((id) => {
    pushHistory();
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], id: uid() };
      const arr = [...prev];
      arr.splice(idx + 1, 0, clone);
      return arr;
    });
  }, [pushHistory]);

  const splitClip = useCallback((id, atLocalTime) => {
    pushHistory();
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const clip = prev[idx];
      if (atLocalTime <= clip.trimStart + 0.3 || atLocalTime >= clip.trimEnd - 0.3) return prev;
      const first = { ...clip, trimEnd: atLocalTime };
      const second = { ...clip, id: uid(), trimStart: atLocalTime };
      const arr = [...prev];
      arr.splice(idx, 1, first, second);
      return arr;
    });
  }, [pushHistory]);

  // Music operations
  const addMusic = useCallback((title, url, duration) => {
    pushHistory();
    const track = { id: uid(), title, url, duration, startTime: 0, volume: 0.5 };
    setMusicTracks(prev => [...prev, track]);
    return track.id;
  }, [pushHistory]);

  const removeMusic = useCallback((id) => {
    pushHistory();
    setMusicTracks(prev => prev.filter(t => t.id !== id));
  }, [pushHistory]);

  const updateMusic = useCallback((id, updates) => {
    pushHistory();
    setMusicTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [pushHistory]);

  // Text overlay operations
  const addOverlay = useCallback((text = 'Text', overrides = {}) => {
    pushHistory();
    const overlay = {
      id: uid(),
      text,
      x: 50, y: 50,
      fontSize: 32,
      color: '#ffffff',
      bg: 'rgba(0,0,0,0.5)',
      startTime: playheadTime,
      endTime: playheadTime + 3,
      fontWeight: 'bold',
      animation: 'none',
      ...overrides,
    };
    setTextOverlays(prev => [...prev, overlay]);
    setSelectedOverlayId(overlay.id);
    return overlay.id;
  }, [pushHistory, playheadTime]);

  const removeOverlay = useCallback((id) => {
    pushHistory();
    setTextOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  }, [pushHistory, selectedOverlayId]);

  const updateOverlay = useCallback((id, updates) => {
    pushHistory();
    setTextOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, [pushHistory]);

  const clearAllOverlays = useCallback(() => {
    pushHistory();
    setTextOverlays([]);
    setSelectedOverlayId(null);
  }, [pushHistory]);

  // Logo/watermark operations
  const addLogo = useCallback((dataUrl) => {
    pushHistory();
    const logo = {
      id: uid(),
      dataUrl,
      x: 90, y: 10,
      width: 80,
      opacity: 0.8,
    };
    setLogos(prev => [...prev, logo]);
    setSelectedLogoId(logo.id);
    return logo.id;
  }, [pushHistory]);

  const removeLogo = useCallback((id) => {
    pushHistory();
    setLogos(prev => prev.filter(l => l.id !== id));
    if (selectedLogoId === id) setSelectedLogoId(null);
  }, [pushHistory, selectedLogoId]);

  const updateLogo = useCallback((id, updates) => {
    pushHistory();
    setLogos(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, [pushHistory]);

  // Save/load project
  const saveProject = useCallback((name) => {
    const project = {
      name: name || projectName || `Project ${Date.now()}`,
      savedAt: new Date().toISOString(),
      aspectRatio,
      clips: clips.map(c => ({ ...c, sourceUrl: c.sourceUrl, thumbnail: c.thumbnail })),
      musicTracks,
      textOverlays,
      logos,
    };
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const idx = existing.findIndex(p => p.name === project.name);
      if (idx >= 0) existing[idx] = project;
      else existing.push(project);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      setProjectName(project.name);
      return true;
    } catch { return false; }
  }, [clips, musicTracks, textOverlays, logos, aspectRatio, projectName]);

  const loadProject = useCallback((project) => {
    pushHistory();
    setClips(project.clips || []);
    setMusicTracks(project.musicTracks || []);
    setTextOverlays(project.textOverlays || []);
    setLogos(project.logos || []);
    setAspectRatio(project.aspectRatio || '9:16');
    setProjectName(project.name || '');
    setSelectedClipId(null);
    setSelectedOverlayId(null);
    setSelectedLogoId(null);
    setPlayheadTime(0);
    setPlaying(false);
  }, [pushHistory]);

  const listProjects = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }, []);

  const deleteProject = useCallback((name) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter(p => p.name !== name)));
      return true;
    } catch { return false; }
  }, []);

  // Apply template
  const applyTemplate = useCallback((template) => {
    pushHistory();
    const overlays = (template.overlays || []).map(o => ({
      ...o,
      id: uid(),
      animation: o.animation || 'none',
    }));
    setTextOverlays(prev => [...prev, ...overlays]);
  }, [pushHistory]);

  // Computed — speed affects effective duration
  const getEffectiveDuration = (clip) => (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
  const totalDuration = clips.reduce((sum, c) => sum + getEffectiveDuration(c), 0);

  const selectedClip = clips.find(c => c.id === selectedClipId) || null;
  const selectedOverlay = textOverlays.find(o => o.id === selectedOverlayId) || null;
  const selectedLogo = logos.find(l => l.id === selectedLogoId) || null;

  const getClipAtTime = useCallback((time) => {
    let acc = 0;
    for (const clip of clips) {
      const dur = getEffectiveDuration(clip);
      if (time >= acc && time < acc + dur) {
        return { clip, localTime: clip.trimStart + (time - acc) * (clip.speed || 1) };
      }
      acc += dur;
    }
    return null;
  }, [clips]);

  // Get the split point for a clip given a global playhead time
  const getSplitPointForClip = useCallback((time) => {
    let acc = 0;
    for (const clip of clips) {
      const dur = getEffectiveDuration(clip);
      if (time >= acc && time < acc + dur) {
        const localTime = clip.trimStart + (time - acc) * (clip.speed || 1);
        return { clipId: clip.id, localTime };
      }
      acc += dur;
    }
    return null;
  }, [clips]);

  return {
    clips, musicTracks, textOverlays, logos,
    selectedClipId, setSelectedClipId,
    selectedOverlayId, setSelectedOverlayId,
    selectedLogoId, setSelectedLogoId,
    playheadTime, setPlayheadTime,
    playing, setPlaying,
    aspectRatio, setAspectRatio,
    projectName, setProjectName,
    totalDuration,
    selectedClip, selectedOverlay, selectedLogo,
    getClipAtTime, getEffectiveDuration, getSplitPointForClip,
    addClip, removeClip, updateClip, moveClip, duplicateClip, splitClip,
    addMusic, removeMusic, updateMusic,
    addOverlay, removeOverlay, updateOverlay, clearAllOverlays,
    addLogo, removeLogo, updateLogo,
    saveProject, loadProject, listProjects, deleteProject,
    applyTemplate,
    undo, redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
