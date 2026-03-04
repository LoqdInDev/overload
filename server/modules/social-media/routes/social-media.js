const express = require('express');
const router = express.Router();
const { db, logActivity } = require('../../../db/database');
const { generateTextWithClaude } = require('../../../services/claude');
const { setupSSE } = require('../../../services/sse');
const pm = require('../../../services/platformManager');
const { getBrandContext, buildBrandSystemPrompt } = require('../../../services/brandContext');

// POST /generate - SSE: generate social media content
router.post('/generate', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;

  try {
    const { platform, postType, topic, tone, count, includeHashtags, template, customPrompt, brand, prompt: rawPrompt } = req.body;

    // If a raw prompt is provided and no structured fields, use it directly
    if (rawPrompt && !postType && !topic) {
      const { text } = await generateTextWithClaude(rawPrompt, {
        onChunk: (chunk) => sse.sendChunk(chunk),
      });
      logActivity('social', 'generate', `Generated ${platform || 'social'} content`, 'AI generation', null, wsId);
      sse.sendResult({ content: text, platform });
      return;
    }

    const platformLimits = {
      instagram: { chars: 2200, hashtags: 30, note: 'Visual-first platform. Captions support line breaks. First line is crucial.' },
      twitter: { chars: 280, hashtags: 3, note: 'Concise and punchy. Threads for longer content. Engagement-driven.' },
      linkedin: { chars: 3000, hashtags: 5, note: 'Professional tone. Storytelling works well. Use line breaks for readability.' },
      tiktok: { chars: 2200, hashtags: 5, note: 'Casual, trendy, authentic. Hook in first 3 seconds reference. Use trending sounds.' },
      facebook: { chars: 63206, hashtags: 5, note: 'Community-focused. Questions and polls drive engagement. Longer posts OK.' },
    };

    const platformInfo = platformLimits[platform] || platformLimits.instagram;

    const postTypeInstructions = {
      feed: 'Create a standard feed post caption that stops the scroll.',
      story: 'Create story-ready content: short, engaging, with poll/question sticker suggestions.',
      reel: 'Create a Reel/short-form video script with: hook (first 3 sec), body, CTA. Include trending audio suggestions.',
      thread: 'Create a multi-part thread (5-7 posts) that tells a story or provides valuable insights.',
      carousel: 'Create a carousel post plan: slide-by-slide content (8-10 slides) with a swipe-worthy hook on slide 1.',
    };

    const typeInstruction = postTypeInstructions[postType] || postTypeInstructions.feed;

    let prompt;

    if (postType === 'calendar') {
      prompt = `You are a social media strategist creating a weekly content calendar.

Platform: ${platform || 'multi-platform'}
Brand/Topic: ${topic || 'general brand'}
Tone: ${tone || 'engaging and professional'}
${brand ? `Brand Voice: ${brand}` : ''}
${customPrompt ? `Additional Context: ${customPrompt}` : ''}

Create a 7-day content calendar with:

For each day:
- DAY: [Monday-Sunday]
- TIME: [Best posting time with timezone]
- TYPE: [Feed Post / Story / Reel / Carousel]
- TOPIC: [Content topic/theme]
- CAPTION: [Full caption text]
- HASHTAGS: [Relevant hashtags]
- VISUAL: [Image/video description or direction]
- ENGAGEMENT TIP: [How to boost engagement for this post]

Include a mix of:
- Educational content (2 days)
- Entertaining/trending content (2 days)
- Promotional content (1 day)
- Behind-the-scenes/personal (1 day)
- Community engagement/UGC (1 day)

Also provide:
- Weekly theme/narrative arc
- Key metrics to track
- Content pillars used

Format cleanly with clear day separators.`;
    } else if (postType === 'hashtags') {
      prompt = `You are a hashtag research specialist for social media growth.

Platform: ${platform || 'instagram'}
Topic/Niche: ${topic || 'general'}
${customPrompt ? `Additional Context: ${customPrompt}` : ''}

Generate a comprehensive hashtag strategy:

TIER 1 - HIGH VOLUME (500K+ posts):
[5-8 broad, popular hashtags]

TIER 2 - MEDIUM VOLUME (50K-500K posts):
[8-10 niche-specific hashtags]

TIER 3 - LOW VOLUME (5K-50K posts):
[5-8 micro-niche hashtags for discoverability]

BRANDED:
[3-5 branded/campaign hashtag suggestions]

TRENDING NOW:
[3-5 currently trending relevant hashtags]

For each tier, provide:
- Estimated reach potential
- Competition level (low/medium/high)
- Best content type to pair with

STRATEGY NOTES:
- Recommended hashtag count per post
- Hashtag placement recommendation (caption vs comment)
- Rotation schedule suggestion
- Banned/shadowbanned hashtags to avoid in this niche`;
    } else {
      prompt = `You are an elite social media content creator specializing in ${platform || 'multi-platform'} content. Generate ${count || 3} engaging posts.

Platform: ${platform || 'Instagram'}
Platform Specs: ${platformInfo.note} (Max ${platformInfo.chars} chars, max ${platformInfo.hashtags} hashtags)
Post Type: ${postType || 'feed'}
Topic: ${topic || 'general content'}
Tone: ${tone || 'engaging and professional'}
${includeHashtags !== false ? `Include up to ${platformInfo.hashtags} relevant hashtags.` : 'Do not include hashtags.'}
${brand ? `Brand Voice: ${brand}` : ''}
${template ? `Template Style: ${template}` : ''}
${customPrompt ? `Additional Instructions: ${customPrompt}` : ''}

${typeInstruction}

For each post provide:
POST [number]:
CAPTION: [Full caption text, optimized for ${platform || 'the platform'}]
${includeHashtags !== false ? 'HASHTAGS: [Relevant hashtags]' : ''}
BEST TIME: [Recommended posting time with day]
VISUAL DIRECTION: [What image/video to pair with this]
ENGAGEMENT HOOK: [Question or CTA to drive comments]
ESTIMATED REACH: [Low / Medium / High potential]

Separate each post with "---".

Make each post feel authentic and native to the platform, not like AI-generated content.`;
    }

    // Inject brand context into prompt
    const brandBlock = buildBrandSystemPrompt(getBrandContext(wsId));
    if (brandBlock) prompt += brandBlock;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (chunk) => sse.sendChunk(chunk),
      maxTokens: 6144,
      temperature: 0.85,
    });

    // Save to database
    const result = db.prepare(
      'INSERT INTO sm_posts (platform, post_type, caption, hashtags, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      platform || 'multi',
      postType || 'feed',
      text,
      null,
      JSON.stringify({ topic, tone, count, template, brand }),
      wsId
    );

    logActivity('social', 'generate', `Generated ${platform || 'multi-platform'} ${postType || 'feed'} content`, topic, String(result.lastInsertRowid), wsId);

    sse.sendResult({ id: result.lastInsertRowid, content: text, platform, postType });
  } catch (error) {
    console.error('Social media generation error:', error);
    sse.sendError(error);
  }
});

// GET /posts - list all posts
router.get('/posts', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { platform, status, post_type } = req.query;
    let query = 'SELECT * FROM sm_posts';
    const conditions = ['workspace_id = ?'];
    const params = [wsId];

    if (platform) {
      conditions.push('platform = ?');
      params.push(platform);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (post_type) {
      conditions.push('post_type = ?');
      params.push(post_type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const posts = db.prepare(query).all(...params);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /posts/:id - get single post
router.get('/posts/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const post = db.prepare('SELECT * FROM sm_posts WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /posts - create a post
router.post('/posts', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { platform, post_type, caption, hashtags, media_notes, best_time, scheduled_at, status, metadata } = req.body;
    const result = db.prepare(
      'INSERT INTO sm_posts (platform, post_type, caption, hashtags, media_notes, best_time, scheduled_at, status, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(platform, post_type || 'feed', caption || null, hashtags || null, media_notes || null, best_time || null, scheduled_at || null, status || 'draft', metadata ? JSON.stringify(metadata) : null, wsId);
    const post = db.prepare('SELECT * FROM sm_posts WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    logActivity('social', 'create', `Created ${platform} post`, caption?.slice(0, 80), String(result.lastInsertRowid), wsId);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /posts/:id - update a post
router.put('/posts/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM sm_posts WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Post not found' });

    const { platform, post_type, caption, hashtags, media_notes, best_time, scheduled_at, status } = req.body;
    db.prepare(
      `UPDATE sm_posts SET platform = ?, post_type = ?, caption = ?, hashtags = ?, media_notes = ?, best_time = ?, scheduled_at = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ?`
    ).run(
      platform || existing.platform,
      post_type || existing.post_type,
      caption !== undefined ? caption : existing.caption,
      hashtags !== undefined ? hashtags : existing.hashtags,
      media_notes !== undefined ? media_notes : existing.media_notes,
      best_time !== undefined ? best_time : existing.best_time,
      scheduled_at !== undefined ? scheduled_at : existing.scheduled_at,
      status || existing.status,
      req.params.id,
      wsId
    );

    const updated = db.prepare('SELECT * FROM sm_posts WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /posts/:id - delete a post
router.delete('/posts/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM sm_posts WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    db.prepare('DELETE FROM sm_posts WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    logActivity('social', 'delete', `Deleted ${existing.platform} post`, null, req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /calendar - get calendar entries
router.get('/calendar', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { month, year, platform } = req.query;
    let query = 'SELECT * FROM sm_calendar';
    const conditions = ['workspace_id = ?'];
    const params = [wsId];

    if (month && year) {
      conditions.push("strftime('%m', scheduled_date) = ? AND strftime('%Y', scheduled_date) = ?");
      params.push(String(month).padStart(2, '0'), String(year));
    }
    if (platform) {
      conditions.push('platform = ?');
      params.push(platform);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY scheduled_date ASC, scheduled_time ASC';

    const entries = db.prepare(query).all(...params);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /calendar - create calendar entry
router.post('/calendar', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { title, platform, post_type, content_summary, scheduled_date, scheduled_time, status, post_id } = req.body;
    const result = db.prepare(
      'INSERT INTO sm_calendar (title, platform, post_type, content_summary, scheduled_date, scheduled_time, status, post_id, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(title, platform || null, post_type || null, content_summary || null, scheduled_date, scheduled_time || null, status || 'planned', post_id || null, wsId);
    const entry = db.prepare('SELECT * FROM sm_calendar WHERE id = ? AND workspace_id = ?').get(result.lastInsertRowid, wsId);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /calendar/:id - delete calendar entry
router.delete('/calendar/:id', (req, res) => {
  try {
    const wsId = req.workspace.id;
    const existing = db.prepare('SELECT * FROM sm_calendar WHERE id = ? AND workspace_id = ?').get(req.params.id, wsId);
    if (!existing) return res.status(404).json({ error: 'Calendar entry not found' });
    db.prepare('DELETE FROM sm_calendar WHERE id = ? AND workspace_id = ?').run(req.params.id, wsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════
// Real Platform Integration Routes
// ══════════════════════════════════════════════════════

// GET /accounts - list connected social media accounts
router.get('/accounts', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const socialProviders = ['twitter', 'linkedin', 'meta', 'google', 'tiktok', 'pinterest'];
    const connected = pm.getConnectedProviders().filter(p => socialProviders.includes(p.provider_id));

    // Enrich with cached account info from sm_accounts
    const accounts = connected.map(c => {
      const cached = db.prepare('SELECT * FROM sm_accounts WHERE provider_id = ? AND workspace_id = ? ORDER BY updated_at DESC LIMIT 1').get(c.provider_id, wsId);
      return {
        providerId: c.provider_id,
        displayName: c.display_name,
        accountName: c.account_name,
        accountId: c.account_id,
        username: cached?.username || null,
        avatar: cached?.avatar_url || null,
        followers: cached?.followers || 0,
        connectedAt: c.connected_at,
      };
    });

    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Accounts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /accounts/:providerId/sync - refresh account profile info
router.post('/accounts/:providerId/sync', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { providerId } = req.params;
    if (!pm.isConnected(providerId)) {
      return res.status(400).json({ success: false, error: `${providerId} is not connected` });
    }

    const profile = await pm.socialProfile(providerId);
    if (!profile) return res.status(404).json({ success: false, error: 'Could not fetch profile' });

    const existing = db.prepare('SELECT id FROM sm_accounts WHERE provider_id = ? AND workspace_id = ?').get(providerId, wsId);
    if (existing) {
      db.prepare(`UPDATE sm_accounts SET username = ?, display_name = ?, avatar_url = ?, followers = ?, account_id = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ?`)
        .run(profile.username || profile.name, profile.name, profile.avatar || null, profile.followers || 0, profile.id, existing.id, wsId);
    } else {
      db.prepare('INSERT INTO sm_accounts (provider_id, platform, account_id, username, display_name, avatar_url, followers, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(providerId, providerId, profile.id, profile.username || profile.name, profile.name, profile.avatar || null, profile.followers || 0, wsId);
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Account sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /publish - publish a post to a connected platform
router.post('/publish', async (req, res) => {
  try {
    const wsId = req.workspace.id;
    const { providerId, platformId, text, caption, mediaUrl, imageUrl, postId, pageId, pageToken, boardId, title, link } = req.body;

    if (!pm.isConnected(providerId)) {
      return res.status(400).json({ success: false, error: `${providerId} is not connected. Go to Integrations to connect.` });
    }

    const content = {};
    const postText = text || caption || '';
    let result;

    // Instagram needs its own routing (separate from Facebook despite sharing 'meta' OAuth)
    if (platformId === 'instagram') {
      const igPlatforms = require('../../../services/platforms');
      const token = await pm.getToken('meta');
      const igAccounts = await igPlatforms.instagram.getProfile(token);
      if (!igAccounts || !igAccounts.length) {
        return res.status(400).json({ success: false, error: 'No Instagram Business account found. Make sure your Instagram account is linked to a Facebook Page.' });
      }
      const igUserId = igAccounts[0].id;
      if (!imageUrl && !mediaUrl) {
        return res.status(400).json({ success: false, error: 'Instagram requires a media URL to publish. Paste an image URL in the media field.' });
      }
      result = await igPlatforms.instagram.publishPhoto(token, igUserId, { imageUrl: imageUrl || mediaUrl, caption: postText });
    } else {
      switch (providerId) {
        case 'twitter':
          content.text = postText;
          break;
        case 'linkedin':
          content.text = postText;
          content.title = title || '';
          break;
        case 'meta':
          content.message = postText;
          if (pageId) content.pageId = pageId;
          if (pageToken) content.pageToken = pageToken;
          if (mediaUrl || imageUrl) content.mediaUrl = mediaUrl || imageUrl;
          if (link) content.link = link;
          break;
        case 'pinterest':
          content.boardId = boardId;
          content.title = title || postText.slice(0, 100);
          content.description = postText;
          content.imageUrl = imageUrl || mediaUrl;
          if (link) content.link = link;
          break;
        case 'tiktok':
          content.title = title || postText.slice(0, 150);
          break;
        default:
          return res.status(400).json({ success: false, error: `Publishing not supported for ${providerId}` });
      }
      result = await pm.socialPost(providerId, content);
    }

    // Update post status in DB if postId provided
    if (postId) {
      db.prepare("UPDATE sm_posts SET status = 'published', published_at = datetime('now'), external_post_id = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ?")
        .run(result?.data?.id || result?.id || null, postId, wsId);
    }

    logActivity('social', 'publish', `Published to ${providerId}`, postText.slice(0, 80), null, wsId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /analytics/:providerId - get analytics for a connected platform
router.get('/analytics/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { startDate, endDate, startTime, endTime, pageId, period } = req.query;

    if (!pm.isConnected(providerId)) {
      return res.status(400).json({ success: false, error: `${providerId} is not connected` });
    }

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    if (pageId) params.pageId = pageId;
    if (period) params.period = period;

    const data = await pm.socialAnalytics(providerId, params);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /pages/:providerId - get Facebook pages or similar sub-accounts
router.get('/pages/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!pm.isConnected(providerId)) {
      return res.status(400).json({ success: false, error: `${providerId} is not connected` });
    }

    const token = await pm.getToken(providerId);
    const platforms = require('../../../services/platforms');

    let pages = [];
    if (providerId === 'meta') {
      pages = await platforms.facebook.getPages(token);
    } else if (providerId === 'google') {
      const profile = await platforms.youtube.getProfile(token);
      pages = profile ? [profile] : [];
    }

    res.json({ success: true, data: pages });
  } catch (error) {
    console.error('Pages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /generate-variations — generate 3 caption variations
router.post('/generate-variations', async (req, res) => {
  const { caption, platform } = req.body;
  if (!caption) return res.status(400).json({ error: 'caption required' });

  try {
    const { text } = await generateTextWithClaude(`You are a social media expert. Create 3 variations of this caption for ${platform || 'social media'}:

Original: "${caption}"

Return JSON:
{
  "variations": [
    { "tone": "Professional", "caption": "<rewritten caption>", "why": "<why this works>" },
    { "tone": "Casual & Fun", "caption": "<rewritten caption>", "why": "<why this works>" },
    { "tone": "Viral Hook", "caption": "<rewritten caption>", "why": "<why this works>" }
  ]
}

Make each variation distinctly different. Keep platform best practices. Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse caption variations' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cross-platform - SSE: generate adapted posts for all platforms at once
router.post('/cross-platform', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { brief, platforms: targetPlatforms, tone } = req.body;
    if (!brief) { sse.sendError({ message: 'brief required' }); return; }
    const brandBlock = buildBrandSystemPrompt(getBrandContext(wsId));
    const targets = (targetPlatforms || ['instagram', 'twitter', 'linkedin', 'tiktok', 'facebook']).join(', ');

    const prompt = `You are a cross-platform social media expert. Adapt this brief into platform-native posts.

Brief: ${brief}
Tone: ${tone || 'engaging and authentic'}
${brandBlock || ''}

Generate one post for EACH of these platforms: ${targets}

Platform specs:
- Instagram: visual-first, line breaks, 5-15 hashtags, emojis, 2200 max chars
- Twitter/X: 280 chars HARD LIMIT, punchy hook, 1-2 hashtags max
- LinkedIn: professional storytelling, 3-5 hashtags, 3000 max chars
- TikTok: casual/trendy script-style, reference hooks, 3-5 hashtags
- Facebook: community-focused, ask questions to spark comments

Format your response exactly as:
PLATFORM: [platform name]
POST:
[full post text]
BEST TIME: [day & time recommendation]
---

Separate each platform with "---". Make each feel completely native.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (c) => sse.sendChunk(c), maxTokens: 4096, temperature: 0.85,
    });
    const result = db.prepare('INSERT INTO sm_posts (platform, post_type, caption, metadata, workspace_id) VALUES (?, ?, ?, ?, ?)')
      .run('multi', 'cross-platform', text, JSON.stringify({ brief, platforms: targetPlatforms }), wsId);
    logActivity('social', 'cross-platform', 'Generated cross-platform posts', brief.slice(0, 80), String(result.lastInsertRowid), wsId);
    sse.sendResult({ id: result.lastInsertRowid, content: text });
  } catch (error) {
    console.error('Cross-platform error:', error);
    sse.sendError(error);
  }
});

// POST /repurpose - SSE: repurpose any content into social posts
router.post('/repurpose', async (req, res) => {
  const sse = setupSSE(res);
  const wsId = req.workspace.id;
  try {
    const { content, contentType = 'blog post', targetPlatforms } = req.body;
    if (!content) { sse.sendError({ message: 'content required' }); return; }
    const brandBlock = buildBrandSystemPrompt(getBrandContext(wsId));
    const targets = (targetPlatforms || ['instagram', 'twitter', 'linkedin']).join(', ');

    const prompt = `You are a social media repurposing expert. Transform this ${contentType} into engaging, platform-native social posts.

${contentType.toUpperCase()}:
${content.slice(0, 5000)}
${brandBlock || ''}

Extract the most valuable insights, stories, stats, and hooks. Create posts for: ${targets}

For each platform:
PLATFORM: [name]
POST:
[full post — written natively for that platform's culture and format]
KEY INSIGHT: [what you extracted from the source content]
---

Don't copy-paste excerpts. Rewrite everything to feel native and engaging on each platform.`;

    const { text } = await generateTextWithClaude(prompt, {
      onChunk: (c) => sse.sendChunk(c), maxTokens: 4096, temperature: 0.8,
    });
    sse.sendResult({ content: text });
  } catch (error) {
    console.error('Repurpose error:', error);
    sse.sendError(error);
  }
});

// POST /best-times - AI-recommended posting times per platform
router.post('/best-times', async (req, res) => {
  const { platform, industry, audience } = req.body;
  try {
    const { text } = await generateTextWithClaude(
      `You are a social media timing expert. Provide optimal posting times.\nPlatform: ${platform || 'instagram'}\nIndustry: ${industry || 'general'}\nAudience: ${audience || 'general'}\n\nReturn ONLY valid JSON (no markdown):\n{"best_times":[{"day":"Tuesday","time":"9:00 AM EST","reason":"high engagement window","score":95},{"day":"Wednesday","time":"12:00 PM EST","reason":"lunch scroll peak","score":88},{"day":"Thursday","time":"6:00 PM EST","reason":"evening commute","score":85}],"avoid":["Saturday early morning","Sunday evening"],"tip":"One key platform-specific timing insight"}`,
      { temperature: 0.3 }
    );
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch {
    res.json({
      best_times: [
        { day: 'Tuesday', time: '9:00 AM', reason: 'Peak morning engagement', score: 92 },
        { day: 'Wednesday', time: '12:00 PM', reason: 'Lunch scroll peak', score: 87 },
        { day: 'Thursday', time: '6:00 PM', reason: 'Evening commute', score: 85 },
      ],
      avoid: ['Saturday early morning', 'Sunday evening'],
      tip: `${platform || 'This platform'} sees highest engagement mid-week during commute hours.`,
    });
  }
});

// POST /hashtag-intelligence — get smart hashtag recommendations
router.post('/hashtag-intelligence', async (req, res) => {
  const { topic, platform } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  try {
    const { text } = await generateTextWithClaude(`You are a hashtag strategist. Generate a strategic hashtag set for:
Topic: ${topic}
Platform: ${platform || 'Instagram'}

Return JSON:
{
  "mega": [{ "tag": "#example", "reach": "2.1M posts" }],
  "high": [{ "tag": "#example", "reach": "450K posts" }],
  "niche": [{ "tag": "#example", "reach": "12K posts" }],
  "strategy": "<brief hashtag mix strategy>"
}

Provide 3-4 tags per category. Make them real and relevant. Only return JSON.`);
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    try { res.json(JSON.parse(cleaned)); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) res.json(JSON.parse(m[0]));
      else res.status(500).json({ error: 'Failed to parse hashtag recommendations' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
