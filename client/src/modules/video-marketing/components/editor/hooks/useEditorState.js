import { useState, useCallback, useRef } from 'react';

let nextId = 1;
const uid = () => `ed_${nextId++}_${Date.now()}`;

const MAX_HISTORY = 40;

export default function useEditorState() {
  const [clips, setClips] = useState([]);
  const [musicTracks, setMusicTracks] = useState([]);
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Undo/redo
  const historyRef = useRef([]);
  const futureRef = useRef([]);

  const snapshot = () => JSON.stringify({ clips, musicTracks, textOverlays });

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY), snapshot()];
    futureRef.current = [];
  }, [clips, musicTracks, textOverlays]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    futureRef.current.push(snapshot());
    const prev = JSON.parse(historyRef.current.pop());
    setClips(prev.clips);
    setMusicTracks(prev.musicTracks);
    setTextOverlays(prev.textOverlays);
  }, [clips, musicTracks, textOverlays]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    historyRef.current.push(snapshot());
    const next = JSON.parse(futureRef.current.pop());
    setClips(next.clips);
    setMusicTracks(next.musicTracks);
    setTextOverlays(next.textOverlays);
  }, [clips, musicTracks, textOverlays]);

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
      thumbnail,
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
  const addOverlay = useCallback((text = 'Text') => {
    pushHistory();
    const overlay = {
      id: uid(),
      text,
      x: 50, y: 50, // percent
      fontSize: 32,
      color: '#ffffff',
      bg: 'rgba(0,0,0,0.5)',
      startTime: playheadTime,
      endTime: playheadTime + 3,
      fontWeight: 'bold',
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

  // Computed
  const totalDuration = clips.reduce((sum, c) => sum + (c.trimEnd - c.trimStart), 0);

  const selectedClip = clips.find(c => c.id === selectedClipId) || null;
  const selectedOverlay = textOverlays.find(o => o.id === selectedOverlayId) || null;

  // Get clip at a given time
  const getClipAtTime = useCallback((time) => {
    let acc = 0;
    for (const clip of clips) {
      const dur = clip.trimEnd - clip.trimStart;
      if (time >= acc && time < acc + dur) {
        return { clip, localTime: clip.trimStart + (time - acc) };
      }
      acc += dur;
    }
    return null;
  }, [clips]);

  return {
    clips, musicTracks, textOverlays,
    selectedClipId, setSelectedClipId,
    selectedOverlayId, setSelectedOverlayId,
    playheadTime, setPlayheadTime,
    playing, setPlaying,
    totalDuration,
    selectedClip, selectedOverlay,
    getClipAtTime,
    addClip, removeClip, updateClip, moveClip,
    addMusic, removeMusic, updateMusic,
    addOverlay, removeOverlay, updateOverlay,
    undo, redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
