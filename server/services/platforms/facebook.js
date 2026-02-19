const BASE = 'https://graph.facebook.com/v19.0';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getProfile(token) {
  const res = await fetch(`${BASE}/me?fields=id,name,email,picture.type(large)`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Facebook profile failed: ${res.status}`);
  const data = await res.json();
  return { id: data.id, name: data.name, email: data.email, avatar: data.picture?.data?.url };
}

async function getPages(token) {
  const res = await fetch(`${BASE}/me/accounts?fields=id,name,access_token,picture,fan_count,category`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Facebook pages failed: ${res.status}`);
  const { data } = await res.json();
  return data.map(p => ({ id: p.id, name: p.name, token: p.access_token, picture: p.picture?.data?.url, fans: p.fan_count, category: p.category }));
}

async function postToPage(pageToken, pageId, { message, link, mediaUrl }) {
  const params = new URLSearchParams();
  if (message) params.set('message', message);
  if (link) params.set('link', link);

  let endpoint = `${BASE}/${pageId}/feed`;
  if (mediaUrl) {
    endpoint = `${BASE}/${pageId}/photos`;
    params.set('url', mediaUrl);
  }

  const res = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${pageToken}` }, body: params });
  if (!res.ok) throw new Error(`Facebook post failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getPageInsights(pageToken, pageId, { metrics = 'page_impressions,page_engaged_users,page_fans', period = 'day', since, until }) {
  const params = new URLSearchParams({ metric: metrics, period });
  if (since) params.set('since', since);
  if (until) params.set('until', until);
  const res = await fetch(`${BASE}/${pageId}/insights?${params}`, { headers: { Authorization: `Bearer ${pageToken}` } });
  if (!res.ok) throw new Error(`Facebook insights failed: ${res.status}`);
  return res.json();
}

async function getPostInsights(pageToken, postId) {
  const res = await fetch(`${BASE}/${postId}/insights?metric=post_impressions,post_engaged_users,post_reactions_by_type_total`, {
    headers: { Authorization: `Bearer ${pageToken}` },
  });
  if (!res.ok) throw new Error(`Facebook post insights failed: ${res.status}`);
  return res.json();
}

async function deletePost(pageToken, postId) {
  const res = await fetch(`${BASE}/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${pageToken}` } });
  if (!res.ok) throw new Error(`Facebook delete failed: ${res.status}`);
  return res.json();
}

module.exports = { getProfile, getPages, postToPage, getPageInsights, getPostInsights, deletePost, providerId: 'facebook' };
