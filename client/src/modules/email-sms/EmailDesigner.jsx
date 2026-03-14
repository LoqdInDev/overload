import { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { postJSON, API_BASE, TOKEN_KEY } from '../../lib/api';

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

// ── Inline Block Preview (visual representation on canvas) ──────

function InlinePreview({ block, dark }) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="w-full py-1" style={{ textAlign: block.align || 'left' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: dark ? '#e5e7eb' : (block.color || '#111827') }}>
            {(block.content || 'Heading').replace(/<[^>]+>/g, '')}
          </span>
        </div>
      );
    case 'text':
      return (
        <div className="w-full py-0.5" style={{ textAlign: block.align || 'left' }}>
          <span className={`text-xs leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            {(block.content || '').replace(/<[^>]+>/g, '').slice(0, 120) || 'Text block'}
            {(block.content || '').length > 120 ? '...' : ''}
          </span>
        </div>
      );
    case 'button':
      return (
        <div className="w-full py-1" style={{ textAlign: block.align || 'center' }}>
          <span className="inline-block px-5 py-2 text-xs font-bold rounded-lg" style={{
            backgroundColor: block.bgColor || '#2563eb',
            color: block.color || '#ffffff',
            borderRadius: block.borderRadius || '8px',
          }}>
            {block.content || 'Button'}
          </span>
        </div>
      );
    case 'image':
      return block.src ? (
        <div className="w-full py-1" style={{ textAlign: 'center' }}>
          <img src={block.src} alt={block.alt || ''} className="max-h-24 rounded-lg inline-block object-cover"
            style={{ borderRadius: block.borderRadius || '8px', maxWidth: '100%' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="hidden items-center justify-center h-20 rounded-lg border-2 border-dashed"
            style={{ borderColor: dark ? '#374151' : '#d1d5db', color: dark ? '#6b7280' : '#9ca3af' }}>
            <span className="text-xs">Failed to load image</span>
          </div>
        </div>
      ) : (
        <div className="w-full py-1 flex items-center justify-center">
          <div className={`flex flex-col items-center justify-center h-20 w-full rounded-lg border-2 border-dashed ${
            dark ? 'border-gray-700 text-gray-600' : 'border-gray-300 text-gray-400'
          }`}>
            <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <span className="text-[10px]">No image set</span>
          </div>
        </div>
      );
    case 'divider':
      return (
        <div className="w-full py-2 px-4">
          <hr style={{ borderColor: block.color || '#e5e7eb', borderWidth: block.width || '1px', borderStyle: 'solid' }} />
        </div>
      );
    case 'spacer':
      return (
        <div className="w-full flex items-center justify-center" style={{ height: Math.min(parseInt(block.height) || 30, 60) + 'px' }}>
          <div className={`w-full border-t border-dashed ${dark ? 'border-gray-800' : 'border-gray-200'}`} />
          <span className={`absolute text-[9px] px-2 ${dark ? 'bg-[#0d0f12] text-gray-600' : 'bg-white text-gray-400'}`}>{block.height}</span>
        </div>
      );
    case 'social':
      return (
        <div className="w-full py-1 flex gap-2 items-center" style={{ justifyContent: block.align === 'right' ? 'flex-end' : block.align === 'center' ? 'center' : 'flex-start' }}>
          {(block.networks || []).map(n => (
            <span key={n} className={`text-[10px] px-2 py-1 rounded-full font-medium ${dark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {n === 'facebook' ? 'f' : n === 'twitter' ? '𝕏' : n === 'instagram' ? 'IG' : n === 'linkedin' ? 'in' : n[0]?.toUpperCase()}
            </span>
          ))}
        </div>
      );
    default:
      return <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{block.content || 'Block'}</span>;
  }
}

// ── Block Editor Panel ──────────────────────────────────────────

function BlockEditor({ block, onChange, dark }) {
  const update = (key, value) => onChange({ ...block, [key]: value });
  const inputCls = 'w-full input-field rounded-lg px-3 py-2 text-xs';
  const labelCls = `text-[10px] font-semibold mb-1 block ${dark ? 'text-gray-400' : 'text-gray-500'}`;
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem(TOKEN_KEY);
      const wsId = localStorage.getItem('overload_workspace_id');
      const resp = await fetch(`${API_BASE}/api/email-sms/upload-image`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(wsId ? { 'x-workspace-id': wsId } : {}) },
        body: formData,
      });
      const data = await resp.json();
      if (data.success && data.url) update('src', data.url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadImage(file);
  };

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
          {/* Image preview / drop zone */}
          <div>
            <label className={labelCls}>IMAGE PREVIEW</label>
            {block.src ? (
              <div className={`relative rounded-xl overflow-hidden border ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
                <img src={block.src} alt={block.alt || ''} className="w-full max-h-48 object-cover"
                  style={{ borderRadius: block.borderRadius || '8px' }}
                  onError={e => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.img-error').style.display = 'flex'; }}
                />
                <div className="img-error hidden items-center justify-center h-32 bg-red-500/5">
                  <span className={`text-xs ${dark ? 'text-red-400' : 'text-red-500'}`}>Could not load image</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </button>
                  <button onClick={() => update('src', '')}
                    className="p-1.5 rounded-lg bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); e.target.value = ''; }} />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                  dragOver
                    ? 'border-amber-500 bg-amber-500/10'
                    : dark ? 'border-gray-700 hover:border-amber-500/40 hover:bg-amber-500/5' : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
                }`}>
                {uploading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span className={`text-[11px] font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className={`w-8 h-8 mb-2 ${dragOver ? 'text-amber-500' : dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className={`text-[11px] font-semibold ${dragOver ? 'text-amber-500' : dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Click to upload or drag & drop
                    </span>
                    <span className={`text-[10px] mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>JPG, PNG, GIF, WebP (max 10MB)</span>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); e.target.value = ''; }} />
              </div>
            )}
          </div>
          <div className={`flex items-center gap-2 my-1 ${dark ? 'text-gray-700' : 'text-gray-300'}`}>
            <div className="flex-1 h-px bg-current" />
            <span className="text-[9px] font-semibold uppercase">or paste URL</span>
            <div className="flex-1 h-px bg-current" />
          </div>
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
              <label className={labelCls}>BORDER RADIUS</label>
              <input value={block.borderRadius || '8px'} onChange={e => update('borderRadius', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>LINK URL</label>
            <input value={block.href || ''} onChange={e => update('href', e.target.value)} placeholder="Optional click-through URL" className={inputCls} />
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
    const newBlock = { id: genId(), type, ...def.defaults };
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
      <div className={`${panelCls} rounded-2xl p-4 sm:p-5`}>
        <div className="flex items-center justify-between mb-4">
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
              className={`group/btn flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                dark ? 'border-gray-800 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 bg-white/[0.02]'
                     : 'border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 bg-gray-50'
              }`}>
              <span className="text-sm opacity-60 group-hover/btn:opacity-100 transition-opacity">{bt.icon}</span>
              {bt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Block canvas — styled like an email body */}
        <div className="lg:col-span-2">
          <div className={`${panelCls} rounded-2xl overflow-hidden`}>
            {/* Canvas header */}
            <div className={`px-5 py-3 border-b ${dark ? 'border-gray-800/50' : 'border-gray-100'} flex items-center gap-3`}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
              </div>
              <span className={`text-[10px] font-medium ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Email Canvas</span>
              <span className={`text-[10px] ml-auto ${dark ? 'text-gray-700' : 'text-gray-300'}`}>{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Canvas body with email-like background */}
            <div className={`p-4 sm:p-6 min-h-[300px] ${dark ? 'bg-[#0a0c0f]' : 'bg-gray-50/50'}`}
              style={{ backgroundImage: dark ? 'none' : 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)', backgroundSize: '20px 20px' }}>

              {blocks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center ${dark ? 'bg-white/5' : 'bg-gray-200/60'}`}>
                    <svg className={`w-6 h-6 ${dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <p className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Start building your email</p>
                  <p className={`text-xs mt-1 ${dark ? 'text-gray-700' : 'text-gray-300'}`}>Click the blocks above to add content</p>
                </div>
              )}

              {/* Email wrapper to simulate white email body */}
              {blocks.length > 0 && (
                <div className={`max-w-lg mx-auto rounded-xl overflow-hidden shadow-sm ${dark ? 'bg-[#141618] border border-gray-800/40' : 'bg-white border border-gray-200/80'}`}>
                  <div className="p-4 space-y-0">
                    {blocks.map((block, idx) => {
                      const isSelected = selectedId === block.id;
                      return (
                        <div key={block.id}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedId(block.id)}
                          className={`relative group cursor-pointer transition-all rounded-lg px-3 py-2 -mx-1 ${
                            isSelected
                              ? `ring-2 ring-amber-500/40 ${dark ? 'bg-amber-500/5' : 'bg-amber-50/50'}`
                              : `${dark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`
                          } ${dragIdx === idx ? 'opacity-40 scale-[0.98]' : ''}`}>

                          {/* Drag handle + actions — float on hover */}
                          <div className={`absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                            dark ? 'text-gray-600' : 'text-gray-300'
                          }`} style={{ zIndex: 2 }}>
                            <div className="cursor-grab active:cursor-grabbing p-0.5">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/>
                                <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                                <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
                              </svg>
                            </div>
                          </div>

                          {/* Inline visual preview */}
                          <InlinePreview block={block} dark={dark} />

                          {/* Hover action bar */}
                          <div className={`absolute -right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`} style={{ zIndex: 2 }}>
                            <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }}
                              disabled={idx === 0}
                              className={`p-1 rounded-md ${dark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'} disabled:opacity-20`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }}
                              disabled={idx === blocks.length - 1}
                              className={`p-1 rounded-md ${dark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'} disabled:opacity-20`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                              className={`p-1 rounded-md ${dark ? 'hover:bg-red-500/15 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Block settings */}
        <div className="space-y-4">
          {selected ? (
            <div className={`${panelCls} rounded-2xl p-4 sm:p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="chip text-[9px] px-2 py-0.5"
                  style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}>
                  {BLOCK_TYPES.find(bt => bt.type === selected.type)?.icon}
                </span>
                <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>
                  EDIT {BLOCK_TYPES.find(bt => bt.type === selected.type)?.label?.toUpperCase()}
                </p>
              </div>
              <BlockEditor block={selected} onChange={updateBlock} dark={dark} />
            </div>
          ) : (
            <div className={`${panelCls} rounded-2xl p-8 text-center`}>
              <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center ${dark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <svg className={`w-5 h-5 ${dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.591" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Select a block to edit</p>
              <p className={`text-[10px] mt-1 ${dark ? 'text-gray-700' : 'text-gray-300'}`}>Click any block on the canvas</p>
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
