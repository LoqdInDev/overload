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

// ── Campaign Creation (all resources created as PAUSED) ──────────

async function createCampaign(token, adAccountId, { name, objective, dailyBudget, adContent, targeting }) {
  const objMap = { conversions: 'OUTCOME_SALES', traffic: 'OUTCOME_TRAFFIC', awareness: 'OUTCOME_AWARENESS', leads: 'OUTCOME_LEADS' };

  // 1. Create campaign (PAUSED)
  const campParams = new URLSearchParams({
    name, objective: objMap[objective] || 'OUTCOME_SALES', status: 'PAUSED',
    special_ad_categories: '[]',
  });
  const campRes = await fetch(`${BASE}/${adAccountId}/campaigns`, {
    method: 'POST', headers: headers(token), body: campParams,
  });
  if (!campRes.ok) throw new Error(`Meta create campaign failed: ${campRes.status} ${await campRes.text()}`);
  const campaign = await campRes.json();

  // 2. Create ad set
  const optimizationMap = { traffic: 'LINK_CLICKS', awareness: 'REACH', leads: 'LEAD_GENERATION', conversions: 'OFFSITE_CONVERSIONS' };
  const targetingSpec = { age_min: 18, age_max: 65 };
  if (targeting?.interests?.length > 0) {
    targetingSpec.flexible_spec = [{ interests: targeting.interests.map(i => ({ name: i })) }];
  }
  if (targeting?.demographics) {
    const ageMatch = targeting.demographics.match(/(\d{2})\s*[-–]\s*(\d{2})/);
    if (ageMatch) { targetingSpec.age_min = Number(ageMatch[1]); targetingSpec.age_max = Number(ageMatch[2]); }
  }

  const setParams = new URLSearchParams({
    name: `${name} - Ad Set 1`,
    campaign_id: campaign.id,
    daily_budget: String((Number(dailyBudget) || 50) * 100), // cents
    optimization_goal: optimizationMap[objective] || 'OFFSITE_CONVERSIONS',
    billing_event: 'IMPRESSIONS',
    targeting: JSON.stringify(targetingSpec),
    status: 'PAUSED',
  });
  const setRes = await fetch(`${BASE}/${adAccountId}/adsets`, {
    method: 'POST', headers: headers(token), body: setParams,
  });
  if (!setRes.ok) throw new Error(`Meta create ad set failed: ${setRes.status} ${await setRes.text()}`);
  const adSet = await setRes.json();

  // 3. Create ad creative
  const primaryText = adContent?.primary_texts?.[0] || adContent?.descriptions?.[0] || '';
  const headline = adContent?.headlines?.[0] || name;
  const description = adContent?.descriptions?.[0] || '';
  const cta = adContent?.cta?.toUpperCase().replace(/\s+/g, '_') || 'LEARN_MORE';

  const creativeParams = new URLSearchParams({
    name: `${name} - Creative`,
    object_story_spec: JSON.stringify({
      link_data: {
        message: primaryText, name: headline, description,
        call_to_action: { type: cta },
        link: 'https://example.com', // user must replace
      },
    }),
  });
  const crRes = await fetch(`${BASE}/${adAccountId}/adcreatives`, {
    method: 'POST', headers: headers(token), body: creativeParams,
  });
  if (!crRes.ok) throw new Error(`Meta create creative failed: ${crRes.status} ${await crRes.text()}`);
  const creative = await crRes.json();

  // 4. Create ad (links creative to ad set)
  const adParams = new URLSearchParams({
    name: `${name} - Ad 1`,
    adset_id: adSet.id,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: 'PAUSED',
  });
  const adRes = await fetch(`${BASE}/${adAccountId}/ads`, {
    method: 'POST', headers: headers(token), body: adParams,
  });
  if (!adRes.ok) throw new Error(`Meta create ad failed: ${adRes.status} ${await adRes.text()}`);
  const ad = await adRes.json();

  return { campaignId: campaign.id, adSetId: adSet.id, creativeId: creative.id, adId: ad.id, status: 'PAUSED' };
}

module.exports = { getAdAccounts, getCampaigns, getCampaignInsights, getCampaignInsightsByDate, pauseCampaign, enableCampaign, getAdSets, createCampaign, providerId: 'meta' };
