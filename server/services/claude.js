const OpenAI = require('openai');

const client = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
});

const MODEL = 'qwen/qwen3.5-397b-a17b';
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

async function generateWithClaude(prompt, { onChunk, system, temperature = 0.9, maxTokens = 8192 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const messages = [];
      if (system) {
        messages.push({ role: 'system', content: system });
      }
      messages.push({ role: 'user', content: prompt });

      const params = {
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        messages,
      };

      if (onChunk) {
        let fullText = '';
        const stream = await client.chat.completions.create({ ...params, stream: true });

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        }

        const cleaned = stripMarkdownJSON(fullText);
        return { parsed: JSON.parse(cleaned), raw: fullText };
      } else {
        const response = await client.chat.completions.create(params);

        const raw = response.choices[0].message.content;
        const cleaned = stripMarkdownJSON(raw);
        return { parsed: JSON.parse(cleaned), raw };
      }
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) {
        throw new Error(`AI returned invalid JSON: ${error.message}`);
      }
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.error(`AI API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

async function generateTextWithClaude(prompt, { onChunk, system, temperature = 0.9, maxTokens = 4096 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const messages = [];
      if (system) {
        messages.push({ role: 'system', content: system });
      }
      messages.push({ role: 'user', content: prompt });

      const params = {
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        messages,
      };

      if (onChunk) {
        let fullText = '';
        const stream = await client.chat.completions.create({ ...params, stream: true });

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        }

        // Strip think blocks from final text
        const cleaned = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return { text: cleaned };
      } else {
        const response = await client.chat.completions.create(params);

        const raw = response.choices[0].message.content;
        // Strip think blocks from final text
        const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return { text: cleaned };
      }
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.error(`AI API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

module.exports = { generateWithClaude, generateTextWithClaude, stripMarkdownJSON };
