const BASE = 'https://api.twitter.com/2';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getProfile(token) {
  const res = await fetch(`${BASE}/users/me?user.fields=profile_image_url,public_metrics`, { headers: headers(token) });
  const { data } = await res.json();
  return { id: data.id, name: data.name, username: data.username, avatar: data.profile_image_url, followers: data.public_metrics?.followers_count };
}

async function postContent(token, { text, mediaIds }) {
  const body = { text };
  if (mediaIds?.length) body.media = { media_ids: mediaIds };
  const res = await fetch(`${BASE}/tweets`, { method: 'POST', headers: headers(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Twitter post failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deleteTweet(token, tweetId) {
  const res = await fetch(`${BASE}/tweets/${tweetId}`, { method: 'DELETE', headers: headers(token) });
  if (!res.ok) throw new Error(`Twitter delete failed: ${res.status}`);
  return res.json();
}

async function getAnalytics(token, { userId, startTime, endTime, maxResults = 100 }) {
  const params = new URLSearchParams({
    'tweet.fields': 'public_metrics,created_at',
    max_results: String(maxResults),
  });
  if (startTime) params.set('start_time', startTime);
  if (endTime) params.set('end_time', endTime);
  const res = await fetch(`${BASE}/users/${userId}/tweets?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Twitter analytics failed: ${res.status}`);
  const { data = [] } = await res.json();
  return data.map(t => ({
    id: t.id, text: t.text, createdAt: t.created_at,
    metrics: t.public_metrics,
  }));
}

async function uploadMedia(token, { mediaData, mediaType }) {
  // Twitter media upload uses v1.1 endpoint
  const form = new URLSearchParams();
  form.set('media_data', mediaData);
  form.set('media_category', mediaType === 'video' ? 'tweet_video' : 'tweet_image');
  const res = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Twitter media upload failed: ${res.status}`);
  const data = await res.json();
  return data.media_id_string;
}

module.exports = { getProfile, postContent, deleteTweet, getAnalytics, uploadMedia, providerId: 'twitter' };
