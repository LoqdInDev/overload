import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import { useBrand as useBrandContext } from '../../context/BrandContext';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

const CREATIVE_TYPES = [
  { id: 'ad-creative', name: 'Ad Creatives', emoji: '🎯', desc: 'High-converting ads for social & paid media', tags: ['Facebook Ads', 'Instagram', 'Google Display', 'Retargeting'], accent: '#f97316', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'product-photo', name: 'Product Photos', emoji: '📸', desc: 'Studio-quality shots for listings & catalogues', tags: ['Amazon', 'Shopify', 'Lookbook', 'Detail Shot'], accent: '#8B7355', icon: 'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z' },
  { id: 'social-graphic', name: 'Social Graphics', emoji: '✨', desc: 'Feed posts, stories & carousels that stop the scroll', tags: ['Instagram', 'TikTok', 'LinkedIn', 'Pinterest'], accent: '#a78bfa', icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z' },
  { id: 'banner', name: 'Banner Designs', emoji: '🖥', desc: 'Web banners, email headers & display ads', tags: ['Hero Banner', 'Email Header', 'Leaderboard', 'Billboard'], accent: '#4ade80', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
];

const STYLES = [
  { id: 'minimal', name: 'Minimal' },
  { id: 'bold', name: 'Bold & Vibrant' },
  { id: 'luxury', name: 'Luxury' },
  { id: 'playful', name: 'Playful' },
  { id: 'corporate', name: 'Corporate' },
  { id: 'retro', name: 'Retro / Vintage' },
];

const VIBES = [
  { id: 'minimal', name: 'Clean & Minimal', sub: 'White space · Airy · Crisp', gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', dark: false, prompt: 'clean minimal aesthetic, crisp white space, geometric composition, soft diffused lighting' },
  { id: 'moody', name: 'Dark & Dramatic', sub: 'Shadows · Cinematic · Bold', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', dark: true, prompt: 'dark moody atmosphere, dramatic deep shadows, cinematic high-contrast lighting' },
  { id: 'vibrant', name: 'Bold & Vibrant', sub: 'High contrast · Energetic', gradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', dark: true, prompt: 'bold vibrant colors, high contrast, energetic dynamic composition, eye-catching visual impact' },
  { id: 'natural', name: 'Warm & Natural', sub: 'Earthy · Organic · Soft', gradient: 'linear-gradient(135deg, #c3a97a 0%, #78716c 100%)', dark: true, prompt: 'warm natural tones, earthy organic feel, soft golden lighting, authentic lifestyle aesthetic' },
  { id: 'luxury', name: 'Luxury & Premium', sub: 'Gold accents · Refined', gradient: 'linear-gradient(135deg, #1c1917 0%, #3d3520 100%)', dark: true, prompt: 'luxury premium aesthetic, gold accents, refined elegance, sophisticated minimalist composition' },
  { id: 'neon', name: 'Neon & Electric', sub: 'Glow · Futuristic · Vivid', gradient: 'linear-gradient(135deg, #4f0aad 0%, #0891b2 100%)', dark: true, prompt: 'vibrant neon glow effects, electric energy, futuristic digital aesthetic, high-impact color contrasts' },
];


const MODEL_GENDERS = [
  { id: 'woman', label: 'Woman', prompt: 'young woman' },
  { id: 'man', label: 'Man', prompt: 'young man' },
  { id: 'group', label: 'Group', prompt: 'diverse group of people' },
  { id: 'couple', label: 'Couple', prompt: 'couple' },
  { id: 'no-pref', label: 'No preference', prompt: 'person' },
];
const MODEL_AGES = ['Teen 16–20', 'Young Adult 20–30', 'Adult 30–45', 'Mature 45–60', 'Senior 60+'];
const MODEL_STYLES = ['Casual & Everyday', 'Professional', 'High Fashion / Editorial', 'Athletic / Activewear', 'Streetwear', 'Luxury / Elegant', 'Bohemian'];
const MODEL_POSES = [
  { id: 'mirror-selfie', label: 'Mirror Selfie', prompt: 'posing in front of a mirror, showing off the product' },
  { id: 'walking', label: 'Walking / Motion', prompt: 'walking confidently, product visible in motion' },
  { id: 'close-hand', label: 'Close-Up Hand/Wrist', prompt: 'close-up shot of hand or wrist prominently displaying the product' },
  { id: 'sitting', label: 'Sitting Relaxed', prompt: 'sitting casually, product naturally visible' },
  { id: 'action', label: 'Action Shot', prompt: 'in dynamic action pose, product featured prominently' },
  { id: 'skateboard', label: 'Skateboarding', prompt: 'riding a skateboard in urban environment, product catching light' },
  { id: 'leaning', label: 'Leaning / Against Wall', prompt: 'leaning against a wall with arms crossed, product prominently displayed' },
  { id: 'looking-away', label: 'Looking Away', prompt: 'looking away from camera in candid pose, product visible' },
  { id: 'adjusting', label: 'Adjusting Product', prompt: 'adjusting or touching the product with one hand, drawing attention to it' },
  { id: 'profile', label: 'Side Profile', prompt: 'dramatic side profile view, product catching the light' },
];
const PRODUCT_PLACEMENTS = [
  { id: 'neck', label: 'Necklace / Chain', prompt: 'wearing a necklace/chain prominently on neck' },
  { id: 'wrist', label: 'Bracelet / Watch', prompt: 'wearing bracelet or watch on wrist, hand positioned to show it off' },
  { id: 'ears', label: 'Earrings', prompt: 'wearing earrings, tilted head to show them off' },
  { id: 'fingers', label: 'Rings', prompt: 'wearing rings, hands positioned elegantly to display them' },
  { id: 'holding', label: 'Holding Product', prompt: 'holding the product up toward camera' },
  { id: 'wearing', label: 'Wearing (General)', prompt: 'naturally wearing the product in a lifestyle setting' },
  { id: 'on-surface', label: 'Product on Surface', prompt: 'product placed on a textured surface with dramatic lighting' },
  { id: 'unboxing', label: 'Unboxing', prompt: 'unboxing the product, showing packaging and first reveal' },
];
const SETTINGS = [
  { id: 'studio', emoji: '🎬', name: 'Studio', prompt: 'professional studio setting' },
  { id: 'home', emoji: '🏠', name: 'Home', prompt: 'modern home interior' },
  { id: 'urban', emoji: '🏙', name: 'Urban', prompt: 'urban street environment, city backdrop' },
  { id: 'beach', emoji: '🌊', name: 'Beach', prompt: 'beach or coastal environment, golden sand' },
  { id: 'nature', emoji: '🌿', name: 'Nature', prompt: 'natural outdoor environment, lush greenery' },
  { id: 'cafe', emoji: '☕', name: 'Café', prompt: 'cozy café or coffee shop interior' },
  { id: 'office', emoji: '💼', name: 'Office', prompt: 'modern office or workspace environment' },
  { id: 'gym', emoji: '💪', name: 'Gym', prompt: 'gym or fitness studio environment' },
  { id: 'rooftop', emoji: '🌆', name: 'Rooftop', prompt: 'rooftop terrace with city views' },
  { id: 'luxury', emoji: '✨', name: 'Luxury', prompt: 'luxury hotel or high-end interior setting' },
];
const COMPOSITIONS = [
  { id: 'centered', label: 'Centered Hero', mark: '⊙', prompt: 'centered hero composition' },
  { id: 'thirds', label: 'Rule of Thirds', mark: '⊞', prompt: 'rule of thirds composition' },
  { id: 'closeup', label: 'Close-Up', mark: '◎', prompt: 'tight close-up shot, detailed framing' },
  { id: 'wideshot', label: 'Wide Shot', mark: '⊡', prompt: 'wide establishing shot' },
  { id: 'flatlay', label: 'Flat Lay', mark: '□', prompt: 'overhead flat lay composition' },
  { id: 'lowangle', label: 'Low Angle', mark: '↑', prompt: 'dramatic low-angle upward shot' },
  { id: 'diagonal', label: 'Diagonal', mark: '◱', prompt: 'dynamic diagonal composition' },
  { id: 'split', label: 'Split Screen', mark: '⬛', prompt: 'split-screen dual composition' },
];
const LIGHTING_OPTIONS = [
  { id: 'natural', label: 'Natural Light', swatch: 'linear-gradient(135deg,#fef9c3,#fde68a,#fbbf24)' },
  { id: 'studio', label: 'Studio', swatch: 'linear-gradient(135deg,#f1f5f9,#cbd5e1,#94a3b8)' },
  { id: 'golden', label: 'Golden Hour', swatch: 'linear-gradient(135deg,#fb923c,#f59e0b,#fcd34d)' },
  { id: 'dramatic', label: 'Dramatic', swatch: 'linear-gradient(135deg,#0f172a,#1e293b,#334155)' },
  { id: 'backlit', label: 'Backlit', swatch: 'linear-gradient(135deg,#1e1b4b,#4338ca,#c7d2fe)' },
  { id: 'neon', label: 'Neon Glow', swatch: 'linear-gradient(135deg,#7c3aed,#06b6d4,#a855f7)' },
];
const BACKGROUND_OPTIONS = [
  { id: 'white', label: 'Pure White', swatch: 'linear-gradient(135deg,#ffffff,#f8fafc)' },
  { id: 'gradient', label: 'Gradient', swatch: 'linear-gradient(135deg,#818cf8,#c084fc,#fb7185)' },
  { id: 'location', label: 'On Location', swatch: 'linear-gradient(135deg,#78716c,#a8a29e,#57534e)' },
  { id: 'abstract', label: 'Abstract', swatch: 'linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6)' },
  { id: 'transparent', label: 'Transparent', swatch: 'conic-gradient(#cbd5e1 90deg,transparent 90deg) 0 0/10px 10px' },
  { id: 'textured', label: 'Textured', swatch: 'linear-gradient(135deg,#92400e,#b45309,#78350f)' },
];
const COLOR_GRADES = [
  { id: 'warm', label: 'Warm & Golden', swatch: 'linear-gradient(135deg,#f59e0b,#d97706,#b45309)' },
  { id: 'cool', label: 'Cool & Blue', swatch: 'linear-gradient(135deg,#60a5fa,#3b82f6,#1d4ed8)' },
  { id: 'matte', label: 'Desaturated / Matte', swatch: 'linear-gradient(135deg,#9ca3af,#6b7280,#4b5563)' },
  { id: 'contrast', label: 'High Contrast', swatch: 'linear-gradient(135deg,#000000 50%,#ffffff 50%)' },
  { id: 'pastel', label: 'Pastel & Soft', swatch: 'linear-gradient(135deg,#fbcfe8,#c4b5fd,#bae6fd)' },
  { id: 'film', label: 'Cinematic Film', swatch: 'linear-gradient(135deg,#451a03,#78350f,#92400e)' },
  { id: 'vivid', label: 'Vivid & Saturated', swatch: 'linear-gradient(135deg,#f43f5e,#a855f7,#22d3ee)' },
];

const DIMENSIONS = {
  'ad-creative': [
    { id: '1080x1080', label: '1080×1080', desc: 'Feed Square' },
    { id: '1080x1350', label: '1080×1350', desc: 'Feed Portrait' },
    { id: '1200x628', label: '1200×628', desc: 'Landscape Ad' },
    { id: '1080x1920', label: '1080×1920', desc: 'Story / Reel' },
    { id: '1280x720', label: '1280×720', desc: 'YouTube Thumb' },
    { id: '1000x1500', label: '1000×1500', desc: 'Pinterest' },
    { id: '1200x627', label: '1200×627', desc: 'LinkedIn Post' },
    { id: '864x1080', label: '864×1080', desc: '4:5 Portrait' },
  ],
  'product-photo': [
    { id: '1080x1080', label: '1080×1080', desc: 'Square' },
    { id: '1500x1500', label: '1500×1500', desc: 'Marketplace' },
    { id: '2000x2000', label: '2000×2000', desc: 'High Res' },
    { id: '800x1000', label: '800×1000', desc: 'Product Card' },
    { id: '1600x900', label: '1600×900', desc: 'Catalog Hero' },
    { id: '1080x1350', label: '1080×1350', desc: 'Feed Portrait' },
    { id: '970x600', label: '970×600', desc: 'Amazon A+' },
  ],
  'social-graphic': [
    { id: '1080x1080', label: '1080×1080', desc: 'Instagram Post' },
    { id: '1080x1920', label: '1080×1920', desc: 'Story / Reel' },
    { id: '1200x630', label: '1200×630', desc: 'Facebook / OG' },
    { id: '1500x500', label: '1500×500', desc: 'X / Twitter Header' },
    { id: '1000x1500', label: '1000×1500', desc: 'Pinterest' },
    { id: '1280x720', label: '1280×720', desc: 'YouTube Thumb' },
    { id: '1584x396', label: '1584×396', desc: 'LinkedIn Banner' },
    { id: '1080x608', label: '1080×608', desc: 'Facebook Cover' },
  ],
  'banner': [
    { id: '728x90', label: '728×90', desc: 'Leaderboard' },
    { id: '300x250', label: '300×250', desc: 'Medium Rectangle' },
    { id: '160x600', label: '160×600', desc: 'Wide Skyscraper' },
    { id: '1920x600', label: '1920×600', desc: 'Hero Banner' },
    { id: '320x50', label: '320×50', desc: 'Mobile Banner' },
    { id: '970x250', label: '970×250', desc: 'Billboard' },
    { id: '600x200', label: '600×200', desc: 'Email Header' },
    { id: '1440x400', label: '1440×400', desc: 'Full-Width Hero' },
  ],
};

const TEMPLATES = {
  'ad-creative': [
    { name: 'Product Showcase', subject: 'product showcase ad', builder: { vibe: 'clean', composition: 'centered', background: 'gradient', lighting: 'studio' } },
    { name: 'Before & After', subject: 'before & after comparison ad', builder: { composition: 'split', vibe: 'bold', lighting: 'studio' } },
    { name: 'Social Proof', subject: 'testimonial-style ad with social proof', builder: { vibe: 'clean', composition: 'centered', lighting: 'natural' } },
    { name: 'Limited Offer', subject: 'flash sale ad with urgency', builder: { vibe: 'bold', composition: 'centered', lighting: 'dramatic' } },
  ],
  'product-photo': [
    { name: 'Studio White', subject: 'professional product photo', builder: { setting: 'studio', background: 'white', lighting: 'studio', composition: 'centered' } },
    { name: 'Lifestyle Scene', subject: 'lifestyle product photo', builder: { setting: 'home', vibe: 'natural', lighting: 'natural', background: 'location' } },
    { name: 'Flat Lay', subject: 'flat lay product arrangement', builder: { composition: 'flatlay', lighting: 'natural', background: 'white' } },
    { name: 'Close-Up Detail', subject: 'macro close-up product detail', builder: { composition: 'closeup', lighting: 'studio', vibe: 'clean' } },
  ],
  'social-graphic': [
    { name: 'Quote Card', subject: 'elegant quote card', builder: { vibe: 'luxury', composition: 'centered', background: 'gradient' } },
    { name: 'Infographic', subject: 'data-driven infographic', builder: { vibe: 'clean', composition: 'centered', background: 'white' } },
    { name: 'Announcement', subject: 'bold announcement graphic', builder: { vibe: 'bold', composition: 'centered', lighting: 'dramatic' } },
    { name: 'Carousel Slide', subject: 'carousel slide with branding', builder: { vibe: 'clean', composition: 'centered', background: 'gradient' } },
  ],
  'banner': [
    { name: 'Hero CTA', subject: 'hero banner with CTA', builder: { composition: 'centered', background: 'gradient', lighting: 'studio' } },
    { name: 'Event Promo', subject: 'event promotion banner', builder: { vibe: 'bold', composition: 'centered', lighting: 'dramatic' } },
    { name: 'Sale Banner', subject: 'sale banner with discount', builder: { vibe: 'bold', composition: 'centered', background: 'gradient' } },
    { name: 'Newsletter Header', subject: 'email newsletter header', builder: { vibe: 'clean', composition: 'centered', background: 'white' } },
  ],
};

const COLOR_PALETTES = [
  { id: 'brand', name: 'Indigo', colors: ['#6366f1', '#8b5cf6', '#a78bfa'] },
  { id: 'warm', name: 'Warm Tones', colors: ['#f97316', '#ef4444', '#eab308'] },
  { id: 'cool', name: 'Cool Tones', colors: ['#06b6d4', '#3b82f6', '#8b5cf6'] },
  { id: 'earth', name: 'Earth Tones', colors: ['#92400e', '#78716c', '#65a30d'] },
  { id: 'mono', name: 'Monochrome', colors: ['#18181b', '#71717a', '#e4e4e7'] },
  { id: 'neon', name: 'Neon Pop', colors: ['#f43f5e', '#a855f7', '#C45D3E'] },
  { id: 'overload', name: 'Overload', colors: ['#C3A97A', '#B8893A', '#221F14'] },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Full-screen lightbox
function ImageLightbox({ images, index, onClose, type, onCreateVideo }) {
  const [current, setCurrent] = useState(index);
  const [promptCopied, setPromptCopied] = useState(false);
  const [caption, setCaption] = useState('');
  const [captionLoading, setCaptionLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setCurrent(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, images.length]);

  const img = images[current];
  const imgSrc = img?.dataUrl || img?.url;

  const copyPrompt = () => {
    navigator.clipboard.writeText(img.prompt || img.alt || '');
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  if (!img) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}>
      <div className="relative flex flex-col items-center max-w-5xl w-full max-h-screen p-4 sm:p-8"
        onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Counter */}
        {images.length > 1 && (
          <p className="hud-label text-[10px] mb-3" style={{ color: '#C45D3E' }}>
            {current + 1} / {images.length}
          </p>
        )}

        {/* Image */}
        <div className="relative w-full flex items-center justify-center">
          {images.length > 1 && current > 0 && (
            <button onClick={() => setCurrent(i => i - 1)}
              className="absolute left-0 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <img src={imgSrc} alt={img.alt || 'Generated creative'}
            className="max-h-[70vh] max-w-full rounded-xl object-contain"
            style={{ boxShadow: '0 0 80px rgba(196,93,62,0.12)' }} />
          {images.length > 1 && current < images.length - 1 && (
            <button onClick={() => setCurrent(i => i + 1)}
              className="absolute right-0 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Actions + prompt */}
        <div className="mt-4 w-full max-w-xl flex flex-col gap-2">
          <div className="flex gap-2 justify-center flex-wrap">
            <a href={imgSrc} download={`creative-${img.id || current}.png`}
              className="chip text-[10px]" style={{ background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' }}>
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </a>
            <button onClick={copyPrompt} className="chip text-[10px]"
              style={promptCopied ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)' } : {}}>
              {promptCopied ? 'Prompt Copied!' : 'Copy Prompt'}
            </button>
            {onCreateVideo && img.status === 'completed' && (
              <button onClick={() => { onClose(); onCreateVideo(img); }} className="chip text-[10px]"
                style={{ background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Create Video
              </button>
            )}
            <button
              onClick={() => {
                if (captionLoading) return;
                setCaption('');
                setCaptionLoading(true);
                connectSSE('/api/creative/caption', { prompt: img.prompt, alt: img.alt, type }, {
                  onChunk: (chunk) => setCaption(prev => prev + chunk),
                  onResult: () => setCaptionLoading(false),
                  onError: () => setCaptionLoading(false),
                  onDone: () => setCaptionLoading(false),
                });
              }}
              className="chip text-[10px]"
              style={{ color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', background: caption || captionLoading ? 'rgba(167,139,250,0.1)' : undefined }}>
              {captionLoading ? 'Writing...' : 'Generate Captions'}
            </button>
          </div>
          {img.prompt && (
            <p className="text-[11px] text-gray-500 text-center leading-relaxed px-4 line-clamp-3">{img.prompt}</p>
          )}
          {(caption || captionLoading) && (
            <div className="mt-1 bg-black/60 rounded-xl p-4 text-left max-h-52 overflow-y-auto text-xs text-gray-300 leading-relaxed whitespace-pre-wrap"
              style={{ borderLeft: '2px solid rgba(167,139,250,0.4)' }}>
              {caption}
              {captionLoading && <span className="inline-block w-[2px] h-3.5 bg-violet-400 ml-0.5 animate-pulse" />}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-4">
            {images.map((im, i) => {
              const src = im.dataUrl || im.url;
              return src ? (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === current ? 'border-[#C45D3E]' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Individual image card with proper error fallback
function ImageCard({ img, apiBase, onOpen, onRegenerate, onCreateVideo }) {
  const [failed, setFailed] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const imgSrc = img.dataUrl || (img.url ? `${apiBase}${img.url}` : null);
  const hasImage = !!imgSrc && !failed;
  const isPending = img.status === 'pending';

  const copyPrompt = () => {
    navigator.clipboard.writeText(img.prompt || img.alt || '');
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="panel rounded-2xl overflow-hidden group">
      <div className="relative">
        {isPending ? (
          // Skeleton loading state while this image is still generating
          <div className="w-full aspect-square flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(196,93,62,0.03)' }}>
            <div className="w-6 h-6 border-2 border-[#C45D3E]/30 border-t-[#C45D3E] rounded-full animate-spin" />
            <p className="hud-label text-[9px]" style={{ color: '#C45D3E' }}>RENDERING</p>
          </div>
        ) : hasImage ? (
          <>
            <img
              src={imgSrc}
              alt={img.alt || 'Generated creative'}
              loading="lazy"
              onError={() => setFailed(true)}
              onClick={onOpen}
              className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
            />
            <div onClick={onOpen}
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4 gap-2 px-4 cursor-zoom-in">
              <a href={imgSrc} download={`creative-${img.id || 'image'}.png`}
                onClick={e => e.stopPropagation()}
                className="chip text-[10px] w-full justify-center cursor-pointer" style={{ background: 'rgba(196,93,62,0.2)', borderColor: 'rgba(196,93,62,0.35)', color: '#C45D3E' }}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </a>
              {onCreateVideo && (
                <button onClick={e => { e.stopPropagation(); onCreateVideo(img); }}
                  className="chip text-[10px] w-full justify-center"
                  style={{ background: 'rgba(139,92,246,0.25)', borderColor: 'rgba(139,92,246,0.4)', color: '#a78bfa' }}>
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Create Video
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); copyPrompt(); }} className="chip text-[10px] w-full justify-center">
                {promptCopied ? 'Copied!' : 'Copy Prompt'}
              </button>
            </div>
          </>
        ) : (
          <div className="w-full aspect-square flex flex-col items-center justify-center p-5 text-center gap-3"
            style={{ background: 'rgba(196,93,62,0.04)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(196,93,62,0.06)', border: '1px solid rgba(196,93,62,0.12)' }}>
              <svg className="w-5 h-5 text-[#C45D3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              {img.error ? (
                <>
                  <p className="hud-label text-[9px] mb-1.5" style={{ color: '#f87171' }}>FAILED</p>
                  <p className="text-[10px] text-red-400/80 leading-relaxed line-clamp-3">{img.error}</p>
                </>
              ) : (
                <>
                  <p className="hud-label text-[9px] mb-1.5" style={{ color: '#C45D3E' }}>AI PROMPT READY</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-4">{img.prompt || img.alt}</p>
                </>
              )}
            </div>
            <button onClick={copyPrompt}
              className="chip text-[10px] mt-1" style={{ color: promptCopied ? '#4ade80' : '#C45D3E', borderColor: promptCopied ? 'rgba(74,222,128,0.3)' : 'rgba(196,93,62,0.2)' }}>
              {promptCopied ? 'Copied!' : 'Copy Prompt'}
            </button>
          </div>
        )}
      </div>

      {/* Footer: style notes + regenerate */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
        {img.style_notes
          ? <p className="text-[10px] text-gray-600 line-clamp-1 flex-1">{img.style_notes}</p>
          : <span className="flex-1" />
        }
        {onRegenerate && img.prompt && (
          <button onClick={onRegenerate}
            className="flex-shrink-0 flex items-center gap-1 text-[9px] text-gray-600 hover:text-[#C45D3E] transition-colors"
            title="Regenerate this image">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreativePage() {
  usePageTitle('Creative & Design');
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { brand } = useBrandContext();

  const handleCreateVideo = (img) => {
    const url = img.dataUrl || img.url || null;
    if (!url) return;
    navigate('/video-marketing', {
      state: {
        creativeImport: {
          url,
          alt: img.alt || img.prompt || 'Creative image',
        },
      },
    });
  };
  const [activeType, setActiveType] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('minimal');
  const [dimension, setDimension] = useState(null);
  const [palette, setPalette] = useState('brand');
  const [quantity, setQuantity] = useState('4');
  const [useBrandHub, setUseBrandHub] = useState(false);
  const [noText, setNoText] = useState(true);
  const [referenceImages, setReferenceImages] = useState([]); // [{ dataUrl, base64, mimeType, name }]
  const [imageColors, setImageColors] = useState([]); // dominant colors extracted from first reference image
  const fileInputRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { index: number }
  const [activeTab, setActiveTab] = useState('generate');
  const [showInput, setShowInput] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyView, setHistoryView] = useState('grid');
  const [historyLightbox, setHistoryLightbox] = useState(null); // { images, index }

  // Creative Brief state
  const [briefProduct, setBriefProduct] = useState('');
  const [briefGoal, setBriefGoal] = useState('Brand Awareness');
  const [briefAudience, setBriefAudience] = useState('');
  const [briefOutput, setBriefOutput] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);
  const [briefUseBrand, setBriefUseBrand] = useState(false);
  const [briefKeyMessage, setBriefKeyMessage] = useState('');
  const [briefTone, setBriefTone] = useState('');
  const [briefScale, setBriefScale] = useState('Awareness');
  const [briefRefStyle, setBriefRefStyle] = useState('');
  const [briefShotType, setBriefShotType] = useState('');
  const [briefProductPlacement, setBriefProductPlacement] = useState('');
  const [briefModelDirection, setBriefModelDirection] = useState('');
  const [briefPlatform, setBriefPlatform] = useState('');

  // Visual Prompt Builder state
  const [promptMode, setPromptMode] = useState('builder'); // 'builder' | 'manual'
  const [builderSubject, setBuilderSubject] = useState('');
  const [builderVibe, setBuilderVibe] = useState('');
  const [builderLighting, setBuilderLighting] = useState('');
  const [builderBackground, setBuilderBackground] = useState('');
  const [builderTextOverlay, setBuilderTextOverlay] = useState('');
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [builderModelGender, setBuilderModelGender] = useState('');
  const [builderModelAge, setBuilderModelAge] = useState('');
  const [builderModelStyle, setBuilderModelStyle] = useState('');
  const [builderModelPose, setBuilderModelPose] = useState('');
  const [builderProductPlacement, setBuilderProductPlacement] = useState('');
  const [builderSetting, setBuilderSetting] = useState('');
  const [builderComposition, setBuilderComposition] = useState('');
  const [builderColorGrade, setBuilderColorGrade] = useState('');
  const [expandedAttr, setExpandedAttr] = useState(null);
  const pickAttr = (setter, id, current, attr) => { setter(id === current ? '' : id); setExpandedAttr(null); };

  const applyTemplate = (t) => {
    setBuilderSubject(t.subject);
    setPromptMode('builder');
    const b = t.builder || {};
    if (b.vibe) setBuilderVibe(b.vibe);
    if (b.setting) setBuilderSetting(b.setting);
    if (b.composition) setBuilderComposition(b.composition);
    if (b.lighting) setBuilderLighting(b.lighting);
    if (b.background) setBuilderBackground(b.background);
    if (b.colorGrade) setBuilderColorGrade(b.colorGrade);
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchJSON('/api/creative/projects');
      const list = data?.projects || (Array.isArray(data) ? data : []);
      setHistory(list);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeType && activeTab === 'history') loadHistory();
  }, [activeTab, activeType, loadHistory]);

  // Auto-assemble prompt from builder selections
  useEffect(() => {
    if (promptMode !== 'builder') return;
    const parts = [];
    if (builderSubject) parts.push(builderSubject);
    const vibeObj = VIBES.find(v => v.id === builderVibe);
    if (vibeObj) parts.push(vibeObj.prompt);
    if (showModels && builderModelGender) {
      const gObj = MODEL_GENDERS.find(g => g.id === builderModelGender);
      let modelDesc = gObj?.prompt || 'person';
      if (builderModelAge) modelDesc = `${builderModelAge.toLowerCase()}, ${modelDesc}`;
      if (builderModelStyle) modelDesc += `, wearing ${builderModelStyle.toLowerCase()} clothing`;
      parts.push(`featuring a ${modelDesc}`);
      if (builderModelPose) { const p = MODEL_POSES.find(x => x.id === builderModelPose); if (p) parts.push(p.prompt); }
      if (builderProductPlacement) { const p = PRODUCT_PLACEMENTS.find(x => x.id === builderProductPlacement); if (p) parts.push(p.prompt); }
    }
    if (builderSetting) { const s = SETTINGS.find(x => x.id === builderSetting); if (s) parts.push(s.prompt); }
    if (builderComposition) { const c = COMPOSITIONS.find(x => x.id === builderComposition); if (c) parts.push(c.prompt); }
    if (builderLighting) { const l = LIGHTING_OPTIONS.find(x => x.id === builderLighting); if (l) parts.push(`${l.label.toLowerCase()} lighting`); }
    if (builderBackground) { const b = BACKGROUND_OPTIONS.find(x => x.id === builderBackground); if (b) parts.push(`${b.label.toLowerCase()} background`); }
    if (builderColorGrade) { const g = COLOR_GRADES.find(x => x.id === builderColorGrade); if (g) parts.push(`${g.label.toLowerCase()} color grading`); }
    if (showTextOverlay && builderTextOverlay) parts.push(`include text overlay reading "${builderTextOverlay}"`);
    setPrompt(parts.join(', '));
  }, [promptMode, builderSubject, builderVibe, showModels, builderModelGender, builderModelAge, builderModelStyle, builderSetting, builderComposition, builderLighting, builderBackground, builderColorGrade, showTextOverlay, builderTextOverlay]);

  const deleteProject = async (id) => {
    try {
      await deleteJSON(`/api/creative/projects/${id}`);
      setHistory(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  const regenerateImage = useCallback((img, index) => {
    const selectedDim = (DIMENSIONS[activeType] || []).find(d => d.id === dimension);
    setImages(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'pending', url: null, dataUrl: null, error: null };
      return next;
    });
    connectSSE('/api/creative/regenerate', { prompt: img.prompt, dimension: selectedDim?.id }, {
      onResult: (data) => {
        setImages(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'completed', url: data.url, dataUrl: data.dataUrl };
          return next;
        });
      },
      onError: (err) => {
        setImages(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'failed', error: err };
          return next;
        });
      },
    });
  }, [activeType, dimension]);

  const downloadAll = () => {
    images.filter(im => im.dataUrl || im.url).forEach((im, i) => {
      const a = document.createElement('a');
      a.href = im.dataUrl || `${API_BASE}${im.url}`;
      a.download = `creative-${i + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  // Extract dominant colors from first reference image via Canvas
  useEffect(() => {
    if (!referenceImages.length) { setImageColors([]); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 80;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const counts = {};
      const bucket = 36;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // skip transparent
        const r = Math.round(data[i] / bucket) * bucket;
        const g = Math.round(data[i + 1] / bucket) * bucket;
        const b = Math.round(data[i + 2] / bucket) * bucket;
        if ((r + g + b) / 3 < 25 || (r + g + b) / 3 > 230) continue; // skip near-black/white
        const key = `${r},${g},${b}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      const colors = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([rgb]) => {
          const [r, g, b] = rgb.split(',').map(Number);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });
      setImageColors(colors);
    };
    img.src = referenceImages[0].dataUrl;
  }, [referenceImages]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const base64 = dataUrl.split(',')[1];
        setReferenceImages(prev => {
          const next = [...prev, { dataUrl, base64, mimeType: file.type, name: file.name }];
          if (prev.length === 0) setPalette('image-colors');
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (idx) => {
    setReferenceImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) { setImageColors([]); if (palette === 'image-colors') setPalette('brand'); }
      return next;
    });
  };

  const generate = () => {
    if (!activeType) return;
    if (!referenceImages.length && !prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setImages([]);
    setShowInput(false);
    const selectedStyle = STYLES.find(s => s.id === style);
    const selectedDim = (DIMENSIONS[activeType] || []).find(d => d.id === dimension);
    const selectedPalette = palette === 'image-colors' && imageColors.length
      ? { name: 'Image Colors', colors: imageColors }
      : COLOR_PALETTES.find(p => p.id === palette);

    if (referenceImages.length) {
      // Variation mode — use reference image endpoint
      connectSSE('/api/creative/generate-from-image-stream', {
        type: activeType,
        prompt: prompt.trim(),
        images: referenceImages.map(r => ({ base64: r.base64, mimeType: r.mimeType })),
        style: selectedStyle?.name,
        palette: selectedPalette?.name,
        paletteColors: selectedPalette?.colors,
        useBrand: useBrandHub,
        noText,
        quantity,
        dimension: selectedDim?.id,
      }, {
        onChunk: (text) => {
          try {
            const msg = JSON.parse(text);
            if (msg.step === 'prompts_ready') {
              setImages((msg.prompts || []).map((p, i) => ({
                id: `pending-${i}`, prompt: p.prompt, alt: p.alt,
                style_notes: p.style_notes, status: 'pending', url: null, dataUrl: null,
              })));
            } else if (msg.step === 'image') {
              setImages(prev => {
                const next = [...prev];
                next[msg.index] = { ...next[msg.index], ...msg.image };
                return next;
              });
            }
          } catch { /* non-JSON chunks */ }
        },
        onResult: () => { setGenerating(false); loadHistory(); },
        onError: (err) => {
          setError(err || 'Generation failed. Please try again.');
          setGenerating(false);
          setShowInput(true);
        },
        onDone: () => { setGenerating(false); loadHistory(); },
      });
      return;
    }

    const fullPrompt = `[Dimensions: ${selectedDim?.id || 'Auto'}] [Quantity: ${quantity}]\n\n${prompt}`;

    connectSSE('/api/creative/generate-stream', {
      type: activeType,
      prompt: fullPrompt,
      style: selectedStyle?.name,
      palette: selectedPalette?.name,
      paletteColors: selectedPalette?.colors,
      useBrand: useBrandHub,
      noText,
    }, {
      onChunk: (text) => {
        try {
          const msg = JSON.parse(text);
          if (msg.step === 'prompts_ready') {
            setImages((msg.prompts || []).map((p, i) => ({
              id: `pending-${i}`, prompt: p.prompt, alt: p.alt,
              style_notes: p.style_notes, status: 'pending', url: null, dataUrl: null,
            })));
          } else if (msg.step === 'image') {
            setImages(prev => {
              const next = [...prev];
              next[msg.index] = { ...next[msg.index], ...msg.image };
              return next;
            });
          }
        } catch { /* non-JSON chunks */ }
      },
      onResult: () => { setGenerating(false); loadHistory(); },
      onError: (err) => {
        setError(err || 'Generation failed. Please try again.');
        setGenerating(false);
        setShowInput(true);
      },
      onDone: () => { setGenerating(false); loadHistory(); },
    });
  };

  const applyBriefToGenerate = () => {
    if (briefOutput) {
      setPrompt(briefOutput.slice(0, 2000));
      setActiveTab('generate');
      setShowInput(true);
    }
  };

  // ────────────────────────────────────────────────────────
  //  LANDING SCREEN
  // ────────────────────────────────────────────────────────
  if (!activeType) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <ModuleWrapper moduleId="creative">
        <div className="mb-8 sm:mb-10 animate-fade-in">
          <p className="hud-label text-[11px] mb-3" style={{ color: '#C45D3E' }}>AI CREATIVE STUDIO</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">What do you want to create?</h1>
          <p className="text-base text-gray-500 max-w-lg">Pick a creative type and let AI handle the heavy lifting — from smart prompts to polished visuals.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 stagger">
          {CREATIVE_TYPES.map(type => (
            <button key={type.id} onClick={() => { setActiveType(type.id); setDimension(DIMENSIONS[type.id]?.[0]?.id || null); setActiveTab('generate'); setImages([]); setShowInput(true); setReferenceImage(null); setPromptMode('builder'); setBuilderSubject(''); setBuilderVibe(''); setBuilderLighting(''); setBuilderBackground(''); setShowTextOverlay(false); setBuilderTextOverlay(''); setShowModels(false); setBuilderModelGender(''); setBuilderModelAge(''); setBuilderModelStyle(''); setBuilderSetting(''); setBuilderComposition(''); setBuilderColorGrade(''); }}
              className="panel-interactive rounded-2xl p-5 sm:p-6 text-left group relative overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 20% 50%, ${type.accent}18 0%, transparent 60%)` }} />
              <div className="flex items-start gap-4 mb-4">
                <div className="rounded-xl flex items-center justify-center flex-shrink-0 text-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{ width: 52, height: 52, background: `${type.accent}18`, border: `1px solid ${type.accent}30` }}>
                  {type.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">{type.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{type.desc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {type.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${type.accent}15`, color: type.accent, border: `1px solid ${type.accent}25` }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold"
                style={{ color: type.accent }}>
                Start creating
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-3 sm:gap-5 mb-4">
            <p className="hud-label text-[11px]">QUICK START TEMPLATES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            {Object.entries(TEMPLATES).flatMap(([type, tmpls]) =>
              tmpls.slice(0, 1).map(t => {
                const ct = CREATIVE_TYPES.find(c => c.id === type);
                return (
                  <button key={`${type}-${t.name}`} onClick={() => { setActiveType(type); applyTemplate(t); setDimension(DIMENSIONS[type]?.[0]?.id || null); setActiveTab('generate'); setShowInput(true); }}
                    className="panel-interactive rounded-xl p-4 sm:p-5 text-left group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{ct?.emoji}</span>
                      <p className="hud-label text-[10px]" style={{ color: ct?.accent || '#C45D3E' }}>{ct?.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{t.name}</p>
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">{t.subject}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
        </ModuleWrapper>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  //  GENERATOR SCREEN
  // ────────────────────────────────────────────────────────
  const currentType = CREATIVE_TYPES.find(t => t.id === activeType);
  const templates = TEMPLATES[activeType] || [];
  const dims = DIMENSIONS[activeType] || [];
  const hasOutput = images.length > 0 || generating;
  const promptReadyCount = images.filter(i => i.status === 'prompt_ready').length;

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="creative">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveType(null); setImages([]); setPrompt(''); setActiveTab('generate'); setShowInput(true); setError(null); setReferenceImage(null); setImageColors([]); if (palette === 'image-colors') setPalette('brand'); }}
          className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="hud-label text-[11px]" style={{ color: '#C45D3E' }}>{currentType?.name?.toUpperCase()} GENERATOR</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Create {currentType?.name}</h2>
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {[
            { id: 'generate', label: 'Generate' },
            { id: 'brief', label: 'Creative Brief' },
            { id: 'history', label: 'History' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'history') loadHistory(); }}
              className={`chip text-[10px] ${activeTab === tab.id ? 'active' : ''}`}
              style={activeTab === tab.id ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="animate-fade-in">
          {/* Controls */}
          {!historyLoading && history.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="hud-label text-[11px]" style={{ color: '#4ade80' }}>
                {history.length} PROJECT{history.length !== 1 ? 'S' : ''}
              </p>
              <div className="flex items-center gap-1">
                {[
                  { id: 'grid', icon: 'M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z' },
                  { id: 'list', icon: 'M3 5h14M3 9h14M3 13h14M3 17h14' },
                ].map(v => (
                  <button key={v.id} onClick={() => setHistoryView(v.id)}
                    className="p-1.5 rounded-md transition-all"
                    style={historyView === v.id
                      ? { background: 'rgba(196,93,62,0.1)', border: '1px solid rgba(196,93,62,0.2)', color: '#C45D3E' }
                      : { border: '1px solid rgba(255,255,255,0.06)', color: '#4b5563' }}>
                    <svg className="w-3.5 h-3.5" fill={v.id === 'grid' ? 'currentColor' : 'none'} stroke={v.id === 'list' ? 'currentColor' : 'none'} strokeWidth={v.id === 'list' ? 2 : undefined} viewBox="0 0 16 20">
                      <path strokeLinecap={v.id === 'list' ? 'round' : undefined} d={v.icon} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {historyLoading ? (
            <div className="panel rounded-2xl p-10 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#C45D3E] animate-pulse" />
                <span className="hud-label text-[11px]" style={{ color: '#C45D3E' }}>LOADING</span>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="panel rounded-2xl p-10 text-center">
              <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-gray-500 text-sm">No projects yet. Generate some creatives to see them here.</p>
            </div>

          ) : historyView === 'grid' ? (
            /* ── GRID VIEW ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {history.map(project => {
                const imageUrls = project.images?.length ? project.images.filter(i => i.status === 'completed' && i.url).map(i => i.url) : project.image_urls ? project.image_urls.split(',').filter(Boolean) : [];
                const typeLabel = CREATIVE_TYPES.find(t => t.id === project.type)?.name || project.type;
                const lbImages = imageUrls.map((url, i) => ({ url: `${API_BASE}${url}`, alt: project.title || 'Creative', id: `h-${project.id}-${i}` }));
                const displayUrls = imageUrls.slice(0, 4);
                const extraCount = imageUrls.length - 4;

                return (
                  <div key={project.id} className="panel rounded-2xl overflow-hidden group/card">
                    {/* Image mosaic */}
                    {imageUrls.length > 0 ? (
                      <div className={`grid gap-0.5 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {displayUrls.map((url, i) => (
                          <div key={i} className="relative overflow-hidden group/img min-h-16 bg-white/[0.02]"
                            style={{ aspectRatio: imageUrls.length === 1 ? '4/3' : '1' }}>
                            <img src={`${API_BASE}${url}`} alt="" loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105 cursor-zoom-in"
                              onClick={() => setHistoryLightbox({ images: lbImages, index: i })}
                              onError={e => { e.currentTarget.style.display = 'none'; }} />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/50 transition-colors pointer-events-none" />
                            <div className="absolute inset-0 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                              <button
                                onClick={e => { e.stopPropagation(); handleCreateVideo({ url: `${API_BASE}${url}`, alt: project.title || 'Creative' }); }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 pointer-events-auto"
                                style={{ background: 'rgba(196,93,62,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                                ▶ Create Video
                              </button>
                              <button onClick={() => setHistoryLightbox({ images: lbImages, index: i })}
                                className="pointer-events-auto"
                                title="View full image">
                                <svg className="w-4 h-4 text-white/70 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                </svg>
                              </button>
                            </div>
                            {i === 3 && extraCount > 0 && (
                              <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">+{extraCount}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="aspect-video flex items-center justify-center" style={{ background: 'rgba(196,93,62,0.03)' }}>
                        <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}

                    {/* Card footer */}
                    <div className="p-3 border-t border-gray-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="hud-label text-[9px]" style={{ color: '#C45D3E' }}>{typeLabel}</span>
                            <span className="text-[10px] text-gray-600">{formatDate(project.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-300 truncate font-medium">{project.title || 'Untitled'}</p>
                          {imageUrls.length > 0 && (
                            <p className="text-[10px] text-gray-600 mt-0.5">{imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                        <button onClick={() => deleteProject(project.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover/card:opacity-100"
                          title="Delete project">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (
            /* ── LIST VIEW ── */
            <div className="space-y-2">
              {history.map(project => {
                const imageUrls = project.images?.length ? project.images.filter(i => i.status === 'completed' && i.url).map(i => i.url) : project.image_urls ? project.image_urls.split(',').filter(Boolean) : [];
                const typeLabel = CREATIVE_TYPES.find(t => t.id === project.type)?.name || project.type;
                const lbImages = imageUrls.map((url, i) => ({ url: `${API_BASE}${url}`, alt: project.title || 'Creative', id: `h-${project.id}-${i}` }));

                return (
                  <div key={project.id} className="panel rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 group">
                    {/* Clickable thumbnails */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      {imageUrls.slice(0, 3).map((url, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden group/thumb">
                          <img src={`${API_BASE}${url}`} alt="" loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110 cursor-zoom-in"
                            onClick={() => setHistoryLightbox({ images: lbImages, index: i })}
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/60 transition-colors pointer-events-none" />
                          <div className="absolute inset-0 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={e => { e.stopPropagation(); handleCreateVideo({ url: `${API_BASE}${url}`, alt: project.title || 'Creative' }); }}
                              className="text-[8px] font-bold text-white leading-tight text-center px-1"
                              title="Create Video">
                              ▶ Video
                            </button>
                          </div>
                        </div>
                      ))}
                      {imageUrls.length === 0 && (
                        <div className="w-14 h-14 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(196,93,62,0.05)', border: '1px solid rgba(196,93,62,0.08)' }}>
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                      )}
                      {imageUrls.length > 3 && (
                        <div className="w-14 h-14 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ background: 'rgba(196,93,62,0.06)', border: '1px solid rgba(196,93,62,0.12)' }}
                          onClick={() => setHistoryLightbox({ images: lbImages, index: 3 })}>
                          <span className="text-xs font-bold text-[#C45D3E]">+{imageUrls.length - 3}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="hud-label text-[9px]" style={{ color: '#C45D3E' }}>{typeLabel}</span>
                        <span className="text-[10px] text-gray-600">{formatDate(project.created_at)}</span>
                        {imageUrls.length > 0 && <span className="text-[10px] text-gray-600">{imageUrls.length} images</span>}
                      </div>
                      <p className="text-sm text-gray-300 truncate">{project.title || 'Untitled'}</p>
                    </div>

                    <button onClick={() => deleteProject(project.id)}
                      className="flex-shrink-0 p-2 rounded-lg text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* History lightbox */}
          {historyLightbox && (
            <ImageLightbox
              images={historyLightbox.images}
              index={Math.min(historyLightbox.index, historyLightbox.images.length - 1)}
              onClose={() => setHistoryLightbox(null)}
              type={activeType}
              onCreateVideo={handleCreateVideo}
            />
          )}
        </div>
      )}

      {/* ── CREATIVE BRIEF TAB ── */}
      {activeTab === 'brief' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
          {/* Left: Brief form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="hud-label text-[11px]">BRIEF DETAILS</p>
                {brand?.brand_name && (
                  <button onClick={() => setBriefUseBrand(v => !v)}
                    className={`chip flex items-center gap-2 text-[10px] font-semibold transition-all ${briefUseBrand ? 'active' : ''}`}
                    style={briefUseBrand ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                    <span className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0"
                      style={{ background: briefUseBrand ? '#C45D3E' : 'currentColor', opacity: briefUseBrand ? 1 : 0.25 }}>
                      <span className="inline-block h-3 w-3 rounded-full bg-white shadow transition-transform"
                        style={{ transform: briefUseBrand ? 'translateX(14px)' : 'translateX(2px)' }} />
                    </span>
                    Include Brand Hub
                  </button>
                )}
              </div>

              {briefUseBrand && brand?.brand_name && (
                <div className="mb-4 px-3 py-2.5 rounded-xl text-[11px] leading-relaxed"
                  style={{ background: 'rgba(196,93,62,0.06)', border: '1px solid rgba(196,93,62,0.12)', color: '#C45D3E' }}>
                  <span className="font-semibold">{brand.brand_name}</span>
                  {brand.tagline && <span className="text-[#C45D3E]/60"> · {brand.tagline}</span>}
                  {brand.colors?.primary && (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: brand.colors.primary }} />
                      <span className="text-[#C45D3E]/60">{brand.colors.primary}</span>
                    </span>
                  )}
                  {brand.voice_tone && <span className="ml-2 text-[#C45D3E]/60">· {Array.isArray(brand.voice_tone) ? brand.voice_tone.join(', ') : brand.voice_tone}</span>}
                </div>
              )}

              <div className="space-y-6">

                {/* ── Group 1: Campaign Basics ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#C45D3E' }}>01</span>
                    <p className="text-[11px] font-semibold text-gray-300">Campaign Basics</p>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">PRODUCT / BRAND</p>
                    <input className="w-full input-field rounded-xl px-4 py-3 text-sm"
                      value={briefProduct} onChange={e => setBriefProduct(e.target.value)}
                      placeholder={brand?.brand_name && briefUseBrand ? `e.g. ${brand.brand_name} Summer Collection` : 'e.g. Premium Skincare Serum'} />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">CAMPAIGN GOAL</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Brand Awareness', 'Product Launch', 'Conversion', 'Retargeting', 'Seasonal Campaign'].map(g => (
                        <button key={g} onClick={() => setBriefGoal(g)}
                          className="chip text-[10px]"
                          style={briefGoal === g ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">CAMPAIGN SCALE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Awareness', 'Testing', 'Full Campaign', 'Product Launch'].map(s => (
                        <button key={s} onClick={() => setBriefScale(s)}
                          className="chip text-[10px]"
                          style={briefScale === s ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Group 2: Audience & Messaging ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#a78bfa' }}>02</span>
                    <p className="text-[11px] font-semibold text-gray-300">Audience & Messaging</p>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">TARGET AUDIENCE</p>
                    <input className="w-full input-field rounded-xl px-4 py-3 text-sm"
                      value={briefAudience} onChange={e => setBriefAudience(e.target.value)}
                      placeholder="e.g. Women 25–45, health-conscious" />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">KEY MESSAGE</p>
                    <input className="w-full input-field rounded-xl px-4 py-3 text-sm"
                      value={briefKeyMessage} onChange={e => setBriefKeyMessage(e.target.value)}
                      placeholder="e.g. Feel confident in your skin, effortlessly" />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">TONE OF VOICE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Playful', 'Professional', 'Urgent', 'Inspirational', 'Luxury', 'Friendly', 'Bold'].map(t => (
                        <button key={t} onClick={() => setBriefTone(briefTone === t ? '' : t)}
                          className="chip text-[10px]"
                          style={briefTone === t ? { background: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa' } : {}}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Group 3: Creative Direction ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#4ade80' }}>03</span>
                    <p className="text-[11px] font-semibold text-gray-300">Creative Direction</p>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">REFERENCE STYLE</p>
                    <input className="w-full input-field rounded-xl px-4 py-3 text-sm"
                      value={briefRefStyle} onChange={e => setBriefRefStyle(e.target.value)}
                      placeholder="e.g. Apple-minimalist, Nike-bold, Glossier-soft pastel" />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">SHOT TYPE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Hero Shot', 'Lifestyle', 'Action / Motion', 'Close-Up Detail', 'Flat Lay', 'Editorial', 'UGC Style', 'Behind the Scenes'].map(s => (
                        <button key={s} onClick={() => setBriefShotType(briefShotType === s ? '' : s)}
                          className="chip text-[10px]"
                          style={briefShotType === s ? { background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.25)', color: '#4ade80' } : {}}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">PRODUCT PLACEMENT</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRODUCT_PLACEMENTS.map(p => (
                        <button key={p.id} onClick={() => setBriefProductPlacement(briefProductPlacement === p.id ? '' : p.id)}
                          className="chip text-[10px]"
                          style={briefProductPlacement === p.id ? { background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.25)', color: '#4ade80' } : {}}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">MODEL DIRECTION</p>
                    <input className="w-full input-field rounded-xl px-4 py-3 text-sm"
                      value={briefModelDirection} onChange={e => setBriefModelDirection(e.target.value)}
                      placeholder="e.g. Model skateboarding with chain visible, posing bracelet to mirror" />
                  </div>
                  <div>
                    <p className="hud-label text-[10px] mb-1.5">PLATFORM</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Instagram Feed', 'Instagram Story', 'TikTok', 'Facebook Ads', 'Pinterest', 'Website Hero', 'Email', 'Print'].map(p => (
                        <button key={p} onClick={() => setBriefPlatform(briefPlatform === p ? '' : p)}
                          className="chip text-[10px]"
                          style={briefPlatform === p ? { background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.25)', color: '#4ade80' } : {}}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <button onClick={() => {
                setBriefOutput('');
                setBriefLoading(true);
                connectSSE('/api/creative/generate-brief', {
                  product: briefProduct, goal: briefGoal, audience: briefAudience,
                  keyMessage: briefKeyMessage, tone: briefTone, scale: briefScale, refStyle: briefRefStyle,
                  shotType: briefShotType,
                  productPlacement: briefProductPlacement ? PRODUCT_PLACEMENTS.find(p => p.id === briefProductPlacement)?.label : '',
                  modelDirection: briefModelDirection,
                  platform: briefPlatform,
                  brand: briefUseBrand && brand ? {
                    name: brand.brand_name,
                    tagline: brand.tagline,
                    colors: brand.colors,
                    voice_tone: Array.isArray(brand.voice_tone) ? brand.voice_tone.join(', ') : brand.voice_tone,
                    mission: brand.mission,
                    keywords: brand.keywords,
                    words_to_use: brand.words_to_use,
                    words_to_avoid: brand.words_to_avoid,
                  } : null,
                }, {
                  onChunk: (chunk) => setBriefOutput(prev => prev + chunk),
                  onResult: () => setBriefLoading(false),
                  onError: () => setBriefLoading(false),
                  onDone: () => setBriefLoading(false),
                });
              }}
              disabled={!briefProduct || briefLoading}
              className="btn-accent w-full py-3 rounded-lg font-bold text-sm tracking-wide"
              style={{ background: briefLoading ? '#1e1e2e' : '#C45D3E', boxShadow: briefLoading ? 'none' : '0 4px 20px -4px rgba(196,93,62,0.35)' }}>
              {briefLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                  GENERATING BRIEF...
                </span>
              ) : 'GENERATE CREATIVE BRIEF'}
            </button>

            {/* Brief output */}
            {briefOutput && (
              <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: briefLoading ? '#C45D3E' : '#4ade80', animation: briefLoading ? 'pulse 1s infinite' : 'none' }} />
                    <span className="hud-label text-[11px]" style={{ color: briefLoading ? '#C45D3E' : '#4ade80' }}>
                      {briefLoading ? 'GENERATING' : 'CREATIVE BRIEF'}
                    </span>
                  </div>
                  {!briefLoading && (
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(briefOutput); setBriefCopied(true); setTimeout(() => setBriefCopied(false), 2000); }}
                        className="chip text-[10px]" style={{ color: briefCopied ? '#4ade80' : undefined }}>
                        {briefCopied ? 'Copied!' : 'Copy'}
                      </button>
                      <button onClick={applyBriefToGenerate}
                        className="chip text-[10px]" style={{ color: '#C45D3E', borderColor: 'rgba(196,93,62,0.25)', background: 'rgba(196,93,62,0.08)' }}>
                        Use as Brief →
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-black/40 rounded-xl p-4 sm:p-5 max-h-[55vh] overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed"
                  style={{ borderLeft: '2px solid rgba(196,93,62,0.25)' }}>
                  {briefOutput}
                  {briefLoading && <span className="inline-block w-[2px] h-4 bg-[#C45D3E] ml-0.5 animate-pulse" />}
                </div>
              </div>
            )}
          </div>

          {/* Right: tips sidebar */}
          <div className="space-y-4">
            <div className="panel rounded-2xl p-4 sm:p-5">
              <p className="hud-label text-[11px] mb-3">HOW IT WORKS</p>
              <div className="space-y-3">
                {[
                  { step: '01', text: 'Describe your product and campaign goal' },
                  { step: '02', text: 'AI generates a full creative direction with color, type, and messaging' },
                  { step: '03', text: 'Click "Use as Brief →" to apply it to your image generation' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="hud-label text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#C45D3E' }}>{s.step}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-5">
              <p className="hud-label text-[11px] mb-3">WHAT'S INCLUDED</p>
              <div className="space-y-2">
                {['Visual Direction', 'Color Palette (with hex codes)', 'Typography recommendations', 'Messaging Hierarchy', "Do's & Don'ts", 'Reference Aesthetic'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GENERATE TAB ── */}
      {activeTab === 'generate' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left: Input */}
            <div className="lg:col-span-2 space-y-4">
              {showInput && !generating && (
                <div className="space-y-4 animate-fade-in">

                  {/* ── VISUAL PROMPT BUILDER ── */}
                  <div className="panel rounded-2xl p-4 sm:p-5 space-y-5">
                    {/* Header: mode toggle + quick templates */}
                    <div className="flex items-center justify-between">
                      <p className="hud-label text-[11px]">PROMPT BUILDER</p>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
                        {[{ id: 'builder', label: '✦ Visual' }, { id: 'manual', label: '✎ Manual' }].map(m => (
                          <button key={m.id} onClick={() => setPromptMode(m.id)}
                            className="px-3 py-1 rounded-md text-[10px] font-semibold transition-all"
                            style={promptMode === m.id
                              ? { background: 'rgba(196,93,62,0.15)', color: '#C45D3E', border: '1px solid rgba(196,93,62,0.2)' }
                              : { color: '#4b5563' }}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {promptMode === 'builder' ? (
                      <div>
                        {/* ── Step 1: Subject ── */}
                        <div className="flex gap-3 pb-5">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)', color: '#C45D3E' }}>1</div>
                            <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                          </div>
                          <div className="flex-1 pt-0.5 space-y-2.5 min-w-0">
                            <p className="text-[12px] font-semibold text-gray-200">What are you designing?</p>
                            <input className="w-full input-field rounded-xl px-4 py-2.5 text-sm"
                              value={builderSubject} onChange={e => setBuilderSubject(e.target.value)}
                              placeholder="e.g. a luxury skincare serum, a minimalist sneaker, a coffee brand..." />
                            <div className="flex flex-wrap gap-1.5">
                              {templates.map(t => (
                                <button key={t.name} onClick={() => applyTemplate(t)}
                                  className="chip text-[10px]">
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Step 2: Vibe ── */}
                        <div className="flex gap-3 pb-5">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)', color: '#C45D3E' }}>2</div>
                            <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                          </div>
                          <div className="flex-1 pt-0.5 min-w-0">
                            <p className="text-[12px] font-semibold text-gray-200 mb-2.5">Vibe & Mood</p>
                            <div className="grid grid-cols-6 gap-1.5">
                              {VIBES.map(v => (
                                <button key={v.id} onClick={() => setBuilderVibe(builderVibe === v.id ? '' : v.id)}
                                  className="relative rounded-lg overflow-hidden text-left transition-all duration-200"
                                  style={{
                                    background: v.gradient,
                                    aspectRatio: '1/1',
                                    outline: builderVibe === v.id ? '2px solid #C45D3E' : '2px solid transparent',
                                    outlineOffset: '2px',
                                    boxShadow: builderVibe === v.id ? '0 0 12px rgba(196,93,62,0.25)' : 'none',
                                  }}>
                                  <div className="absolute inset-0 flex flex-col justify-end p-1.5"
                                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}>
                                    <p className="text-[8px] font-bold leading-tight" style={{ color: '#fff' }}>{v.name}</p>
                                  </div>
                                  {builderVibe === v.id && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#C45D3E' }}>
                                      <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Step 3: Scene & Composition ── */}
                        <div className="flex gap-3 pb-5">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)', color: '#C45D3E' }}>3</div>
                            <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                          </div>
                          <div className="flex-1 pt-0.5 space-y-2 min-w-0">
                            <p className="text-[12px] font-semibold text-gray-200 mb-3">Scene & Composition</p>

                            {/* Setting row */}
                            {(() => {
                              const sel = SETTINGS.find(s => s.id === builderSetting);
                              const isOpen = expandedAttr === 'setting';
                              return (
                                <div>
                                  <button onClick={() => setExpandedAttr(isOpen ? null : 'setting')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                                    style={isOpen || sel
                                      ? { borderColor: 'rgba(196,93,62,0.3)', background: 'rgba(196,93,62,0.06)' }
                                      : { borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
                                    <span className="hud-label text-[9px] w-16 flex-shrink-0" style={{ color: isOpen ? '#C45D3E' : '#4b5563' }}>SETTING</span>
                                    <span className="flex-1 text-[11px] font-medium" style={{ color: sel ? '#111827' : '#6b7280' }}>
                                      {sel ? `${sel.emoji} ${sel.name}` : 'Not set'}
                                    </span>
                                    {sel && <button onClick={e => { e.stopPropagation(); setBuilderSetting(''); }} className="text-[10px] text-gray-600 hover:text-red-400 px-1 transition-colors">✕</button>}
                                    <svg className="w-3 h-3 text-gray-600 flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : '' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                  {isOpen && (
                                    <div className="mt-1.5 p-3 rounded-xl border" style={{ borderColor: 'rgba(196,93,62,0.12)', background: 'rgba(0,0,0,0.15)' }}>
                                      <div className="grid grid-cols-5 gap-2">
                                        {SETTINGS.map(s => (
                                          <button key={s.id} onClick={() => pickAttr(setBuilderSetting, s.id, builderSetting, null)}
                                            className="flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 transition-all"
                                            style={builderSetting === s.id
                                              ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.4)' }
                                              : { background: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.1)' }}>
                                            <span className="text-xl leading-none">{s.emoji}</span>
                                            <span className="text-[9px] font-medium mt-0.5" style={{ color: builderSetting === s.id ? '#C45D3E' : '#6b7280' }}>{s.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Framing row */}
                            {(() => {
                              const sel = COMPOSITIONS.find(c => c.id === builderComposition);
                              const isOpen = expandedAttr === 'framing';
                              return (
                                <div>
                                  <button onClick={() => setExpandedAttr(isOpen ? null : 'framing')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                                    style={isOpen || sel
                                      ? { borderColor: 'rgba(196,93,62,0.3)', background: 'rgba(196,93,62,0.06)' }
                                      : { borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
                                    <span className="hud-label text-[9px] w-16 flex-shrink-0" style={{ color: isOpen ? '#C45D3E' : '#4b5563' }}>FRAMING</span>
                                    <span className="flex-1 text-[11px] font-medium" style={{ color: sel ? '#111827' : '#6b7280' }}>
                                      {sel ? sel.label : 'Not set'}
                                    </span>
                                    {sel && <button onClick={e => { e.stopPropagation(); setBuilderComposition(''); }} className="text-[10px] text-gray-600 hover:text-red-400 px-1 transition-colors">✕</button>}
                                    <svg className="w-3 h-3 text-gray-600 flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : '' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                  {isOpen && (
                                    <div className="mt-1.5 p-3 rounded-xl border" style={{ borderColor: 'rgba(196,93,62,0.12)', background: 'rgba(0,0,0,0.15)' }}>
                                      <div className="grid grid-cols-4 gap-1.5">
                                        {COMPOSITIONS.map(c => (
                                          <button key={c.id} onClick={() => pickAttr(setBuilderComposition, c.id, builderComposition, null)}
                                            className="py-2 px-2 rounded-lg border-2 transition-all text-center text-[10px] font-medium"
                                            style={builderComposition === c.id
                                              ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.4)', color: '#C45D3E' }
                                              : { background: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.1)', color: '#6b7280' }}>
                                            {c.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* ── Step 4: People & Models ── */}
                        <div className="flex gap-3 pb-5">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)', color: '#C45D3E' }}>4</div>
                            <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                          </div>
                          <div className="flex-1 pt-0.5 min-w-0">
                            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                              <button onClick={() => setShowModels(v => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 transition-colors text-left"
                                style={{ background: showModels ? 'rgba(196,93,62,0.06)' : 'rgba(0,0,0,0.03)' }}>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg">👤</span>
                                  <div>
                                    <p className="text-[12px] font-semibold" style={{ color: showModels ? '#C45D3E' : '#9ca3af' }}>People & Models</p>
                                    <p className="text-[10px]" style={{ color: '#4b5563' }}>Include people in your design</p>
                                  </div>
                                </div>
                                <span className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0"
                                  style={{ background: showModels ? '#C45D3E' : 'rgba(255,255,255,0.12)' }}>
                                  <span className="inline-block h-3 w-3 rounded-full bg-white shadow transition-transform"
                                    style={{ transform: showModels ? 'translateX(14px)' : 'translateX(2px)' }} />
                                </span>
                              </button>
                              {showModels && (
                                <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div>
                                    <p className="hud-label text-[9px] mb-1.5">GENDER / GROUP</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {MODEL_GENDERS.map(g => (
                                        <button key={g.id} onClick={() => setBuilderModelGender(builderModelGender === g.id ? '' : g.id)}
                                          className="chip text-[10px]"
                                          style={builderModelGender === g.id ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                                          {g.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="hud-label text-[9px] mb-1.5">AGE RANGE</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {MODEL_AGES.map(a => (
                                        <button key={a} onClick={() => setBuilderModelAge(builderModelAge === a ? '' : a)}
                                          className="chip text-[10px]"
                                          style={builderModelAge === a ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                                          {a}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="hud-label text-[9px] mb-1.5">OUTFIT / STYLE</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {MODEL_STYLES.map(s => (
                                        <button key={s} onClick={() => setBuilderModelStyle(builderModelStyle === s ? '' : s)}
                                          className="chip text-[10px]"
                                          style={builderModelStyle === s ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                                          {s}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="hud-label text-[9px] mb-1.5">POSE / ACTION</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {MODEL_POSES.map(p => (
                                        <button key={p.id} onClick={() => setBuilderModelPose(builderModelPose === p.id ? '' : p.id)}
                                          className="chip text-[10px]"
                                          style={builderModelPose === p.id ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="hud-label text-[9px] mb-1.5">PRODUCT PLACEMENT</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {PRODUCT_PLACEMENTS.map(p => (
                                        <button key={p.id} onClick={() => setBuilderProductPlacement(builderProductPlacement === p.id ? '' : p.id)}
                                          className="chip text-[10px]"
                                          style={builderProductPlacement === p.id ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── Step 5: Visual Details ── */}
                        <div className="flex gap-3 pb-5">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)', color: '#C45D3E' }}>5</div>
                            <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                          </div>
                          <div className="flex-1 pt-0.5 space-y-2 min-w-0">
                            <p className="text-[12px] font-semibold text-gray-200 mb-3">Visual Details</p>

                            {/* Lighting row */}
                            {(() => {
                              const sel = LIGHTING_OPTIONS.find(l => l.id === builderLighting);
                              const isOpen = expandedAttr === 'lighting';
                              return (
                                <div>
                                  <button onClick={() => setExpandedAttr(isOpen ? null : 'lighting')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                                    style={isOpen || sel
                                      ? { borderColor: 'rgba(196,93,62,0.3)', background: 'rgba(196,93,62,0.06)' }
                                      : { borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
                                    <span className="hud-label text-[9px] w-20 flex-shrink-0" style={{ color: isOpen ? '#C45D3E' : '#4b5563' }}>LIGHTING</span>
                                    {sel && <span className="w-5 h-5 rounded-md flex-shrink-0 border border-black/20" style={{ background: sel.swatch }} />}
                                    <span className="flex-1 text-[11px] font-medium" style={{ color: sel ? '#111827' : '#6b7280' }}>{sel ? sel.label : 'Not set'}</span>
                                    {sel && <button onClick={e => { e.stopPropagation(); setBuilderLighting(''); }} className="text-[10px] text-gray-600 hover:text-red-400 px-1 transition-colors">✕</button>}
                                    <svg className="w-3 h-3 text-gray-600 flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : '' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                  {isOpen && (
                                    <div className="mt-1.5 p-3 rounded-xl border" style={{ borderColor: 'rgba(196,93,62,0.12)', background: 'rgba(0,0,0,0.15)' }}>
                                      <div className="grid grid-cols-3 gap-2">
                                        {LIGHTING_OPTIONS.map(l => (
                                          <button key={l.id} onClick={() => pickAttr(setBuilderLighting, l.id, builderLighting, null)}
                                            className="rounded-xl border-2 overflow-hidden transition-all"
                                            style={builderLighting === l.id
                                              ? { borderColor: 'rgba(196,93,62,0.5)' }
                                              : { borderColor: 'rgba(0,0,0,0.1)' }}>
                                            <div className="h-8 w-full" style={{ background: l.swatch }} />
                                            <div className="py-1.5 text-center" style={{ background: builderLighting === l.id ? 'rgba(196,93,62,0.1)' : 'rgba(0,0,0,0.03)' }}>
                                              <span className="text-[9px] font-medium" style={{ color: builderLighting === l.id ? '#C45D3E' : '#6b7280' }}>{l.label}</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Background row */}
                            {(() => {
                              const sel = BACKGROUND_OPTIONS.find(b => b.id === builderBackground);
                              const isOpen = expandedAttr === 'background';
                              return (
                                <div>
                                  <button onClick={() => setExpandedAttr(isOpen ? null : 'background')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                                    style={isOpen || sel
                                      ? { borderColor: 'rgba(196,93,62,0.3)', background: 'rgba(196,93,62,0.06)' }
                                      : { borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
                                    <span className="hud-label text-[9px] w-20 flex-shrink-0" style={{ color: isOpen ? '#C45D3E' : '#4b5563' }}>BACKGROUND</span>
                                    {sel && <span className="w-5 h-5 rounded-md flex-shrink-0 border border-black/20" style={{ background: sel.swatch }} />}
                                    <span className="flex-1 text-[11px] font-medium" style={{ color: sel ? '#111827' : '#6b7280' }}>{sel ? sel.label : 'Not set'}</span>
                                    {sel && <button onClick={e => { e.stopPropagation(); setBuilderBackground(''); }} className="text-[10px] text-gray-600 hover:text-red-400 px-1 transition-colors">✕</button>}
                                    <svg className="w-3 h-3 text-gray-600 flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : '' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                  {isOpen && (
                                    <div className="mt-1.5 p-3 rounded-xl border" style={{ borderColor: 'rgba(196,93,62,0.12)', background: 'rgba(0,0,0,0.15)' }}>
                                      <div className="grid grid-cols-3 gap-2">
                                        {BACKGROUND_OPTIONS.map(b => (
                                          <button key={b.id} onClick={() => pickAttr(setBuilderBackground, b.id, builderBackground, null)}
                                            className="rounded-xl border-2 overflow-hidden transition-all"
                                            style={builderBackground === b.id
                                              ? { borderColor: 'rgba(196,93,62,0.5)' }
                                              : { borderColor: 'rgba(0,0,0,0.1)' }}>
                                            <div className="h-8 w-full" style={{ background: b.swatch }} />
                                            <div className="py-1.5 text-center" style={{ background: builderBackground === b.id ? 'rgba(196,93,62,0.1)' : 'rgba(0,0,0,0.03)' }}>
                                              <span className="text-[9px] font-medium" style={{ color: builderBackground === b.id ? '#C45D3E' : '#6b7280' }}>{b.label}</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Color Grade row */}
                            {(() => {
                              const sel = COLOR_GRADES.find(g => g.id === builderColorGrade);
                              const isOpen = expandedAttr === 'colorgrade';
                              return (
                                <div>
                                  <button onClick={() => setExpandedAttr(isOpen ? null : 'colorgrade')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                                    style={isOpen || sel
                                      ? { borderColor: 'rgba(196,93,62,0.3)', background: 'rgba(196,93,62,0.06)' }
                                      : { borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
                                    <span className="hud-label text-[9px] w-20 flex-shrink-0" style={{ color: isOpen ? '#C45D3E' : '#4b5563' }}>COLOR GRADE</span>
                                    {sel && <span className="w-10 h-4 rounded flex-shrink-0 border border-black/20" style={{ background: sel.swatch }} />}
                                    <span className="flex-1 text-[11px] font-medium" style={{ color: sel ? '#111827' : '#6b7280' }}>{sel ? sel.label : 'Not set'}</span>
                                    {sel && <button onClick={e => { e.stopPropagation(); setBuilderColorGrade(''); }} className="text-[10px] text-gray-600 hover:text-red-400 px-1 transition-colors">✕</button>}
                                    <svg className="w-3 h-3 text-gray-600 flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : '' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                  {isOpen && (
                                    <div className="mt-1.5 p-3 rounded-xl border" style={{ borderColor: 'rgba(196,93,62,0.12)', background: 'rgba(0,0,0,0.15)' }}>
                                      <div className="grid grid-cols-4 gap-2">
                                        {COLOR_GRADES.map(g => (
                                          <button key={g.id} onClick={() => pickAttr(setBuilderColorGrade, g.id, builderColorGrade, null)}
                                            className="rounded-xl border-2 overflow-hidden transition-all"
                                            style={builderColorGrade === g.id
                                              ? { borderColor: 'rgba(196,93,62,0.5)' }
                                              : { borderColor: 'rgba(0,0,0,0.1)' }}>
                                            <div className="h-7 w-full" style={{ background: g.swatch }} />
                                            <div className="py-1.5 text-center px-1" style={{ background: builderColorGrade === g.id ? 'rgba(196,93,62,0.1)' : 'rgba(0,0,0,0.03)' }}>
                                              <span className="text-[8px] font-medium leading-tight" style={{ color: builderColorGrade === g.id ? '#C45D3E' : '#6b7280' }}>{g.label}</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                          </div>
                        </div>

                        {/* ── Step 6: Text Overlay ── */}
                        <div className="flex gap-3 pb-3">
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)', color: '#C45D3E' }}>6</div>
                          </div>
                          <div className="flex-1 pt-0.5 space-y-2 min-w-0">
                            <button onClick={() => setShowTextOverlay(v => { if (!v) setNoText(false); else setNoText(true); return !v; })}
                              className="flex items-center gap-2 text-[12px] font-semibold transition-colors"
                              style={{ color: showTextOverlay ? '#C45D3E' : '#9ca3af' }}>
                              <span className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0"
                                style={{ background: showTextOverlay ? '#C45D3E' : 'rgba(255,255,255,0.12)' }}>
                                <span className="inline-block h-3 w-3 rounded-full bg-white shadow transition-transform"
                                  style={{ transform: showTextOverlay ? 'translateX(14px)' : 'translateX(2px)' }} />
                              </span>
                              Add text / headline overlay
                            </button>
                            {showTextOverlay && (
                              <input className="w-full input-field rounded-xl px-4 py-2.5 text-sm"
                                value={builderTextOverlay} onChange={e => setBuilderTextOverlay(e.target.value)}
                                placeholder='e.g. "Shop Now — 20% Off" or your brand tagline' />
                            )}
                          </div>
                        </div>

                        {/* Assembled prompt preview */}
                        {prompt && (
                          <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(196,93,62,0.05)', border: '1px solid rgba(196,93,62,0.1)' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="hud-label text-[9px]" style={{ color: '#C45D3E' }}>ASSEMBLED PROMPT</p>
                              <button onClick={() => setPromptMode('manual')} className="text-[9px] font-semibold" style={{ color: '#4b5563' }}>Edit manually →</button>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed">{prompt}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Manual mode */
                      <div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {templates.map(t => (
                            <button key={t.name} onClick={() => setPrompt(t.subject)}
                              className={`chip text-[10px] ${prompt === t.subject ? 'active' : ''}`}
                              style={prompt === t.subject ? { background: 'rgba(196,93,62,0.12)', borderColor: 'rgba(196,93,62,0.25)', color: '#C45D3E' } : {}}>
                              {t.name}
                            </button>
                          ))}
                        </div>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
                          placeholder="Describe your visual in detail — subject, composition, mood, lighting, colors, text overlays..."
                          className="w-full input-field rounded-xl px-4 py-3 text-sm resize-none" />
                      </div>
                    )}
                  </div>

                  {/* Reference Images Upload */}
                  <div className="panel rounded-2xl p-4 sm:p-5"
                    style={referenceImages.length ? { borderColor: 'rgba(196,93,62,0.2)', background: 'rgba(196,93,62,0.04)' } : {}}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="hud-label text-[11px]">REFERENCE IMAGES</p>
                      {referenceImages.length > 0 && (
                        <span className="text-[9px] text-[#C45D3E] font-medium">{referenceImages.length} image{referenceImages.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {referenceImages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {referenceImages.map((img, idx) => (
                          <div key={idx} className="relative flex-shrink-0">
                            <img src={img.dataUrl} alt={img.name}
                              className="w-16 h-16 rounded-xl object-cover"
                              style={{ border: idx === 0 ? '2px solid rgba(196,93,62,0.4)' : '1px solid rgba(0,0,0,0.1)' }} />
                            {idx === 0 && (
                              <span className="absolute bottom-0.5 left-0.5 text-[7px] font-bold bg-cyan-500 text-black px-1 rounded leading-tight">PRIMARY</span>
                            )}
                            <button onClick={() => removeReferenceImage(idx)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ background: '#ef4444', border: '1px solid rgba(0,0,0,0.3)' }}>
                              ×
                            </button>
                          </div>
                        ))}
                        {/* Add more button */}
                        <button onClick={() => fileInputRef.current?.click()}
                          className="w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all"
                          style={{ borderColor: 'rgba(196,93,62,0.2)', background: 'rgba(196,93,62,0.03)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,93,62,0.4)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(196,93,62,0.2)'; }}>
                          <svg className="w-4 h-4 text-[#C45D3E]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[8px] text-gray-500">Add</span>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-dashed transition-all text-center"
                        style={{ borderColor: 'rgba(196,93,62,0.15)', background: 'rgba(6,182,212,0.02)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,93,62,0.35)'; e.currentTarget.style.background = 'rgba(196,93,62,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(196,93,62,0.15)'; e.currentTarget.style.background = 'rgba(6,182,212,0.02)'; }}>
                        <svg className="w-5 h-5 text-[#C45D3E]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <div>
                          <p className="text-[11px] text-gray-400 font-medium">Upload reference images</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">Add one or more images — AI generates variations</p>
                        </div>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </div>

                  {/* Variation instructions (only when reference images are present) */}
                  {referenceImages.length > 0 && (
                    <div className="panel rounded-2xl p-4 sm:p-5">
                      <p className="hud-label text-[11px] mb-2">VARIATION INSTRUCTIONS (OPTIONAL)</p>
                      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                        placeholder="Describe how you want to vary this image — color mood, style changes, composition tweaks..."
                        className="w-full input-field rounded-xl px-4 py-3 text-sm resize-none" />
                    </div>
                  )}

                  {/* Generate */}
                  <button onClick={generate} disabled={generating || (!prompt.trim() && !referenceImages.length)}
                    className="btn-accent w-full py-3 rounded-lg font-bold text-sm tracking-wide"
                    style={{ background: (!prompt.trim() && !referenceImages.length) ? '#1e1e2e' : '#C45D3E', boxShadow: (!prompt.trim() && !referenceImages.length) ? 'none' : '0 4px 20px -4px rgba(196,93,62,0.35)' }}>
                    {referenceImages.length ? `GENERATE ${quantity} VARIATIONS` : `GENERATE ${quantity} CREATIVES`}
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="panel rounded-xl p-4 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-xs text-red-400 flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-[10px] text-red-400/60 hover:text-red-400 font-semibold">Dismiss</button>
                  </div>
                </div>
              )}

              {/* Generating state — only when no images yet */}
              {generating && images.length === 0 && (
                <div className="panel rounded-2xl p-6 sm:p-10 animate-fade-up text-center">
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <div className="w-2 h-2 rounded-full bg-[#C45D3E] animate-pulse" />
                    <span className="hud-label text-[11px]" style={{ color: '#C45D3E' }}>RENDERING VISUALS</span>
                  </div>
                  <div className="flex justify-center gap-1 mb-5">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="w-1.5 rounded-full overflow-hidden" style={{ height: 32, background: 'rgba(196,93,62,0.08)' }}>
                        <div className="w-full rounded-full bg-[#C45D3E]" style={{ height: '40%', animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {referenceImages.length
                      ? `Generating ${quantity} variations from ${referenceImages.length > 1 ? `${referenceImages.length} reference images` : 'your reference image'}`
                      : `Creating ${quantity} variations with ${STYLES.find(s => s.id === style)?.name} style`}
                  </p>
                </div>
              )}

              {/* Image gallery — shown during streaming too */}
              {images.length > 0 && (
                <div className="animate-fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: generating ? '#C45D3E' : '#4ade80', animation: generating ? 'pulse 1s infinite' : 'none' }} />
                      <span className="hud-label text-[11px]" style={{ color: generating ? '#C45D3E' : '#4ade80' }}>
                        {generating
                          ? `RENDERING — ${images.filter(im => im.status === 'completed').length} / ${images.length} DONE`
                          : `GENERATED — ${images.length} CREATIVES`}
                      </span>
                      {promptReadyCount > 0 && !generating && (
                        <span className="chip text-[9px]" style={{ color: '#C45D3E', borderColor: 'rgba(196,93,62,0.15)' }}>
                          {promptReadyCount} prompt ready
                        </span>
                      )}
                    </div>
                    {!generating && (
                      <div className="flex gap-2">
                        {images.some(im => im.dataUrl || im.url) && (
                          <button onClick={downloadAll} className="chip text-[10px]"
                            style={{ color: '#C45D3E', borderColor: 'rgba(196,93,62,0.2)' }}>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Download All
                          </button>
                        )}
                        <button onClick={() => setShowInput(v => !v)} className="chip text-[10px]">
                          {showInput ? 'Hide Brief' : 'Edit Brief'}
                        </button>
                        <button onClick={generate} className="chip text-[10px]">Regenerate</button>
                      </div>
                    )}
                  </div>

                  {promptReadyCount === images.length && !generating && (
                    <div className="panel rounded-xl p-3 mb-3" style={{ borderColor: 'rgba(196,93,62,0.12)', background: 'rgba(196,93,62,0.04)' }}>
                      <p className="text-xs text-[#C45D3E]/70">
                        <span className="font-semibold">AI prompts generated.</span> Image rendering requires Gemini API configuration. Copy these prompts to use in any image generation tool.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {images.map((img, i) => (
                      <ImageCard key={img.id || i} img={img} apiBase={API_BASE}
                        onOpen={img.dataUrl || img.url ? () => setLightbox({ index: i }) : undefined}
                        onRegenerate={() => regenerateImage(img, i)}
                        onCreateVideo={img.status === 'completed' ? handleCreateVideo : undefined} />
                    ))}
                  </div>

                  {lightbox && (
                    <ImageLightbox
                      images={images.filter(im => im.dataUrl || im.url)}
                      index={Math.min(lightbox.index, images.filter(im => im.dataUrl || im.url).length - 1)}
                      onClose={() => setLightbox(null)}
                      type={activeType}
                      onCreateVideo={handleCreateVideo}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right: Settings */}
            <div className="space-y-3">

              {/* Brand Hub */}
              <div className="panel rounded-2xl overflow-hidden" style={useBrandHub ? { borderColor: 'rgba(167,139,250,0.3)' } : {}}>
                <div className="px-4 py-3 border-b" style={{ background: useBrandHub ? 'rgba(167,139,250,0.07)' : 'rgba(167,139,250,0.03)', borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.2)' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: '#a78bfa' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold" style={{ color: dark ? '#e5e7eb' : '#374151' }}>Brand Hub</p>
                    </div>
                    <button onClick={() => brand && setUseBrandHub(v => !v)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                      style={{ background: useBrandHub && brand ? '#a78bfa' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'), opacity: brand ? 1 : 0.4, cursor: brand ? 'pointer' : 'not-allowed' }}>
                      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm"
                        style={{ transform: useBrandHub && brand ? 'translateX(18px)' : 'translateX(2px)' }} />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  {!brand ? (
                    <button onClick={() => navigate('/brand-hub')} className="text-[11px] text-gray-500 leading-relaxed hover:text-[#C45D3E] transition-colors text-left">Set up your Brand Hub to pull colors, fonts &amp; identity into every generation. <span className="font-semibold" style={{ color: '#C45D3E' }}>Go to Brand Hub &rarr;</span></button>
                  ) : useBrandHub ? (
                    <div className="space-y-2.5">
                      <p className="text-[11px] text-violet-300/80">Using brand settings for this generation</p>
                      {brand.colors && typeof brand.colors === 'object' && Object.values(brand.colors).some(Boolean) && (
                        <div>
                          <p className="hud-label text-[9px] mb-1.5" style={{ color: '#a78bfa' }}>BRAND COLORS</p>
                          <div className="flex gap-1 flex-wrap">
                            {Object.entries(brand.colors).filter(([, v]) => v).map(([k, v]) => (
                              <div key={k} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-gray-400"
                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: v }} />
                                <span>{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {brand.fonts && typeof brand.fonts === 'object' && Object.values(brand.fonts).some(Boolean) && (
                        <div>
                          <p className="hud-label text-[9px] mb-1" style={{ color: '#a78bfa' }}>BRAND FONTS</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(brand.fonts).filter(([, v]) => v).slice(0, 2).map(([k, v]) => (
                              <span key={k} className="text-[9px] text-gray-500 px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 leading-relaxed">Enable to use <span className="text-violet-400">{brand.brand_name}</span>'s colors &amp; visual identity.</p>
                  )}
                </div>
              </div>

              {/* No Text Toggle */}
              <div className="panel rounded-2xl overflow-hidden" style={noText ? { borderColor: 'rgba(196,93,62,0.3)' } : {}}>
                <div className="px-4 py-3" style={{ background: noText ? 'rgba(196,93,62,0.05)' : 'transparent' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,93,62,0.12)', border: '1px solid rgba(196,93,62,0.2)' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: '#C45D3E' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: dark ? '#e5e7eb' : '#374151' }}>No Text</p>
                        <p className="text-[10px]" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Exclude text, logos & watermarks</p>
                      </div>
                    </div>
                    <button onClick={() => setNoText(v => { if (!v) { setShowTextOverlay(false); setBuilderTextOverlay(''); } return !v; })}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                      style={{ background: noText ? '#C45D3E' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)') }}>
                      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm"
                        style={{ transform: noText ? 'translateX(18px)' : 'translateX(2px)' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Style */}
              <div className="panel rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ background: 'rgba(196,93,62,0.03)', borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3.5 rounded-full" style={{ background: '#C45D3E' }} />
                    <p className="hud-label text-[10px]" style={{ color: '#C45D3E' }}>VISUAL STYLE</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {STYLES.map(s => (
                      <button key={s.id} onClick={() => setStyle(s.id)}
                        className="relative px-3 py-2.5 rounded-xl border text-[11px] font-medium transition-all text-left"
                        style={style === s.id
                          ? { background: 'rgba(196,93,62,0.1)', borderColor: 'rgba(196,93,62,0.35)', color: '#C45D3E' }
                          : { background: 'rgba(0,0,0,0.02)', borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)', color: '#6b7280' }}>
                        {style === s.id && (
                          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: '#C45D3E' }} />
                        )}
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="panel rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ background: 'rgba(196,93,62,0.03)', borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3.5 rounded-full" style={{ background: '#C45D3E' }} />
                    <p className="hud-label text-[10px]" style={{ color: '#C45D3E' }}>DIMENSIONS</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {dims.map(d => {
                      const [dw, dh] = d.id.split('x').map(Number);
                      const ratio = dw / dh;
                      const bw = Math.round(Math.min(18, 18 * (ratio >= 1 ? 1 : ratio)));
                      const bh = Math.round(Math.min(18, 18 * (ratio < 1 ? 1 : 1 / ratio)));
                      const active = dimension === d.id;
                      return (
                        <button key={d.id} onClick={() => setDimension(d.id)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all"
                          style={active
                            ? { background: 'rgba(196,93,62,0.1)', borderColor: 'rgba(196,93,62,0.35)' }
                            : { background: 'rgba(0,0,0,0.02)', borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)' }}>
                          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 22, height: 22 }}>
                            <div className="rounded-sm border-2 transition-all"
                              style={{ width: bw, height: bh, borderColor: active ? '#C45D3E' : (dark ? '#374151' : '#9ca3af'), background: active ? 'rgba(196,93,62,0.12)' : 'transparent' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold leading-none truncate" style={{ color: active ? '#C45D3E' : (dark ? '#9ca3af' : '#4b5563') }}>{d.label}</p>
                            <p className="text-[9px] mt-0.5 truncate font-medium" style={{ color: active ? '#C45D3E' : (dark ? '#9ca3af' : '#6b7280') }}>{d.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              <div className="panel rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ background: 'rgba(196,93,62,0.03)', borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3.5 rounded-full" style={{ background: '#C45D3E' }} />
                    <p className="hud-label text-[10px]" style={{ color: '#C45D3E' }}>COLOR PALETTE</p>
                  </div>
                </div>
                <div className="p-2.5 space-y-1">
                  {referenceImages.length > 0 && imageColors.length > 0 && (
                    <button onClick={() => setPalette('image-colors')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all"
                      style={palette === 'image-colors'
                        ? { background: 'rgba(196,93,62,0.1)', borderColor: 'rgba(196,93,62,0.35)' }
                        : { background: 'rgba(0,0,0,0.02)', borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)' }}>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {imageColors.slice(0, 5).map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-black/20" style={{ background: c }} />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: palette === 'image-colors' ? '#C45D3E' : '#9ca3af' }}>Image Colors</span>
                      <span className="ml-auto text-[9px] opacity-50">from upload</span>
                    </button>
                  )}
                  {COLOR_PALETTES.map(p => (
                    <button key={p.id} onClick={() => setPalette(p.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all"
                      style={palette === p.id
                        ? { background: 'rgba(196,93,62,0.1)', borderColor: 'rgba(196,93,62,0.35)' }
                        : { background: 'rgba(0,0,0,0.02)', borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)' }}>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {p.colors.map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-black/20" style={{ background: c }} />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: palette === p.id ? '#C45D3E' : '#9ca3af' }}>{p.name}</span>
                      {palette === p.id && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#C45D3E' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="panel rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ background: 'rgba(196,93,62,0.03)', borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3.5 rounded-full" style={{ background: '#C45D3E' }} />
                    <p className="hud-label text-[10px]" style={{ color: '#C45D3E' }}>QUANTITY</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{ v: '2', label: '2' }, { v: '4', label: '4' }, { v: '6', label: '6' }].map(q => (
                      <button key={q.v} onClick={() => setQuantity(q.v)}
                        className="flex flex-col items-center justify-center py-3 rounded-xl border transition-all"
                        style={quantity === q.v
                          ? { background: 'rgba(196,93,62,0.1)', borderColor: 'rgba(196,93,62,0.35)' }
                          : { background: 'rgba(0,0,0,0.02)', borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)' }}>
                        <span className="text-lg font-bold leading-none" style={{ color: quantity === q.v ? '#C45D3E' : (dark ? '#9ca3af' : '#4b5563') }}>{q.label}</span>
                        <span className="text-[9px] mt-1 font-medium" style={{ color: quantity === q.v ? '#C45D3E' : (dark ? '#9ca3af' : '#6b7280') }}>imgs</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      </ModuleWrapper>
    </div>
  );
}
