const BASE = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getProfile(token) {
  const res = await fetch(`${BASE}/channels?part=snippet,statistics&mine=true`, { headers: headers(token) });
  if (!res.ok) throw new Error(`YouTube profile failed: ${res.status}`);
  const { items } = await res.json();
  if (!items?.length) return null;
  const ch = items[0];
  return {
    id: ch.id, name: ch.snippet.title, avatar: ch.snippet.thumbnails?.default?.url,
    subscribers: ch.statistics.subscriberCount, views: ch.statistics.viewCount, videos: ch.statistics.videoCount,
  };
}

async function getChannelAnalytics(token, { startDate, endDate, metrics = 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,likes' }) {
  const params = new URLSearchParams({
    ids: 'channel==MINE', startDate, endDate, metrics,
  });
  const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`YouTube analytics failed: ${res.status}`);
  return res.json();
}

async function listVideos(token, { maxResults = 25, channelId } = {}) {
  const searchParams = new URLSearchParams({
    part: 'snippet,statistics', maxResults: String(maxResults), type: 'video', forMine: 'true',
  });
  const res = await fetch(`${BASE}/search?${searchParams}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`YouTube videos failed: ${res.status}`);
  const { items } = await res.json();
  return items.map(v => ({
    id: v.id.videoId, title: v.snippet.title, description: v.snippet.description,
    thumbnail: v.snippet.thumbnails?.medium?.url, publishedAt: v.snippet.publishedAt,
  }));
}

async function getVideoStats(token, videoIds) {
  const res = await fetch(`${BASE}/videos?part=statistics,snippet&id=${videoIds.join(',')}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`YouTube video stats failed: ${res.status}`);
  const { items } = await res.json();
  return items.map(v => ({
    id: v.id, title: v.snippet.title,
    views: v.statistics.viewCount, likes: v.statistics.likeCount,
    comments: v.statistics.commentCount,
  }));
}

async function uploadVideo(token, { title, description, tags, privacyStatus = 'private', videoBuffer }) {
  // Step 1: Initiate resumable upload
  const metadata = {
    snippet: { title, description, tags: tags || [] },
    status: { privacyStatus },
  };
  const initRes = await fetch(`${UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`, {
    method: 'POST', headers: { ...headers(token) },
    body: JSON.stringify(metadata),
  });
  if (!initRes.ok) throw new Error(`YouTube upload init failed: ${initRes.status}`);
  const uploadUrl = initRes.headers.get('location');

  // Step 2: Upload video data
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'video/*' },
    body: videoBuffer,
  });
  if (!uploadRes.ok) throw new Error(`YouTube upload failed: ${uploadRes.status}`);
  return uploadRes.json();
}

async function updateVideo(token, { videoId, title, description, tags, privacyStatus }) {
  const body = { id: videoId, snippet: {}, status: {} };
  if (title) body.snippet.title = title;
  if (description) body.snippet.description = description;
  if (tags) body.snippet.tags = tags;
  if (privacyStatus) body.status.privacyStatus = privacyStatus;

  const res = await fetch(`${BASE}/videos?part=snippet,status`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`YouTube update failed: ${res.status}`);
  return res.json();
}

module.exports = { getProfile, getChannelAnalytics, listVideos, getVideoStats, uploadVideo, updateVideo, providerId: 'youtube' };
