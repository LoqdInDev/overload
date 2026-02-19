const BASE = 'https://graph.facebook.com/v19.0';

function headers(token) {
  return { Authorization: `Bearer ${token}` };
}

async function getProfile(token) {
  // Get IG business accounts linked through Facebook pages
  const res = await fetch(`${BASE}/me/accounts?fields=instagram_business_account{id,name,username,profile_picture_url,followers_count}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Instagram profile failed: ${res.status}`);
  const { data } = await res.json();
  const accounts = data.filter(p => p.instagram_business_account).map(p => p.instagram_business_account);
  return accounts;
}

async function publishPhoto(token, igUserId, { imageUrl, caption }) {
  // Step 1: Create media container
  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST', headers: headers(token),
    body: new URLSearchParams({ image_url: imageUrl, caption: caption || '' }),
  });
  if (!containerRes.ok) throw new Error(`Instagram container failed: ${containerRes.status} ${await containerRes.text()}`);
  const { id: containerId } = await containerRes.json();

  // Step 2: Publish
  const pubRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST', headers: headers(token),
    body: new URLSearchParams({ creation_id: containerId }),
  });
  if (!pubRes.ok) throw new Error(`Instagram publish failed: ${pubRes.status}`);
  return pubRes.json();
}

async function publishCarousel(token, igUserId, { items, caption }) {
  // Create children containers
  const childIds = [];
  for (const item of items) {
    const res = await fetch(`${BASE}/${igUserId}/media`, {
      method: 'POST', headers: headers(token),
      body: new URLSearchParams({ image_url: item.imageUrl, is_carousel_item: 'true' }),
    });
    const { id } = await res.json();
    childIds.push(id);
  }

  // Create carousel container
  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST', headers: headers(token),
    body: new URLSearchParams({ media_type: 'CAROUSEL', children: childIds.join(','), caption: caption || '' }),
  });
  const { id: containerId } = await containerRes.json();

  // Publish
  const pubRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST', headers: headers(token),
    body: new URLSearchParams({ creation_id: containerId }),
  });
  return pubRes.json();
}

async function publishReel(token, igUserId, { videoUrl, caption, coverUrl }) {
  const params = new URLSearchParams({ media_type: 'REELS', video_url: videoUrl, caption: caption || '' });
  if (coverUrl) params.set('cover_url', coverUrl);

  const containerRes = await fetch(`${BASE}/${igUserId}/media`, { method: 'POST', headers: headers(token), body: params });
  if (!containerRes.ok) throw new Error(`Instagram reel container failed: ${containerRes.status}`);
  const { id: containerId } = await containerRes.json();

  // Wait for processing then publish
  const pubRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST', headers: headers(token),
    body: new URLSearchParams({ creation_id: containerId }),
  });
  return pubRes.json();
}

async function getMediaInsights(token, mediaId) {
  const res = await fetch(`${BASE}/${mediaId}/insights?metric=impressions,reach,engagement,saved`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Instagram insights failed: ${res.status}`);
  return res.json();
}

async function getAccountInsights(token, igUserId, { period = 'day', since, until, metrics = 'impressions,reach,follower_count' }) {
  const params = new URLSearchParams({ metric: metrics, period });
  if (since) params.set('since', since);
  if (until) params.set('until', until);
  const res = await fetch(`${BASE}/${igUserId}/insights?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Instagram account insights failed: ${res.status}`);
  return res.json();
}

async function getMedia(token, igUserId, { limit = 25 } = {}) {
  const res = await fetch(`${BASE}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=${limit}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Instagram media failed: ${res.status}`);
  return res.json();
}

module.exports = { getProfile, publishPhoto, publishCarousel, publishReel, getMediaInsights, getAccountInsights, getMedia, providerId: 'instagram' };
