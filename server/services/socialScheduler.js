/**
 * Social Media Post Scheduler
 *
 * Runs on a 60-second interval. Checks for posts with status = 'scheduled'
 * and scheduled_at <= NOW, then publishes them via the platform manager.
 *
 * Retry logic: on failure, retries up to 3 times with exponential backoff
 * (tracked via metadata.retry_count). After 3 failures, marks post as 'failed'.
 */

const { db, logActivity } = require('../db/database');
const pm = require('./platformManager');
const { logger } = require('./logger');

const TICK_INTERVAL = 60 * 1000; // 60 seconds
const MAX_RETRIES = 3;

let schedulerTimer = null;

// ── Publish a single post ────────────────────────────────────────

async function publishPost(post) {
  const providerId = mapPlatformToProvider(post.platform);
  if (!providerId) {
    throw new Error(`No provider mapping for platform: ${post.platform}`);
  }

  if (!pm.isConnected(providerId)) {
    throw new Error(`${providerId} is not connected`);
  }

  const text = post.caption || '';
  const meta = JSON.parse(post.metadata || '{}');
  const content = {};
  let result;

  // Instagram via Meta OAuth
  if (post.platform === 'instagram') {
    const platforms = require('./platforms');
    const token = await pm.getToken('meta');
    const igAccounts = await platforms.instagram.getProfile(token);
    if (!igAccounts || !igAccounts.length) {
      throw new Error('No Instagram Business account linked to Facebook Page');
    }
    const igUserId = igAccounts[0].id;
    if (!post.media_url) {
      throw new Error('Instagram requires a media URL');
    }
    result = await platforms.instagram.publishPhoto(token, igUserId, {
      imageUrl: post.media_url,
      caption: text,
    });
  } else {
    switch (providerId) {
      case 'twitter':
        content.text = text;
        break;
      case 'linkedin':
        content.text = text;
        content.title = meta.title || '';
        break;
      case 'meta':
        content.message = text;
        if (meta.pageId) content.pageId = meta.pageId;
        if (meta.pageToken) content.pageToken = meta.pageToken;
        if (post.media_url) content.mediaUrl = post.media_url;
        if (meta.link) content.link = meta.link;
        break;
      case 'pinterest':
        content.boardId = meta.boardId;
        content.title = meta.title || text.slice(0, 100);
        content.description = text;
        content.imageUrl = post.media_url;
        if (meta.link) content.link = meta.link;
        break;
      case 'tiktok':
        content.title = meta.title || text.slice(0, 150);
        break;
      default:
        throw new Error(`Publishing not supported for ${providerId}`);
    }
    result = await pm.socialPost(providerId, content);
  }

  return result;
}

// ── Platform → Provider mapping ──────────────────────────────────

function mapPlatformToProvider(platform) {
  const map = {
    twitter: 'twitter',
    instagram: 'meta',
    facebook: 'meta',
    linkedin: 'linkedin',
    tiktok: 'tiktok',
    youtube: 'google',
    pinterest: 'pinterest',
  };
  return map[platform] || null;
}

// ── Main tick ────────────────────────────────────────────────────

async function tick() {
  try {
    // Find all posts that are scheduled and due
    const duePosts = await db.prepare(`
      SELECT * FROM sm_posts
      WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at::timestamptz <= NOW()
      ORDER BY scheduled_at ASC
      LIMIT 20
    `).all();

    if (duePosts.length === 0) return;

    logger.info(`[social-scheduler] ${duePosts.length} post(s) due for publishing`);

    for (const post of duePosts) {
      const meta = JSON.parse(post.metadata || '{}');
      const retryCount = meta.retry_count || 0;

      try {
        const result = await publishPost(post);
        const externalId = result?.data?.id || result?.id || null;

        // Mark as published
        await db.prepare(`
          UPDATE sm_posts
          SET status = 'published',
              published_at = CURRENT_TIMESTAMP,
              external_post_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(externalId, post.id);

        await logActivity(
          'social', 'scheduled-publish',
          `Auto-published to ${post.platform}`,
          (post.caption || '').slice(0, 80),
          String(post.id),
          post.workspace_id
        );

        logger.info(`[social-scheduler] Published post #${post.id} to ${post.platform}`);
      } catch (err) {
        logger.error(`[social-scheduler] Failed post #${post.id}: ${err.message}`);

        if (retryCount + 1 >= MAX_RETRIES) {
          // Max retries exceeded — mark as failed
          const updatedMeta = JSON.stringify({ ...meta, retry_count: retryCount + 1, last_error: err.message });
          await db.prepare(`
            UPDATE sm_posts
            SET status = 'failed',
                metadata = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(updatedMeta, post.id);

          logger.warn(`[social-scheduler] Post #${post.id} failed after ${MAX_RETRIES} retries`);
        } else {
          // Bump retry count and push scheduled_at back (exponential backoff: 2, 4, 8 minutes)
          const backoffMinutes = Math.pow(2, retryCount + 1);
          const updatedMeta = JSON.stringify({ ...meta, retry_count: retryCount + 1, last_error: err.message });
          await db.prepare(`
            UPDATE sm_posts
            SET scheduled_at = (NOW() + INTERVAL '${backoffMinutes} minutes')::text,
                metadata = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(updatedMeta, post.id);

          logger.info(`[social-scheduler] Post #${post.id} retry ${retryCount + 1}/${MAX_RETRIES} in ${backoffMinutes}m`);
        }
      }
    }
  } catch (err) {
    logger.error(`[social-scheduler] Tick error: ${err.message}`);
  }
}

// ── Public API ───────────────────────────────────────────────────

function startSocialScheduler() {
  logger.info('  Social scheduler started (60s interval, first tick in 15s)');
  setTimeout(() => {
    tick();
    schedulerTimer = setInterval(tick, TICK_INTERVAL);
  }, 15000);
}

function stopSocialScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info('  Social scheduler stopped');
  }
}

module.exports = { startSocialScheduler, stopSocialScheduler };
