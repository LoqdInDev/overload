/**
 * MJML Email Renderer
 *
 * Converts block-based email designs into professional HTML emails via MJML.
 * Supports two modes:
 *   1. renderBlocks(blocks, options) — drag-and-drop editor blocks → HTML
 *   2. renderText(text, options)     — plain AI-generated text → styled HTML
 */

const mjml2html = require('mjml');

// ── Default brand fallbacks ──────────────────────────────────────

const DEFAULTS = {
  brandColor: '#2563eb',
  bgColor: '#f4f4f5',
  textColor: '#1f2937',
  fontFamily: 'Helvetica, Arial, sans-serif',
  logoUrl: '',
  companyName: '',
  footerText: '',
  previewText: '',
};

// ── Block → MJML component mapping ──────────────────────────────

function blockToMjml(block) {
  switch (block.type) {
    case 'text':
      return `<mj-text font-size="${block.fontSize || '16px'}" color="${block.color || '#1f2937'}" line-height="1.6" padding="${block.padding || '10px 25px'}"${block.align ? ` align="${block.align}"` : ''}>
        ${block.content || ''}
      </mj-text>`;

    case 'heading':
      return `<mj-text font-size="${block.fontSize || '28px'}" font-weight="bold" color="${block.color || '#111827'}" padding="${block.padding || '10px 25px'}"${block.align ? ` align="${block.align}"` : ''}>
        ${block.content || ''}
      </mj-text>`;

    case 'button':
      return `<mj-button background-color="${block.bgColor || '#2563eb'}" color="${block.color || '#ffffff'}" font-size="${block.fontSize || '16px'}" font-weight="bold" border-radius="${block.borderRadius || '8px'}" padding="${block.padding || '15px 25px'}" inner-padding="12px 28px" href="${block.href || '#'}"${block.align ? ` align="${block.align}"` : ''}>
        ${block.content || 'Click Here'}
      </mj-button>`;

    case 'image':
      return `<mj-image src="${block.src || 'https://placehold.co/600x300/e5e7eb/9ca3af?text=Image'}" alt="${block.alt || ''}" width="${block.width || '600px'}" padding="${block.padding || '10px 25px'}" border-radius="${block.borderRadius || '0px'}"${block.href ? ` href="${block.href}"` : ''} />`;

    case 'divider':
      return `<mj-divider border-color="${block.color || '#e5e7eb'}" border-width="${block.width || '1px'}" padding="${block.padding || '15px 25px'}" />`;

    case 'spacer':
      return `<mj-spacer height="${block.height || '20px'}" />`;

    case 'social':
      return `<mj-social font-size="12px" icon-size="24px" mode="horizontal" padding="${block.padding || '10px 25px'}"${block.align ? ` align="${block.align}"` : ''}>
        ${(block.networks || ['facebook', 'twitter', 'instagram']).map(n =>
          `<mj-social-element name="${n}" href="${block[n + 'Url'] || '#'}" />`
        ).join('\n        ')}
      </mj-social>`;

    case 'columns': {
      const cols = block.columns || [{ blocks: [] }, { blocks: [] }];
      const colWidth = Math.floor(100 / cols.length) + '%';
      return `<mj-section padding="0">
        ${cols.map(col => `<mj-column width="${colWidth}">
          ${(col.blocks || []).map(b => blockToMjml(b)).join('\n')}
        </mj-column>`).join('\n')}
      </mj-section>`;
    }

    case 'html':
      return `<mj-text padding="${block.padding || '10px 25px'}">${block.content || ''}</mj-text>`;

    default:
      return `<mj-text padding="10px 25px">${block.content || ''}</mj-text>`;
  }
}

// ── Render blocks (drag-and-drop editor) ─────────────────────────

function renderBlocks(blocks, options = {}) {
  const opts = { ...DEFAULTS, ...options };

  const mjmlDoc = `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="${opts.fontFamily}" />
      <mj-text font-size="16px" color="${opts.textColor}" line-height="1.6" />
    </mj-attributes>
    ${opts.previewText ? `<mj-preview>${opts.previewText}</mj-preview>` : ''}
    <mj-style>
      a { color: ${opts.brandColor}; }
    </mj-style>
  </mj-head>
  <mj-body background-color="${opts.bgColor}">
    ${opts.logoUrl ? `<mj-section padding="20px 0 10px">
      <mj-column>
        <mj-image src="${opts.logoUrl}" alt="${opts.companyName}" width="150px" align="center" />
      </mj-column>
    </mj-section>` : ''}

    <mj-section background-color="#ffffff" border-radius="12px" padding="20px 0">
      <mj-column>
        ${blocks.map(b => blockToMjml(b)).join('\n        ')}
      </mj-column>
    </mj-section>

    ${opts.footerText ? `<mj-section padding="20px 0">
      <mj-column>
        <mj-text font-size="12px" color="#9ca3af" align="center" padding="10px 25px">
          ${opts.footerText}
        </mj-text>
      </mj-column>
    </mj-section>` : ''}
  </mj-body>
</mjml>`;

  const result = mjml2html(mjmlDoc, { validationLevel: 'soft' });
  return { html: result.html, mjml: mjmlDoc, errors: result.errors };
}

// ── Render plain text (AI-generated content) ─────────────────────

function renderText(text, options = {}) {
  const opts = { ...DEFAULTS, ...options };

  // Convert markdown-style content to blocks
  const blocks = textToBlocks(text);
  return renderBlocks(blocks, opts);
}

function textToBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let currentParagraph = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line = flush paragraph
    if (!trimmed) {
      if (currentParagraph.length) {
        blocks.push({ type: 'text', content: currentParagraph.join('<br>') });
        currentParagraph = [];
      }
      continue;
    }

    // Markdown headings
    if (trimmed.startsWith('# ')) {
      if (currentParagraph.length) {
        blocks.push({ type: 'text', content: currentParagraph.join('<br>') });
        currentParagraph = [];
      }
      blocks.push({ type: 'heading', content: trimmed.slice(2), fontSize: '28px' });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (currentParagraph.length) {
        blocks.push({ type: 'text', content: currentParagraph.join('<br>') });
        currentParagraph = [];
      }
      blocks.push({ type: 'heading', content: trimmed.slice(3), fontSize: '22px' });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (currentParagraph.length) {
        blocks.push({ type: 'text', content: currentParagraph.join('<br>') });
        currentParagraph = [];
      }
      blocks.push({ type: 'heading', content: trimmed.slice(4), fontSize: '18px' });
      continue;
    }

    // Horizontal rules → divider
    if (/^[-=*]{3,}$/.test(trimmed)) {
      if (currentParagraph.length) {
        blocks.push({ type: 'text', content: currentParagraph.join('<br>') });
        currentParagraph = [];
      }
      blocks.push({ type: 'divider' });
      continue;
    }

    // Bold text lines that look like subject lines (SUBJECT:, CTA:, etc.)
    if (/^(SUBJECT|PREVIEW|CTA|BODY|METRICS|EMAIL \d|P\.S\.):/i.test(trimmed)) {
      if (currentParagraph.length) {
        blocks.push({ type: 'text', content: currentParagraph.join('<br>') });
        currentParagraph = [];
      }
      const [label, ...rest] = trimmed.split(':');
      blocks.push({ type: 'text', content: `<strong>${label}:</strong>${rest.join(':')}` });
      continue;
    }

    currentParagraph.push(trimmed);
  }

  // Flush remaining paragraph
  if (currentParagraph.length) {
    blocks.push({ type: 'text', content: currentParagraph.join('<br>') });
  }

  return blocks;
}

module.exports = { renderBlocks, renderText, textToBlocks, blockToMjml };
