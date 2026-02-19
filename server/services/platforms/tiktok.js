const BASE = 'https://open.tiktokapis.com/v2';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getProfile(token) {
  const res = await fetch(`${BASE}/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`TikTok profile failed: ${res.status}`);
  const { data } = await res.json();
  return {
    id: data.user.open_id, name: data.user.display_name, avatar: data.user.avatar_url,
    followers: data.user.follower_count, likes: data.user.likes_count, videos: data.user.video_count,
  };
}

async function initVideoUpload(token, { title, privacyLevel = 'SELF_ONLY', disableDuet = false, disableStitch = false }) {
  const body = {
    post_info: { title, privacy_level: privacyLevel, disable_duet: disableDuet, disable_stitch: disableStitch },
    source_info: { source: 'FILE_UPLOAD' },
  };
  const res = await fetch(`${BASE}/post/publish/inbox/video/init/`, { method: 'POST', headers: headers(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`TikTok upload init failed: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return { publishId: data.publish_id, uploadUrl: data.upload_url };
}

async function uploadVideoChunk(uploadUrl, videoBuffer) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}` },
    body: videoBuffer,
  });
  if (!res.ok) throw new Error(`TikTok video upload failed: ${res.status}`);
  return res.json();
}

async function getPublishStatus(token, publishId) {
  const res = await fetch(`${BASE}/post/publish/status/fetch/`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ publish_id: publishId }),
  });
  if (!res.ok) throw new Error(`TikTok publish status failed: ${res.status}`);
  return res.json();
}

async function listVideos(token, { maxCount = 20, cursor } = {}) {
  const body = { max_count: maxCount };
  if (cursor) body.cursor = cursor;
  const res = await fetch(`${BASE}/video/list/?fields=id,title,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TikTok list videos failed: ${res.status}`);
  return res.json();
}

async function getVideoAnalytics(token, videoIds) {
  const body = { filters: { video_ids: videoIds } };
  const res = await fetch(`${BASE}/video/query/?fields=id,title,view_count,like_count,comment_count,share_count`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TikTok video analytics failed: ${res.status}`);
  return res.json();
}

module.exports = { getProfile, initVideoUpload, uploadVideoChunk, getPublishStatus, listVideos, getVideoAnalytics, providerId: 'tiktok' };
