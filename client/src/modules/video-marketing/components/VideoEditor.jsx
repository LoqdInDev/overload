import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import useEditorState from './editor/hooks/useEditorState';
import { ASPECT_RATIOS, TEMPLATES } from './editor/hooks/useEditorState';
import EditorToolbar from './editor/EditorToolbar';
import EditorPreview from './editor/EditorPreview';
import EditorTimeline from './editor/EditorTimeline';
import ClipPanel from './editor/ClipPanel';
import MusicPanel from './editor/MusicPanel';
import TextOverlayPanel from './editor/TextOverlayPanel';
import FiltersPanel from './editor/FiltersPanel';
import LogoPanel from './editor/LogoPanel';
import StockMediaPanel from './editor/StockMediaPanel';
import StickersPanel from './editor/StickersPanel';
import VoiceoverPanel from './editor/VoiceoverPanel';
import ColorGradingPanel from './editor/ColorGradingPanel';
import ExportPanel from './editor/ExportPanel';

const PANELS = [
  { key: 'clip', label: 'Clip', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { key: 'filters', label: 'Filters', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'color', label: 'Color', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { key: 'text', label: 'Text', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { key: 'stickers', label: 'Stickers', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'music', label: 'Music', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
  { key: 'voice', label: 'Voice', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
  { key: 'logo', label: 'Logo', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'stock', label: 'Stock', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { key: 'export', label: 'Export', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
];

export default function VideoEditor() {
  const { dark } = useTheme();
  const editor = useEditorState();
  const [activePanel, setActivePanel] = useState('clip');
  const [showImport, setShowImport] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

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
        onSaveLoad={() => setShowSaveLoad(true)}
        onTemplates={() => setShowTemplates(true)}
      />

      {/* Main area: icon sidebar + panel content + preview */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Icon sidebar */}
        <div className={`w-14 flex-shrink-0 flex flex-col items-center py-2 gap-0.5 border-r ${border} ${panelBg} overflow-y-auto`} style={{ scrollbarWidth: 'none' }}>
          {PANELS.map(p => {
            const active = activePanel === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setActivePanel(p.key)}
                title={p.label}
                className={`w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[8px] font-medium transition-all ${
                  active
                    ? dark ? 'bg-violet-500/15 text-violet-300' : 'bg-[#C45D3E]/10 text-[#C45D3E]'
                    : dark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]' : 'text-[#94908A] hover:text-[#332F2B] hover:bg-black/[0.04]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                </svg>
                <span className="leading-none">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel content */}
        <div className={`w-72 flex-shrink-0 flex flex-col border-r ${border} ${panelBg}`}>
          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === 'clip' && <ClipPanel editor={editor} />}
            {activePanel === 'filters' && <FiltersPanel editor={editor} />}
            {activePanel === 'color' && <ColorGradingPanel editor={editor} />}
            {activePanel === 'text' && <TextOverlayPanel editor={editor} />}
            {activePanel === 'stickers' && <StickersPanel editor={editor} />}
            {activePanel === 'music' && <MusicPanel editor={editor} />}
            {activePanel === 'voice' && <VoiceoverPanel editor={editor} />}
            {activePanel === 'logo' && <LogoPanel editor={editor} />}
            {activePanel === 'stock' && <StockMediaPanel editor={editor} />}
            {activePanel === 'export' && <ExportPanel editor={editor} />}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <EditorPreview editor={editor} />
        </div>
      </div>

      {/* Timeline */}
      <EditorTimeline editor={editor} />

      {/* Save/Load Modal */}
      {showSaveLoad && <SaveLoadModal dark={dark} border={border} editor={editor} onClose={() => setShowSaveLoad(false)} />}

      {/* Templates Modal */}
      {showTemplates && <TemplatesModal dark={dark} border={border} editor={editor} onClose={() => setShowTemplates(false)} />}
    </div>
  );
}

function SaveLoadModal({ dark, border, editor, onClose }) {
  const [saveName, setSaveName] = useState(editor.projectName || '');
  const [projects, setProjects] = useState(editor.listProjects());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!saveName.trim()) return;
    editor.saveProject(saveName.trim());
    setSaved(true);
    setProjects(editor.listProjects());
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoad = (p) => {
    editor.loadProject(p);
    onClose();
  };

  const handleDelete = (name) => {
    editor.deleteProject(name);
    setProjects(editor.listProjects());
  };

  const inputCls = `w-full rounded-lg px-3 py-1.5 text-xs ${
    dark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f0ebe4] border-[#e8e0d4] text-[#332F2B]'
  } border focus:outline-none`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-md max-h-[70vh] rounded-2xl border ${border} ${dark ? 'bg-[#12121a]' : 'bg-white'} flex flex-col overflow-hidden shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${border}`}>
          <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-[#332F2B]'}`}>Save / Load Project</h3>
          <button onClick={onClose} className={`p-1 rounded-lg ${dark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-[#EDE5DA] text-[#94908A]'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Save section */}
          <div>
            <label className={`text-[11px] font-medium mb-1.5 block ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>Save Current Project</label>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Project name..." value={saveName} onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()} />
              <button onClick={handleSave} className={`px-4 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${
                dark ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-[#C45D3E] text-white hover:bg-[#b5533a]'
              }`}>
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* Load section */}
          <div>
            <label className={`text-[11px] font-medium mb-1.5 block ${dark ? 'text-gray-300' : 'text-[#332F2B]'}`}>
              Saved Projects ({projects.length})
            </label>
            {projects.length === 0 ? (
              <p className={`text-[11px] py-4 text-center ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>No saved projects yet</p>
            ) : (
              <div className="space-y-1.5">
                {projects.map(p => (
                  <div key={p.name} className={`flex items-center gap-2 p-2.5 rounded-lg ${dark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-[#f8f4ef] hover:bg-[#f0ebe4]'} transition-all`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-medium truncate ${dark ? 'text-gray-200' : 'text-[#332F2B]'}`}>{p.name}</p>
                      <p className={`text-[10px] ${dark ? 'text-gray-500' : 'text-[#94908A]'}`}>
                        {(p.clips?.length || 0)} clips &middot; {p.aspectRatio || '9:16'} &middot; {new Date(p.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => handleLoad(p)} className={`px-2.5 py-1 rounded text-[10px] font-medium ${
                      dark ? 'text-violet-300 hover:bg-violet-500/10' : 'text-[#C45D3E] hover:bg-[#C45D3E]/10'
                    }`}>Load</button>
                    <button onClick={() => handleDelete(p.name)} className="px-2 py-1 rounded text-[10px] font-medium text-red-400 hover:bg-red-500/10">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatesModal({ dark, border, editor, onClose }) {
  const handleApply = (template) => {
    editor.applyTemplate(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-lg max-h-[70vh] rounded-2xl border ${border} ${dark ? 'bg-[#12121a]' : 'bg-white'} flex flex-col overflow-hidden shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${border}`}>
          <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-[#332F2B]'}`}>Templates</h3>
          <button onClick={onClose} className={`p-1 rounded-lg ${dark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-[#EDE5DA] text-[#94908A]'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className={`text-[11px] mb-3 ${dark ? 'text-gray-400' : 'text-[#5c5955]'}`}>
            Apply a template to add pre-built text overlays with animations. Import your clips first, then apply a template.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.key}
                onClick={() => handleApply(t)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  dark ? 'border-white/[0.08] hover:border-violet-500/30 hover:bg-violet-500/5' : 'border-[#e8e0d4] hover:border-[#C45D3E]/30 hover:bg-[#C45D3E]/5'
                }`}
              >
                <p className={`text-[12px] font-semibold mb-0.5 ${dark ? 'text-white' : 'text-[#332F2B]'}`}>{t.name}</p>
                <p className={`text-[10px] mb-2 ${dark ? 'text-gray-400' : 'text-[#5c5955]'}`}>{t.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {t.overlays.map((o, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${
                      dark ? 'bg-white/[0.06] text-gray-400' : 'bg-[#f0ebe4] text-[#5c5955]'
                    }`}>
                      {o.text.slice(0, 20)}{o.text.length > 20 ? '...' : ''} ({o.animation})
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
