const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');

// POST /generate - AI review tool generation (SSE)
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { toolType: rawToolType, type, review, tone, platform, businessName, businessType, starRating, additionalContext, prompt: rawPrompt } = req.body;

    // Accept 'type' as alias for 'toolType', with frontend->backend name mapping
    const typeMap = { respond: 'response', request: 'request_email', sentiment: 'sentiment', testimonial: 'testimonial', summary: 'summary' };
    const toolType = rawToolType || typeMap[type] || type;

    // If a raw prompt is provided and no structured review data, use it directly
    if (rawPrompt && !review && !rawToolType) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('reviews', 'generate', `Generated ${type || 'content'}`, `${platform || 'general'}`, null, wsId);
      sse.sendResult({ content: text, toolType: type });
      return;
    }

    const toolPrompts = {
      response: `You are an expert reputation manager. Generate a ${tone || 'professional'} response to the following customer review.

Platform: ${platform || 'Google'}
Business: ${businessName || 'our business'}
Business Type: ${businessType || 'general'}
Rating: ${starRating || review?.rating || 'unknown'}/5
Review Content: "${review?.content || review || 'No content provided'}"
Author: ${review?.author || 'Customer'}
Desired Tone: ${tone || 'professional'}

Guidelines:
1. Acknowledge the customer's experience
2. Address specific points they raised
3. If negative (1-2 stars): apologize sincerely, offer a resolution path, invite them to contact you directly
4. If neutral (3 stars): thank them, address concerns, highlight improvements
5. If positive (4-5 stars): express genuine gratitude, reinforce the positive experience
6. Include a call-to-action (return visit, contact for resolution, etc.)
7. Keep it concise but warm (2-4 paragraphs)
8. Never be defensive or dismissive
9. Match the platform's typical response style (${platform || 'Google'})

Output format:
**Response:**
[Your response text]

**Sentiment Analysis:** [positive/negative/neutral/mixed]
**Key Themes:** [comma-separated themes]
**Urgency Level:** [low/medium/high]
**Suggested Follow-up Actions:**
- [action 1]
- [action 2]`,

      request_email: `You are an expert at customer engagement and review generation. Write a compelling review request email.

Business: ${businessName || 'our business'}
Business Type: ${businessType || 'general'}
Target Platform: ${platform || 'Google'}
Tone: ${tone || 'professional'}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Create a complete review request email that includes:
1. **Subject Line** - 3 options, attention-grabbing but not spammy
2. **Email Body** - warm, personal, and brief (under 150 words)
3. **Direct Review Link CTA** - clear call-to-action with placeholder for review URL
4. **Follow-up Email** - a gentler reminder for non-responders (send 3-5 days later)
5. **SMS Version** - ultra-short version for text message (under 160 chars)

Make it feel personal, not automated. Include specific ${platform || 'Google'} review instructions.`,

      sentiment: `You are a sentiment analysis expert. Analyze the following review in detail.

Platform: ${platform || 'Google'}
Rating: ${starRating || 'unknown'}/5
Review: "${review?.content || review || 'No content provided'}"
Author: ${review?.author || 'Anonymous'}

Provide a comprehensive sentiment analysis:

1. **Overall Sentiment:** [Positive/Negative/Neutral/Mixed] with confidence score (0-100%)
2. **Emotion Breakdown:**
   - Joy/Satisfaction: [0-100%]
   - Frustration/Anger: [0-100%]
   - Disappointment: [0-100%]
   - Surprise: [0-100%]
   - Trust: [0-100%]
3. **Key Themes:** Identify and categorize all themes mentioned (product quality, customer service, price, etc.)
4. **Pain Points:** List specific issues raised
5. **Positive Highlights:** List specific praises
6. **Urgency Assessment:** [Low/Medium/High/Critical] with reasoning
7. **Customer Loyalty Risk:** [Low/Medium/High] - likelihood of churn
8. **Recommended Actions:** Specific steps to address this review
9. **Similar Review Patterns:** What this review suggests about broader customer sentiment`,

      testimonial: `You are a marketing copywriter specializing in social proof. Format this review into polished testimonial content.

Original Review: "${review?.content || review || 'No content provided'}"
Author: ${review?.author || 'Customer'}
Rating: ${starRating || 'unknown'}/5
Business: ${businessName || 'our business'}
Platform: ${platform || 'Google'}

Create multiple testimonial formats:

1. **Website Hero Testimonial** - Pull-quote style, bold and impactful (1-2 sentences)
2. **Social Media Post** - Ready to post with hashtags and emojis
3. **Case Study Snippet** - Problem > Solution > Result format
4. **Video Testimonial Script** - If this customer were on camera (30-second script)
5. **Email Marketing Quote** - Formatted for newsletter inclusion
6. **Landing Page Card** - Short testimonial with star rating display
7. **Before/After Narrative** - Story-driven transformation testimonial

Each format should highlight the strongest points of the original review while maintaining authenticity.`,

      summary: `You are a business intelligence analyst specializing in customer feedback. Generate a comprehensive review summary report.

Business: ${businessName || 'our business'}
Business Type: ${businessType || 'general'}
Platform: ${platform || 'All Platforms'}
${additionalContext ? `Review Data/Context: ${additionalContext}` : 'Note: Generate a template summary report structure with sample insights.'}

Create a detailed Review Summary Report:

1. **Executive Summary** - Overall reputation health score and key takeaways
2. **Rating Distribution** - Breakdown analysis of star ratings
3. **Sentiment Trends** - How sentiment has been trending
4. **Top Positive Themes** - What customers love most (ranked)
5. **Top Negative Themes** - What needs improvement (ranked)
6. **Competitor Comparison** - How reviews compare to industry benchmarks
7. **Response Rate Analysis** - Recommendations for response strategy
8. **Actionable Insights:**
   - Quick wins (implement this week)
   - Medium-term improvements (this month)
   - Strategic changes (this quarter)
9. **Review Generation Strategy** - How to get more positive reviews
10. **Crisis Alert Items** - Any reviews requiring immediate attention`,
    };

    const prompt = toolPrompts[toolType] || toolPrompts.response;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    try {
      db.prepare(
        'INSERT INTO rv_generated (workspace_id, tool_type, input_data, output, platform, tone) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(wsId, toolType, JSON.stringify({ rating: starRating, reviewText: review?.content || review, businessName }), text, platform || null, tone || null);
    } catch (_) {}

    logActivity('reviews', 'generate', `Generated ${toolType}`, `${platform || 'general'} - ${tone || 'professional'} tone`, null, wsId);
    sse.sendResult({ content: text, toolType });
  } catch (error) {
    console.error('Review tool generation error:', error);
    sse.sendError(error);
  }
});

// GET /reviews - List all reviews
router.get('/reviews', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { source, rating, status } = req.query;
    let query = 'SELECT * FROM rv_reviews WHERE workspace_id = ?';
    const params = [wsId];

    if (source) { query += ' AND source = ?'; params.push(source); }
    if (rating) { query += ' AND rating = ?'; params.push(parseInt(rating)); }
    if (status) { query += ' AND status = ?'; params.push(status); }

    query += ' ORDER BY created_at DESC';
    const reviews = db.prepare(query).all(...params);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /reviews - Create a review
router.post('/reviews', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { source, rating, content, author, sentiment, status } = req.body;

    const result = db.prepare(
      'INSERT INTO rv_reviews (source, rating, content, author, sentiment, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(source || null, rating || null, content || null, author || null, sentiment || null, status || 'pending', wsId);

    const review = db.prepare('SELECT * FROM rv_reviews WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('reviews', 'create', 'Added review', `${rating}/5 from ${source || 'direct'}`, null, wsId);
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /templates - List response templates
router.get('/templates', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const templates = db.prepare('SELECT * FROM rv_templates WHERE workspace_id = ? ORDER BY star_rating ASC, created_at DESC').all(wsId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /templates - Create a response template
router.post('/templates', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { name, star_rating, tone, content } = req.body;

    const result = db.prepare(
      'INSERT INTO rv_templates (name, star_rating, tone, content, workspace_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, star_rating || null, tone || null, content, wsId);

    const template = db.prepare('SELECT * FROM rv_templates WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('reviews', 'create_template', 'Created response template', name, null, wsId);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /respond/:id - Generate and save response for a specific review
router.post('/respond/:id', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const review = db.prepare('SELECT * FROM rv_reviews WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!review) {
      sse.sendError(new Error('Review not found'));
      return;
    }

    const { tone, businessName, businessType } = req.body;

    const prompt = `You are an expert reputation manager. Write a direct response to this customer review. Output ONLY the response text, no analysis or metadata.

Business: ${businessName || 'our business'}
Business Type: ${businessType || 'general'}
Platform: ${review.source || 'Google'}
Rating: ${review.rating || 'unknown'}/5
Review: "${review.content}"
Author: ${review.author || 'Customer'}
Tone: ${tone || 'professional'}

Write a response that is sincere, addresses their specific points, and is 2-3 paragraphs long.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
    });

    db.prepare('UPDATE rv_reviews SET response = ?, status = ? WHERE id = ? AND workspace_id = ?').run(text, 'responded', review.id, wsId);
    logActivity('reviews', 'respond', 'Responded to review', `Review #${review.id}`, null, wsId);
    sse.sendResult({ content: text, reviewId: review.id });
  } catch (error) {
    console.error('Review respond error:', error);
    sse.sendError(error);
  }
});

// GET /stats - Get review statistics
router.get('/stats', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const total = db.prepare('SELECT COUNT(*) as count FROM rv_reviews WHERE workspace_id = ?').get(wsId).count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM rv_reviews WHERE status = 'pending' AND workspace_id = ?").get(wsId).count;
    const avgRating = db.prepare('SELECT COALESCE(AVG(rating), 0) as avg FROM rv_reviews WHERE rating IS NOT NULL AND workspace_id = ?').get(wsId).avg;
    const bySource = db.prepare('SELECT source, COUNT(*) as count FROM rv_reviews WHERE source IS NOT NULL AND workspace_id = ? GROUP BY source').all(wsId);
    const byRating = db.prepare('SELECT rating, COUNT(*) as count FROM rv_reviews WHERE rating IS NOT NULL AND workspace_id = ? GROUP BY rating ORDER BY rating').all(wsId);
    const bySentiment = db.prepare('SELECT sentiment, COUNT(*) as count FROM rv_reviews WHERE sentiment IS NOT NULL AND workspace_id = ? GROUP BY sentiment').all(wsId);

    res.json({ total, pending, avgRating: Math.round(avgRating * 10) / 10, bySource, byRating, bySentiment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /history - Get generation history
router.get('/history', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const history = db.prepare('SELECT * FROM rv_generated WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50').all(wsId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /analyze-sentiment — analyze sentiment trends across reviews
router.post('/analyze-sentiment', async (req, res) => {
  const wsId = req.workspace.id;
  const { reviews, business_name } = req.body;
  if (!reviews?.length) return res.status(400).json({ error: 'reviews required' });

  const reviewTexts = reviews.slice(0, 30).map((r, i) => `${i+1}. "${r.text || r.content || r}"` ).join('\n');

  try {
    const { text } = await generateTextWithClaude(`You are a customer sentiment analyst. Analyze these reviews for ${business_name || 'this business'}:

${reviewTexts}

Return JSON:
{
  "positive_percent": <number>,
  "neutral_percent": <number>,
  "negative_percent": <number>,
  "trending_topics": [
    { "topic": "<topic>", "sentiment": "positive|negative|mixed", "mention_count": <number> }
  ],
  "trajectory": "improving|stable|declining",
  "alert": "<null or urgent issue if major negative theme>",
  "summary": "<2 sentence overall summary>"
}

Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { res.json(JSON.parse(m[0])); } catch { res.status(500).json({ error: 'Failed to parse sentiment analysis' }); } }
      else res.status(500).json({ error: 'Failed to parse sentiment analysis' });
    }
    logActivity('reviews', 'analyze', 'Analyzed review sentiment', business_name || 'general', null, wsId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate-response — generate a response to a review
router.post('/generate-response', async (req, res) => {
  const wsId = req.workspace.id;
  const { review_text, rating, business_name } = req.body;
  if (!review_text) return res.status(400).json({ error: 'review_text required' });

  try {
    const { text } = await generateTextWithClaude(`You are a customer success expert. Write a professional response to this ${rating}-star review for ${business_name || 'our business'}:

Review: "${review_text}"
Rating: ${rating || '3'}/5

Write a response that is:
- Professional and empathetic
- Addresses specific points raised
- Appropriate length (${parseInt(rating) >= 4 ? 'brief thank you, 2-3 sentences' : parseInt(rating) <= 2 ? 'detailed, apologetic, offering resolution' : 'balanced, acknowledging both positives and concerns'})
- Never defensive
- Ends with a positive note

Return JSON:
{
  "response": "<the response text>",
  "tone": "<Grateful|Apologetic|Solution-Focused>",
  "tip": "<one tip for this type of review>"
}

Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { res.json(JSON.parse(m[0])); } catch { res.status(500).json({ error: 'Failed to parse review response' }); } }
      else res.status(500).json({ error: 'Failed to parse review response' });
    }
    logActivity('reviews', 'generate-response', 'Generated review response', `${rating}-star review`, null, wsId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /request-campaign — SSE: generate a bulk review request campaign
router.post('/request-campaign', async (req, res) => {
  const { business_name, business_type, platform, customer_list, tone } = req.body;
  if (!business_name) return res.status(400).json({ error: 'business_name required' });

  const sse = setupSSE(res);

  try {
    const customerCount = Array.isArray(customer_list) ? customer_list.length : (parseInt(customer_list) || 10);
    const { text } = await generateTextWithClaude(`You are an expert at generating review campaigns. Create a complete review request campaign for ${business_name}.

Business Type: ${business_type || 'general'}
Target Platform: ${platform || 'Google'}
Number of Customers: ${customerCount}
Tone: ${tone || 'warm and personal'}

Generate a complete multi-touch review request campaign:

## 📧 Email Sequence

### Email 1 — Initial Request (send immediately after purchase/interaction)
**Subject line options (3 variants):**
[3 subject lines]
**Email body:**
[Full email, 100-150 words, personal, not pushy]

### Email 2 — Gentle Reminder (send 4 days after Email 1 if no review)
**Subject line:**
[1 subject line]
**Email body:**
[60-80 words, brief, understanding]

### Email 3 — Final Ask (send 3 days after Email 2)
**Subject line:**
[1 subject line]
**Email body:**
[50-60 words, final ask, acknowledge their time]

## 📱 SMS Versions
**SMS 1 (initial):** [Under 160 chars — include placeholder for review link]
**SMS 2 (reminder):** [Under 160 chars]

## 💬 In-Person / Post-Purchase Script
[3-4 sentence verbal script for staff to use]

## 📊 Campaign Settings Recommended
- Best send time: [recommendation]
- Optimal send day: [recommendation]
- Expected response rate: [realistic %]
- Segments to exclude: [who not to ask]

Use [BUSINESS NAME], [CUSTOMER NAME], [REVIEW LINK] as placeholders.
Make all copy feel genuine and human, never robotic.`, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 4096,
    });

    logActivity('reviews', 'campaign', 'Generated review campaign', `${business_name} - ${platform || 'Google'}`, null, req.workspace.id);
    sse.sendResult({ content: text });
  } catch (err) {
    sse.sendError(err);
  }
});

module.exports = router;
