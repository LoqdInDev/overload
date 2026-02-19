const BASE = 'https://graph.facebook.com/v19.0';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getAdAccounts(token) {
  const res = await fetch(`${BASE}/me/adaccounts?fields=id,name,account_status,currency,balance,amount_spent`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Meta Ads accounts failed: ${res.status}`);
  const { data } = await res.json();
  return data.map(a => ({
    id: a.id, name: a.name, status: a.account_status,
    currency: a.currency, balance: a.balance, spent: a.amount_spent,
  }));
}

async function getCampaigns(token, adAccountId, { limit = 100 } = {}) {
  const fields = 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time';
  const res = await fetch(`${BASE}/${adAccountId}/campaigns?fields=${fields}&limit=${limit}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Meta campaigns failed: ${res.status}`);
  const { data } = await res.json();
  return data;
}

async function getCampaignInsights(token, campaignId, { datePreset = 'last_30d', fields = 'impressions,clicks,spend,ctr,cpc,reach,actions' } = {}) {
  const res = await fetch(`${BASE}/${campaignId}/insights?fields=${fields}&date_preset=${datePreset}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Meta insights failed: ${res.status}`);
  const { data } = await res.json();
  return data[0] || {};
}

async function getCampaignInsightsByDate(token, campaignId, { startDate, endDate, fields = 'impressions,clicks,spend,ctr,cpc,reach' } = {}) {
  const params = new URLSearchParams({
    fields, time_range: JSON.stringify({ since: startDate, until: endDate }),
    time_increment: 1,
  });
  const res = await fetch(`${BASE}/${campaignId}/insights?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Meta insights by date failed: ${res.status}`);
  return res.json();
}

async function pauseCampaign(token, campaignId) {
  const res = await fetch(`${BASE}/${campaignId}`, {
    method: 'POST', headers: headers(token),
    body: new URLSearchParams({ status: 'PAUSED' }),
  });
  if (!res.ok) throw new Error(`Meta pause campaign failed: ${res.status}`);
  return res.json();
}

async function enableCampaign(token, campaignId) {
  const res = await fetch(`${BASE}/${campaignId}`, {
    method: 'POST', headers: headers(token),
    body: new URLSearchParams({ status: 'ACTIVE' }),
  });
  if (!res.ok) throw new Error(`Meta enable campaign failed: ${res.status}`);
  return res.json();
}

async function getAdSets(token, campaignId, { limit = 100 } = {}) {
  const fields = 'id,name,status,daily_budget,targeting,optimization_goal';
  const res = await fetch(`${BASE}/${campaignId}/adsets?fields=${fields}&limit=${limit}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Meta ad sets failed: ${res.status}`);
  return res.json();
}

module.exports = { getAdAccounts, getCampaigns, getCampaignInsights, getCampaignInsightsByDate, pauseCampaign, enableCampaign, getAdSets, providerId: 'meta' };
