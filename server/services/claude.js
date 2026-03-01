const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

// ─── PROVIDERS ─────────────────────────────────────
const anthropic = new Anthropic();

const nvidia = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
});

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const QWEN_MODEL = 'qwen/qwen3.5-397b-a17b';

// Modules that require Claude's deeper reasoning
const CLAUDE_MODULES = new Set([
  'autopilot', 'brand-strategy', 'budget-optimizer', 'chatbot',
  'crm', 'customer-intelligence', 'competitors', 'the-advisor',
  'calendar', 'client-manager', 'goal-tracker', 'knowledge-base',
  'referral-loyalty',
]);

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripMarkdownJSON(text) {
  let cleaned = text.trim();
  // Remove <think>...</think> blocks (Qwen reasoning traces)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned;
}

function stripThinkBlocks(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// ─── CLAUDE (Anthropic) ────────────────────────────
async function callClaude(prompt, { onChunk, system, temperature, maxTokens } = {}) {
  const params = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  };
  if (system) {
    params.system = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
  }

  if (onChunk) {
    let fullText = '';
    const stream = await anthropic.messages.stream(params);
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
    }
    return fullText;
  } else {
    const response = await anthropic.messages.create(params);
    return response.content[0].text;
  }
}

// ─── QWEN (NVIDIA NIM) ────────────────────────────
async function callQwen(prompt, { onChunk, system, temperature, maxTokens } = {}) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const params = {
    model: QWEN_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages,
  };

  if (onChunk) {
    let fullText = '';
    const stream = await nvidia.chat.completions.create({ ...params, stream: true });
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
    }
    return stripThinkBlocks(fullText);
  } else {
    const response = await nvidia.chat.completions.create(params);
    return stripThinkBlocks(response.choices[0].message.content);
  }
}

// ─── ROUTER ────────────────────────────────────────
// provider: 'claude' | 'qwen' | 'auto' (default)
// moduleId: used with 'auto' to pick based on CLAUDE_MODULES set
function pickProvider(provider, moduleId) {
  if (provider === 'claude') return 'claude';
  if (provider === 'qwen') return 'qwen';
  // Auto: use Claude for complex modules, Qwen for everything else
  if (moduleId && CLAUDE_MODULES.has(moduleId)) return 'claude';
  return 'qwen';
}

async function generateWithClaude(prompt, { onChunk, system, temperature = 0.9, maxTokens = 8192, provider = 'auto', moduleId } = {}) {
  const chosen = pickProvider(provider, moduleId);
  const callFn = chosen === 'claude' ? callClaude : callQwen;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const raw = await callFn(prompt, { onChunk, system, temperature, maxTokens });
      const cleaned = stripMarkdownJSON(raw);
      return { parsed: JSON.parse(cleaned), raw };
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) {
        throw new Error(`AI returned invalid JSON: ${error.message}`);
      }
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.error(`${chosen} API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

async function generateTextWithClaude(prompt, { onChunk, system, temperature = 0.9, maxTokens = 4096, provider = 'auto', moduleId } = {}) {
  const chosen = pickProvider(provider, moduleId);
  const callFn = chosen === 'claude' ? callClaude : callQwen;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const raw = await callFn(prompt, { onChunk, system, temperature, maxTokens });
      return { text: raw };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.error(`${chosen} API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

module.exports = { generateWithClaude, generateTextWithClaude, stripMarkdownJSON };
