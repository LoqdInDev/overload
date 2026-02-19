const BASE = 'https://api.linkedin.com/v2';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' };
}

async function getProfile(token) {
  const res = await fetch(`${BASE}/userinfo`, { headers: headers(token) });
  if (!res.ok) throw new Error(`LinkedIn profile failed: ${res.status}`);
  const data = await res.json();
  return { id: data.sub, name: data.name, email: data.email, avatar: data.picture };
}

async function postContent(token, { authorUrn, text, mediaUrn, title }) {
  const body = {
    author: authorUrn, // format: "urn:li:person:{id}"
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: mediaUrn ? 'IMAGE' : 'NONE',
        ...(mediaUrn ? {
          media: [{ status: 'READY', media: mediaUrn, title: { text: title || '' } }],
        } : {}),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  const res = await fetch(`${BASE}/ugcPosts`, { method: 'POST', headers: headers(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`LinkedIn post failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getAnalytics(token, { authorUrn, startDate, endDate }) {
  const params = new URLSearchParams({
    q: 'author', author: authorUrn,
    'sortBy.field': 'LAST_MODIFIED',
    'sortBy.order': 'DESCENDING',
    count: '50',
  });
  const res = await fetch(`${BASE}/ugcPosts?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`LinkedIn analytics failed: ${res.status}`);
  return res.json();
}

async function registerImageUpload(token, authorUrn) {
  const body = {
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
      owner: authorUrn,
    },
  };
  const res = await fetch(`${BASE}/assets?action=registerUpload`, { method: 'POST', headers: headers(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`LinkedIn image register failed: ${res.status}`);
  const data = await res.json();
  return {
    uploadUrl: data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
    asset: data.value.asset,
  };
}

module.exports = { getProfile, postContent, getAnalytics, registerImageUpload, providerId: 'linkedin' };
