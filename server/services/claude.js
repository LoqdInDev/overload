const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripMarkdownJSON(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned;
}

async function generateWithClaude(prompt, { onChunk, temperature = 0.9, maxTokens = 8192 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (onChunk) {
        let fullText = '';
        const stream = await client.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
            onChunk(event.delta.text);
          }
        }

        const cleaned = stripMarkdownJSON(fullText);
        return { parsed: JSON.parse(cleaned), raw: fullText };
      } else {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        });

        const raw = response.content[0].text;
        const cleaned = stripMarkdownJSON(raw);
        return { parsed: JSON.parse(cleaned), raw };
      }
    } catch (error) {
      lastError = error;
      if (error instanceof SyntaxError) {
        throw new Error(`Claude returned invalid JSON: ${error.message}`);
      }
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.error(`Claude API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

async function generateTextWithClaude(prompt, { onChunk, temperature = 0.9, maxTokens = 4096 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (onChunk) {
        let fullText = '';
        const stream = await client.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
            onChunk(event.delta.text);
          }
        }

        return { text: fullText };
      } else {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        });

        return { text: response.content[0].text };
      }
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.error(`Claude API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

module.exports = { generateWithClaude, generateTextWithClaude, stripMarkdownJSON };
