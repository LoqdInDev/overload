const BASE = 'https://api.pinterest.com/v5';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getProfile(token) {
  const res = await fetch(`${BASE}/user_account`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Pinterest profile failed: ${res.status}`);
  const data = await res.json();
  return { id: data.username, name: `${data.first_name || ''} ${data.last_name || ''}`.trim(), avatar: data.profile_image, followers: data.follower_count };
}

async function getBoards(token, { pageSize = 25 } = {}) {
  const res = await fetch(`${BASE}/boards?page_size=${pageSize}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Pinterest boards failed: ${res.status}`);
  const { items } = await res.json();
  return items.map(b => ({ id: b.id, name: b.name, description: b.description, pinCount: b.pin_count }));
}

async function createPin(token, { boardId, title, description, link, imageUrl, altText }) {
  const body = {
    board_id: boardId, title, description, link,
    media_source: { source_type: 'image_url', url: imageUrl },
  };
  if (altText) body.alt_text = altText;
  const res = await fetch(`${BASE}/pins`, { method: 'POST', headers: headers(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Pinterest create pin failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deletePin(token, pinId) {
  const res = await fetch(`${BASE}/pins/${pinId}`, { method: 'DELETE', headers: headers(token) });
  if (!res.ok) throw new Error(`Pinterest delete pin failed: ${res.status}`);
  return { deleted: true };
}

async function getPinAnalytics(token, pinId, { startDate, endDate, metricTypes = 'IMPRESSION,PIN_CLICK,SAVE' }) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate, metric_types: metricTypes });
  const res = await fetch(`${BASE}/pins/${pinId}/analytics?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Pinterest pin analytics failed: ${res.status}`);
  return res.json();
}

async function getAccountAnalytics(token, { startDate, endDate, metricTypes = 'IMPRESSION,PIN_CLICK,SAVE,OUTBOUND_CLICK' }) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate, metric_types: metricTypes });
  const res = await fetch(`${BASE}/user_account/analytics?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Pinterest account analytics failed: ${res.status}`);
  return res.json();
}

module.exports = { getProfile, getBoards, createPin, deletePin, getPinAnalytics, getAccountAnalytics, providerId: 'pinterest' };
