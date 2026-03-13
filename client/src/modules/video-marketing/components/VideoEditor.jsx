import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import useEditorState from './editor/hooks/useEditorState';
import { ASPECT_RATIOS } from './editor/hooks/useEditorState';
import EditorToolbar from './editor/EditorToolbar';
import EditorPreview from './editor/EditorPreview';
import EditorTimeline from './editor/EditorTimeline';
import ClipPanel from './editor/ClipPanel';
import MusicPanel from './editor/MusicPanel';
import TextOverlayPanel from './editor/TextOverlayPanel';
import FiltersPanel from './editor/FiltersPanel';

const PANELS = [
  { key: 'clip', label: 'Clip', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { key: 'filters', label: 'Filters', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'text', label: 'Text', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { key: 'music', label: 'Music', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
];

export default function VideoEditor() {
  const { dark } = useTheme();
  const editor = useEditorState();
  const [activePanel, setActivePanel] = useState('clip');
  const [showImport, setShowImport] = useState(false);

  const bg = dark ? 'bg-[#0a0a0f]' : 'bg-[#f8f4ef]';
  const border = dark ? 'border-white/[0.06]' : 'border-[#e8e0d4]';
  const panelBg = dark ? 'bg-[#0e0e14]' : 'bg-white/80';

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't capture when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (editor.clips.length > 0) {
          if (editor.playheadTime >= editor.totalDuration) editor.setPlayheadTime(0);
          editor.setPlaying(p => !p);
        }
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (editor.selectedClipId) {
          e.preventDefault();
          editor.removeClip(editor.selectedClipId);
        } else if (editor.selectedOverlayId) {
          e.preventDefault();
          editor.removeOverlay(editor.selectedOverlayId);
        }
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        editor.setPlayheadTime(t => Math.max(0, t - (e.shiftKey ? 1 : 0.1)));
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        editor.setPlayheadTime(t => Math.min(editor.totalDuration, t + (e.shiftKey ? 1 : 0.1)));
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        if (editor.selectedClipId) editor.duplicateClip(editor.selectedClipId);
      }
      if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // Split at playhead
        const sp = editor.getSplitPointForClip(editor.playheadTime);
        if (sp) editor.splitClip(sp.clipId, sp.localTime);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor]);

  const currentRatio = ASPECT_RATIOS.find(r => r.key === editor.aspectRatio) || ASPECT_RATIOS[0];

  return (
    <div className={`flex flex-col h-full ${bg}`}>
      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        showImport={showImport}
        setShowImport={setShowImport}
      />

      {/* Main area: side panel + preview */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left panel tabs */}
        <div className={`w-72 flex-shrink-0 flex flex-col border-r ${border} ${panelBg}`}>
          {/* Panel switcher */}
          <div className={`flex border-b ${border}`}>
            {PANELS.map(p => {
              const active = activePanel === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setActivePanel(p.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-all ${
                    active
                      ? dark ? 'text-violet-300 border-b-2 border-violet-400' : 'text-[#C45D3E] border-b-2 border-[#C45D3E]'
                      : dark ? 'text-gray-500 hover:text-gray-300' : 'text-[#94908A] hover:text-[#332F2B]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                  </svg>
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === 'clip' && <ClipPanel editor={editor} />}
            {activePanel === 'filters' && <FiltersPanel editor={editor} />}
            {activePanel === 'text' && <TextOverlayPanel editor={editor} />}
            {activePanel === 'music' && <MusicPanel editor={editor} />}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <EditorPreview editor={editor} />
        </div>
      </div>

      {/* Timeline */}
      <EditorTimeline editor={editor} />
    </div>
  );
}
