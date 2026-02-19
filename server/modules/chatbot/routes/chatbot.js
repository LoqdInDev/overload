const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateWithClaude, generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// SSE - AI bot personality, flow, and content generation
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { type, botName, personality, industry, companyDescription, goals, existingBot, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !botName && !industry && !companyDescription) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('chatbot', 'generate', `Generated ${type || 'chatbot'} content`, 'AI generation');
      sse.sendResult({ content: text, type: type || 'custom' });
      return;
    }

    let prompt;
    if (type === 'flow') {
      prompt = `You are an expert chatbot designer. Create a conversation flow for a chatbot.

Business: ${botName || 'My Business'}
Industry: ${industry || 'General'}
Bot personality: ${existingBot?.personality || personality || 'Friendly and helpful'}
Goal for this flow: ${goals || 'Customer support'}

Return a JSON object:
{
  "flow": {
    "name": "Flow name",
    "trigger": "greeting|keyword|intent",
    "steps": [
      {
        "id": "step_1",
        "type": "respond|ask_question|transfer|collect_info",
        "content": "Bot message or question text",
        "options": ["Option 1", "Option 2"],
        "next": { "default": "step_2", "Option 1": "step_3" }
      }
    ]
  }
}

Create 5-8 steps with branching logic. Include greeting, question handling, fallback, and handoff steps.`;
    } else if (type === 'knowledge') {
      prompt = `You are an expert chatbot designer. Generate a structured knowledge base from the following company information.

Business: ${botName || 'My Business'}
Industry: ${industry || 'General'}
Company Info: ${companyDescription || 'Not provided'}

Return a JSON object:
{
  "knowledge_base": {
    "faqs": [
      { "question": "Common question", "answer": "Detailed answer" }
    ],
    "topics": ["Topic 1", "Topic 2"],
    "key_info": {
      "hours": "Business hours",
      "contact": "Contact methods",
      "policies": "Key policies"
    }
  }
}

Generate 8-12 realistic FAQs and 5+ topics relevant to the industry.`;
    } else {
      prompt = `You are an expert chatbot designer. Create a chatbot personality and initial configuration.

Business: ${botName || 'My Business'}
Industry: ${industry || 'General'}
Desired personality: ${personality || 'Professional yet friendly'}
Company description: ${companyDescription || 'Not provided'}
Primary goals: ${goals || 'Customer support and lead generation'}

Return a JSON object:
{
  "bot": {
    "name": "Bot name",
    "description": "Brief description of the bot's purpose",
    "personality": "Detailed personality description including tone, style, boundaries",
    "welcome_message": "The initial greeting message visitors see",
    "fallback_response": "Message when bot doesn't understand",
    "suggested_flows": [
      { "name": "Flow name", "trigger": "greeting|keyword|intent", "purpose": "What this flow handles" }
    ],
    "sample_responses": [
      { "user": "Example user message", "bot": "Example bot response" }
    ]
  }
}`;
    }

    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    logActivity('chatbot', 'generate', `Generated bot ${type || 'personality'}`, botName || 'AI Chatbot');
    sse.sendResult(parsed);
  } catch (error) {
    console.error('Chatbot generation error:', error);
    sse.sendError(error);
  }
});

// GET /bots
router.get('/bots', (req, res) => {
  try {
    const bots = db.prepare('SELECT * FROM cb_bots ORDER BY created_at DESC').all();
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bots
router.post('/bots', (req, res) => {
  try {
    const { name, description, personality, knowledge_base, welcome_message, channels, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare(
      'INSERT INTO cb_bots (name, description, personality, knowledge_base, welcome_message, channels, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      name,
      description || null,
      personality || null,
      knowledge_base ? JSON.stringify(knowledge_base) : null,
      welcome_message || null,
      channels ? JSON.stringify(channels) : '[]',
      status || 'draft'
    );

    const bot = db.prepare('SELECT * FROM cb_bots WHERE id = ?').get(result.lastInsertRowid);
    logActivity('chatbot', 'create', 'Created chatbot', name);
    res.status(201).json(bot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /bots/:id
router.get('/bots/:id', (req, res) => {
  try {
    const bot = db.prepare('SELECT * FROM cb_bots WHERE id = ?').get(req.params.id);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const flows = db.prepare('SELECT * FROM cb_flows WHERE bot_id = ? ORDER BY created_at ASC').all(req.params.id);
    const conversationCount = db.prepare('SELECT COUNT(*) as count FROM cb_conversations WHERE bot_id = ?').get(req.params.id);

    res.json({ ...bot, flows, conversationCount: conversationCount.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /test - Test chat interaction
router.post('/test', async (req, res) => {
  const sse = setupSSE(res);

  try {
    const { bot_id, message, history } = req.body;

    let botContext = '';
    if (bot_id) {
      const bot = db.prepare('SELECT * FROM cb_bots WHERE id = ?').get(bot_id);
      if (bot) {
        botContext = `
Bot Name: ${bot.name}
Personality: ${bot.personality || 'Friendly and helpful'}
Knowledge Base: ${bot.knowledge_base || 'General knowledge'}
Welcome Message: ${bot.welcome_message || 'Hello! How can I help you?'}`;
      }
    }

    const chatHistory = (history || []).map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `You are a chatbot with the following configuration:
${botContext}

Conversation history:
${chatHistory}

User says: "${message}"

Respond in character as this chatbot. Keep responses concise and helpful. If you don't know something, say so politely.
Return a JSON object: { "response": "your response text", "confidence": 0.95, "intent": "detected intent" }`;

    const { parsed, raw } = await generateWithClaude(prompt, {
      onChunk: (text) => sse.sendChunk(text),
    });

    // Save conversation
    if (bot_id) {
      const messages = [...(history || []), { role: 'user', content: message }, { role: 'bot', content: parsed?.response || raw }];
      db.prepare(
        'INSERT INTO cb_conversations (bot_id, messages) VALUES (?, ?)'
      ).run(bot_id, JSON.stringify(messages));
    }

    sse.sendResult(parsed);
  } catch (error) {
    console.error('Chat test error:', error);
    sse.sendError(error);
  }
});

// GET /conversations
router.get('/conversations', (req, res) => {
  try {
    const { bot_id, limit = 50 } = req.query;
    let sql = 'SELECT c.*, b.name as bot_name FROM cb_conversations c LEFT JOIN cb_bots b ON c.bot_id = b.id';
    const params = [];

    if (bot_id) {
      sql += ' WHERE c.bot_id = ?';
      params.push(bot_id);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const conversations = db.prepare(sql).all(...params);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
