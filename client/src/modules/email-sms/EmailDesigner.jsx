import { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { postJSON } from '../../lib/api';

const MODULE_COLOR = '#f59e0b';

// ── Block type definitions ───────────────────────────────────────

const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: 'H', defaults: { content: 'Your Heading', fontSize: '28px', color: '#111827', align: 'left' } },
  { type: 'text', label: 'Text', icon: 'T', defaults: { content: 'Write your paragraph here...', fontSize: '16px', color: '#1f2937', align: 'left' } },
  { type: 'button', label: 'Button', icon: '▶', defaults: { content: 'Click Here', href: '#', bgColor: '#2563eb', color: '#ffffff', fontSize: '16px', borderRadius: '8px', align: 'center' } },
  { type: 'image', label: 'Image', icon: '🖼', defaults: { src: '', alt: 'Image', width: '600px', borderRadius: '8px' } },
  { type: 'divider', label: 'Divider', icon: '—', defaults: { color: '#e5e7eb', width: '1px' } },
  { type: 'spacer', label: 'Spacer', icon: '↕', defaults: { height: '30px' } },
  { type: 'social', label: 'Social', icon: '★', defaults: { networks: ['facebook', 'twitter', 'instagram'], align: 'center' } },
];

// ── Block Editor Panel ──────────────────────────────────────────

function BlockEditor({ block, onChange, dark }) {
  const update = (key, value) => onChange({ ...block, [key]: value });
  const inputCls = 'w-full input-field rounded-lg px-3 py-2 text-xs';
  const labelCls = `text-[10px] font-semibold mb-1 block ${dark ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <div className="space-y-3">
      {(block.type === 'text' || block.type === 'heading' || block.type === 'html') && (
        <div>
          <label className={labelCls}>CONTENT</label>
          <textarea value={block.content || ''} onChange={e => update('content', e.target.value)}
            rows={block.type === 'heading' ? 2 : 4} className={`${inputCls} resize-none`} />
        </div>
      )}
      {block.type === 'button' && (
        <>
          <div>
            <label className={labelCls}>BUTTON TEXT</label>
            <input value={block.content || ''} onChange={e => update('content', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>LINK URL</label>
            <input value={block.href || ''} onChange={e => update('href', e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>BG COLOR</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={block.bgColor || '#2563eb'} onChange={e => update('bgColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <input value={block.bgColor || '#2563eb'} onChange={e => update('bgColor', e.target.value)} className={`${inputCls} flex-1`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>TEXT COLOR</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={block.color || '#ffffff'} onChange={e => update('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <input value={block.color || '#ffffff'} onChange={e => update('color', e.target.value)} className={`${inputCls} flex-1`} />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>BORDER RADIUS</label>
            <input value={block.borderRadius || '8px'} onChange={e => update('borderRadius', e.target.value)} className={inputCls} />
          </div>
        </>
      )}
      {block.type === 'image' && (
        <>
          <div>
            <label className={labelCls}>IMAGE URL</label>
            <input value={block.src || ''} onChange={e => update('src', e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ALT TEXT</label>
            <input value={block.alt || ''} onChange={e => update('alt', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>WIDTH</label>
              <input value={block.width || '600px'} onChange={e => update('width', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>LINK URL</label>
              <input value={block.href || ''} onChange={e => update('href', e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
          </div>
        </>
      )}
      {(block.type === 'text' || block.type === 'heading') && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>FONT SIZE</label>
            <input value={block.fontSize || '16px'} onChange={e => update('fontSize', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>COLOR</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={block.color || '#1f2937'} onChange={e => update('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <input value={block.color || '#1f2937'} onChange={e => update('color', e.target.value)} className={`${inputCls} flex-1`} />
            </div>
          </div>
        </div>
      )}
      {(block.type === 'text' || block.type === 'heading' || block.type === 'button' || block.type === 'social') && (
        <div>
          <label className={labelCls}>ALIGN</label>
          <div className="flex gap-1">
            {['left', 'center', 'right'].map(a => (
              <button key={a} onClick={() => update('align', a)}
                className={`px-3 py-1.5 rounded text-[10px] font-semibold capitalize ${
                  block.align === a
                    ? `bg-amber-500/15 text-amber-400 border border-amber-500/25`
                    : `${dark ? 'text-gray-500 border border-gray-800' : 'text-gray-400 border border-gray-200'}`
                }`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      )}
      {block.type === 'spacer' && (
        <div>
          <label className={labelCls}>HEIGHT</label>
          <input value={block.height || '30px'} onChange={e => update('height', e.target.value)} className={inputCls} />
        </div>
      )}
      {block.type === 'divider' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>COLOR</label>
            <input type="color" value={block.color || '#e5e7eb'} onChange={e => update('color', e.target.value)} className="w-full h-8 rounded cursor-pointer" />
          </div>
          <div>
            <label className={labelCls}>THICKNESS</label>
            <input value={block.width || '1px'} onChange={e => update('width', e.target.value)} className={inputCls} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Email Designer Component ───────────────────────────────

export default function EmailDesigner({ onExportHtml, initialBlocks }) {
  const { dark } = useTheme();
  const [blocks, setBlocks] = useState(initialBlocks || [
    { id: 'h1', type: 'heading', content: 'Welcome!', fontSize: '28px', color: '#111827', align: 'center' },
    { id: 'p1', type: 'text', content: 'Thanks for subscribing. We\'re excited to have you on board.', fontSize: '16px', color: '#4b5563', align: 'center' },
    { id: 'btn1', type: 'button', content: 'Get Started', href: '#', bgColor: '#2563eb', color: '#ffffff', fontSize: '16px', borderRadius: '8px', align: 'center' },
    { id: 'div1', type: 'divider', color: '#e5e7eb', width: '1px' },
    { id: 'foot', type: 'text', content: 'If you have questions, just reply to this email.', fontSize: '14px', color: '#9ca3af', align: 'center' },
  ]);
  const [selectedId, setSelectedId] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [rendering, setRendering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [designOptions, setDesignOptions] = useState({
    brandColor: '#2563eb',
    bgColor: '#f4f4f5',
    previewText: '',
    footerText: '',
  });
  const previewRef = useRef(null);

  const panelCls = dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm';
  const selected = blocks.find(b => b.id === selectedId);

  const genId = () => `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const addBlock = (type) => {
    const def = BLOCK_TYPES.find(bt => bt.type === type);
    const newBlock = { id: genId(), ...def.defaults };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = useCallback((updated) => {
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
  }, []);

  const deleteBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const updated = [...blocks];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setBlocks(updated);
  };

  // Drag & drop reorder
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...blocks];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setBlocks(updated);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const renderPreview = useCallback(async () => {
    setRendering(true);
    try {
      const data = await postJSON('/api/email-sms/render-blocks', { blocks, options: designOptions });
      if (data.success) {
        setPreviewHtml(data.html);
        setShowPreview(true);
      }
    } catch (e) {
      console.error('Render error:', e);
    }
    setRendering(false);
  }, [blocks, designOptions]);

  const exportHtml = useCallback(async () => {
    setRendering(true);
    try {
      const data = await postJSON('/api/email-sms/render-blocks', { blocks, options: designOptions });
      if (data.success) {
        if (onExportHtml) {
          onExportHtml(data.html);
        } else {
          const blob = new Blob([data.html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'email-template.html'; a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      console.error('Export error:', e);
    }
    setRendering(false);
  }, [blocks, designOptions, onExportHtml]);

  // Auto-preview when blocks change
  useEffect(() => {
    if (showPreview) {
      const timer = setTimeout(renderPreview, 500);
      return () => clearTimeout(timer);
    }
  }, [blocks, showPreview, renderPreview]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className={`${panelCls} rounded-2xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>ADD BLOCKS</p>
          <div className="flex gap-2">
            <button onClick={renderPreview} disabled={rendering}
              className="chip text-[10px]" style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}>
              {rendering ? 'Rendering...' : showPreview ? 'Refresh Preview' : 'Preview'}
            </button>
            <button onClick={exportHtml} disabled={rendering}
              className="chip text-[10px]" style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)' }}>
              Export HTML
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                dark ? 'border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 bg-white/[0.02]'
                     : 'border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 bg-gray-50'
              }`}>
              <span className="mr-1.5">{bt.icon}</span>{bt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Block canvas */}
        <div className="lg:col-span-2 space-y-2">
          {blocks.length === 0 && (
            <div className={`${panelCls} rounded-2xl p-12 text-center`}>
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Click the block buttons above to start building your email.</p>
            </div>
          )}

          {blocks.map((block, idx) => {
            const bt = BLOCK_TYPES.find(t => t.type === block.type);
            const isSelected = selectedId === block.id;
            return (
              <div key={block.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedId(block.id)}
                className={`${panelCls} rounded-xl p-3 cursor-pointer transition-all group ${
                  isSelected ? 'ring-2 ring-amber-500/40' : 'hover:ring-1 hover:ring-amber-500/20'
                } ${dragIdx === idx ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <div className={`cursor-grab active:cursor-grabbing ${dark ? 'text-gray-600' : 'text-gray-300'}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                    </svg>
                  </div>

                  {/* Block type badge */}
                  <span className="chip text-[9px] px-2 py-0.5 flex-shrink-0"
                    style={isSelected ? { color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` } : {}}>
                    {bt?.icon} {bt?.label}
                  </span>

                  {/* Content preview */}
                  <span className={`text-xs truncate flex-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {block.type === 'spacer' ? `${block.height}` :
                     block.type === 'divider' ? `${block.width} ${block.color}` :
                     block.type === 'image' ? (block.src ? block.src.slice(0, 40) + '...' : 'No image set') :
                     block.type === 'social' ? (block.networks || []).join(', ') :
                     (block.content || '').replace(/<[^>]+>/g, '').slice(0, 60)}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }}
                      disabled={idx === 0}
                      className={`p-1 rounded ${dark ? 'hover:bg-white/5 text-gray-500' : 'hover:bg-gray-100 text-gray-400'} disabled:opacity-20`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }}
                      disabled={idx === blocks.length - 1}
                      className={`p-1 rounded ${dark ? 'hover:bg-white/5 text-gray-500' : 'hover:bg-gray-100 text-gray-400'} disabled:opacity-20`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                      className={`p-1 rounded ${dark ? 'hover:bg-red-500/10 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Block settings */}
        <div className="space-y-4">
          {selected ? (
            <div className={`${panelCls} rounded-2xl p-4 sm:p-5`}>
              <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>
                EDIT {BLOCK_TYPES.find(bt => bt.type === selected.type)?.label?.toUpperCase()}
              </p>
              <BlockEditor block={selected} onChange={updateBlock} dark={dark} />
            </div>
          ) : (
            <div className={`${panelCls} rounded-2xl p-6 text-center`}>
              <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Click a block to edit it</p>
            </div>
          )}

          {/* Design settings */}
          <div className={`${panelCls} rounded-2xl p-4 sm:p-5`}>
            <p className="hud-label text-[11px] mb-3">DESIGN SETTINGS</p>
            <div className="space-y-3">
              <div>
                <label className={`text-[10px] font-semibold mb-1 block ${dark ? 'text-gray-400' : 'text-gray-500'}`}>BRAND COLOR</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={designOptions.brandColor} onChange={e => setDesignOptions(p => ({ ...p, brandColor: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0" />
                  <input value={designOptions.brandColor} onChange={e => setDesignOptions(p => ({ ...p, brandColor: e.target.value }))}
                    className="flex-1 input-field rounded-lg px-3 py-2 text-xs" />
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-semibold mb-1 block ${dark ? 'text-gray-400' : 'text-gray-500'}`}>BACKGROUND COLOR</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={designOptions.bgColor} onChange={e => setDesignOptions(p => ({ ...p, bgColor: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0" />
                  <input value={designOptions.bgColor} onChange={e => setDesignOptions(p => ({ ...p, bgColor: e.target.value }))}
                    className="flex-1 input-field rounded-lg px-3 py-2 text-xs" />
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-semibold mb-1 block ${dark ? 'text-gray-400' : 'text-gray-500'}`}>PREVIEW TEXT</label>
                <input value={designOptions.previewText} onChange={e => setDesignOptions(p => ({ ...p, previewText: e.target.value }))}
                  placeholder="Text shown in inbox before opening..."
                  className="w-full input-field rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                <label className={`text-[10px] font-semibold mb-1 block ${dark ? 'text-gray-400' : 'text-gray-500'}`}>FOOTER TEXT</label>
                <input value={designOptions.footerText} onChange={e => setDesignOptions(p => ({ ...p, footerText: e.target.value }))}
                  placeholder="Company address, unsubscribe link..."
                  className="w-full input-field rounded-lg px-3 py-2 text-xs" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && previewHtml && (
        <div className={`${panelCls} rounded-2xl p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-3">
            <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>EMAIL PREVIEW</p>
            <div className="flex gap-2">
              <button onClick={() => setShowPreview(false)} className="chip text-[10px]">Close</button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
            <iframe
              ref={previewRef}
              srcDoc={previewHtml}
              className="w-full bg-white"
              style={{ height: '600px', border: 'none' }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
