const BASE = 'https://api.linkedin.com/rest';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'LinkedIn-Version': '202401',
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

async function getAdAccounts(token) {
  const res = await fetch(`${BASE}/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&count=50`, { headers: headers(token) });
  if (!res.ok) throw new Error(`LinkedIn Ad Accounts failed: ${res.status}`);
  const { elements } = await res.json();
  return (elements || []).map(a => ({
    id: a.id, name: a.name, status: a.status, currency: a.currency,
  }));
}

async function getCampaigns(token, accountId, { count = 100 } = {}) {
  const res = await fetch(`${BASE}/adCampaigns?q=search&search=(account:(values:List(urn:li:sponsoredAccount:${accountId})))&count=${count}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`LinkedIn campaigns failed: ${res.status}`);
  const { elements } = await res.json();
  return (elements || []).map(c => ({
    id: c.id, name: c.name, status: c.status,
    objective: c.objectiveType, dailyBudget: c.dailyBudget,
    type: c.type,
  }));
}

async function createCampaign(token, accountId, { name, objective, dailyBudget, adContent, targeting }) {
  const objMap = { conversions: 'WEBSITE_CONVERSIONS', traffic: 'WEBSITE_VISIT', awareness: 'BRAND_AWARENESS', leads: 'LEAD_GENERATION' };
  const accountUrn = `urn:li:sponsoredAccount:${accountId}`;

  // 1. Create campaign group
  const groupRes = await fetch(`${BASE}/adCampaignGroups`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      account: accountUrn,
      name: `${name} Group`,
      status: 'PAUSED',
      runSchedule: { start: Date.now() },
    }),
  });
  if (!groupRes.ok) throw new Error(`LinkedIn create campaign group failed: ${groupRes.status} ${await groupRes.text()}`);
  const groupId = groupRes.headers.get('x-restli-id') || (await groupRes.json()).id;

  // 2. Create campaign (PAUSED)
  const campaignRes = await fetch(`${BASE}/adCampaigns`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      account: accountUrn,
      campaignGroup: `urn:li:sponsoredCampaignGroup:${groupId}`,
      name,
      objectiveType: objMap[objective] || 'WEBSITE_CONVERSIONS',
      type: 'SPONSORED_UPDATES',
      costType: 'CPM',
      dailyBudget: { amount: String(Number(dailyBudget) || 50), currencyCode: 'USD' },
      status: 'PAUSED',
      runSchedule: { start: Date.now() },
    }),
  });
  if (!campaignRes.ok) throw new Error(`LinkedIn create campaign failed: ${campaignRes.status} ${await campaignRes.text()}`);
  const campaignId = campaignRes.headers.get('x-restli-id') || (await campaignRes.json()).id;

  return { campaignGroupId: groupId, campaignId, status: 'PAUSED' };
}

async function pauseCampaign(token, campaignId) {
  const res = await fetch(`${BASE}/adCampaigns/${campaignId}`, {
    method: 'POST', headers: { ...headers(token), 'X-Restli-Method': 'PARTIAL_UPDATE' },
    body: JSON.stringify({ patch: { $set: { status: 'PAUSED' } } }),
  });
  if (!res.ok) throw new Error(`LinkedIn pause campaign failed: ${res.status}`);
  return { success: true };
}

async function enableCampaign(token, campaignId) {
  const res = await fetch(`${BASE}/adCampaigns/${campaignId}`, {
    method: 'POST', headers: { ...headers(token), 'X-Restli-Method': 'PARTIAL_UPDATE' },
    body: JSON.stringify({ patch: { $set: { status: 'ACTIVE' } } }),
  });
  if (!res.ok) throw new Error(`LinkedIn enable campaign failed: ${res.status}`);
  return { success: true };
}

module.exports = { getAdAccounts, getCampaigns, createCampaign, pauseCampaign, enableCampaign, providerId: 'linkedin' };
