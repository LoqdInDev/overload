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
    const { providerId, text, caption, mediaUrl, imageUrl, postId, pageId, pageToken, boardId, title, link } = req.body;

    if (!pm.isConnected(providerId)) {
      return res.status(400).json({ success: false, error: `${providerId} is not connected. Go to Integrations to connect.` });
    }

    const content = {};
    const postText = text || caption || '';

    switch (providerId) {
      case 'twitter':
        content.text = postText;
        break;
      case 'linkedin':
        content.text = postText;
        if (mediaUrl || imageUrl) content.mediaUrn = mediaUrl;
        if (title) content.title = title;
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

    const result = await pm.socialPost(providerId, content);

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

module.exports = router;
