// Mailchimp requires discovering the data center from the token metadata
async function getServerPrefix(token) {
  const res = await fetch('https://login.mailchimp.com/oauth2/metadata', {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!res.ok) throw new Error(`Mailchimp metadata failed: ${res.status}`);
  const { dc } = await res.json();
  return dc; // e.g. "us21"
}

function baseUrl(dc) {
  return `https://${dc}.api.mailchimp.com/3.0`;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getProfile(token) {
  const dc = await getServerPrefix(token);
  const res = await fetch(`${baseUrl(dc)}/`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Mailchimp profile failed: ${res.status}`);
  const data = await res.json();
  return { id: data.account_id, name: data.account_name, email: data.email, dc };
}

async function getLists(token, dc) {
  if (!dc) dc = await getServerPrefix(token);
  const res = await fetch(`${baseUrl(dc)}/lists?count=100`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Mailchimp lists failed: ${res.status}`);
  const { lists } = await res.json();
  return lists.map(l => ({
    id: l.id, name: l.name, memberCount: l.stats.member_count,
    openRate: l.stats.open_rate, clickRate: l.stats.click_rate,
  }));
}

async function getCampaigns(token, dc, { count = 50, status } = {}) {
  if (!dc) dc = await getServerPrefix(token);
  const params = new URLSearchParams({ count: String(count) });
  if (status) params.set('status', status);
  const res = await fetch(`${baseUrl(dc)}/campaigns?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Mailchimp campaigns failed: ${res.status}`);
  const { campaigns } = await res.json();
  return campaigns.map(c => ({
    id: c.id, title: c.settings?.title, subject: c.settings?.subject_line,
    status: c.status, sendTime: c.send_time,
    opens: c.report_summary?.opens, clicks: c.report_summary?.subscriber_clicks,
    listId: c.recipients?.list_id,
  }));
}

async function createCampaign(token, dc, { listId, subject, fromName, replyTo, title }) {
  if (!dc) dc = await getServerPrefix(token);
  const body = {
    type: 'regular',
    recipients: { list_id: listId },
    settings: { subject_line: subject, from_name: fromName, reply_to: replyTo, title: title || subject },
  };
  const res = await fetch(`${baseUrl(dc)}/campaigns`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Mailchimp create campaign failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function setCampaignContent(token, dc, campaignId, { html }) {
  if (!dc) dc = await getServerPrefix(token);
  const res = await fetch(`${baseUrl(dc)}/campaigns/${campaignId}/content`, {
    method: 'PUT', headers: headers(token),
    body: JSON.stringify({ html }),
  });
  if (!res.ok) throw new Error(`Mailchimp set content failed: ${res.status}`);
  return res.json();
}

async function sendCampaign(token, dc, campaignId) {
  if (!dc) dc = await getServerPrefix(token);
  const res = await fetch(`${baseUrl(dc)}/campaigns/${campaignId}/actions/send`, {
    method: 'POST', headers: headers(token),
  });
  if (!res.ok) throw new Error(`Mailchimp send failed: ${res.status} ${await res.text()}`);
  return { sent: true };
}

async function getCampaignReport(token, dc, campaignId) {
  if (!dc) dc = await getServerPrefix(token);
  const res = await fetch(`${baseUrl(dc)}/reports/${campaignId}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Mailchimp report failed: ${res.status}`);
  return res.json();
}

module.exports = { getProfile, getServerPrefix, getLists, getCampaigns, createCampaign, setCampaignContent, sendCampaign, getCampaignReport, providerId: 'mailchimp' };
