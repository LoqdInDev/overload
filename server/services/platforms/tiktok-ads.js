const BASE = 'https://business-api.tiktok.com/open_api/v1.3';

function headers(token) {
  return { 'Access-Token': token, 'Content-Type': 'application/json' };
}

async function getAdvertiserInfo(token, advertiserId) {
  const res = await fetch(`${BASE}/advertiser/info/?advertiser_ids=["${advertiserId}"]`, { headers: headers(token) });
  if (!res.ok) throw new Error(`TikTok Ads advertiser info failed: ${res.status}`);
  const { data } = await res.json();
  return data?.list?.[0] || {};
}

async function getCampaigns(token, advertiserId, { pageSize = 100 } = {}) {
  const res = await fetch(`${BASE}/campaign/get/`, {
    method: 'GET',
    headers: headers(token),
  });
  const body = JSON.stringify({ advertiser_id: advertiserId, page_size: pageSize });
  const res2 = await fetch(`${BASE}/campaign/get/`, {
    method: 'POST', headers: headers(token), body,
  });
  if (!res2.ok) throw new Error(`TikTok Ads campaigns failed: ${res2.status}`);
  const { data } = await res2.json();
  return (data?.list || []).map(c => ({
    id: c.campaign_id, name: c.campaign_name, status: c.operation_status,
    objective: c.objective_type, budget: c.budget, budgetMode: c.budget_mode,
  }));
}

async function createCampaign(token, advertiserId, { name, objective, dailyBudget, adContent, targeting }) {
  const objMap = { conversions: 'CONVERSIONS', traffic: 'TRAFFIC', awareness: 'REACH', leads: 'LEAD_GENERATION' };

  // 1. Create campaign (DISABLED = paused)
  const campRes = await fetch(`${BASE}/campaign/create/`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      advertiser_id: advertiserId,
      campaign_name: name,
      objective_type: objMap[objective] || 'CONVERSIONS',
      budget_mode: 'BUDGET_MODE_DAY',
      budget: Number(dailyBudget) || 50,
      operation_status: 'DISABLE',
    }),
  });
  if (!campRes.ok) throw new Error(`TikTok create campaign failed: ${campRes.status} ${await campRes.text()}`);
  const campData = await campRes.json();
  if (campData.code !== 0) throw new Error(`TikTok create campaign error: ${campData.message}`);
  const campaignId = campData.data.campaign_id;

  // 2. Create ad group
  const optMap = { traffic: 'CLICK', awareness: 'SHOW', conversions: 'CONVERT', leads: 'CONVERT' };
  const agRes = await fetch(`${BASE}/adgroup/create/`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      advertiser_id: advertiserId,
      campaign_id: campaignId,
      adgroup_name: `${name} - Ad Group`,
      placement_type: 'PLACEMENT_TYPE_AUTOMATIC',
      budget_mode: 'BUDGET_MODE_DAY',
      budget: Number(dailyBudget) || 50,
      optimization_goal: optMap[objective] || 'CONVERT',
      billing_event: 'CPC',
      bid_type: 'BID_TYPE_NO_BID',
      operation_status: 'DISABLE',
    }),
  });
  if (!agRes.ok) throw new Error(`TikTok create ad group failed: ${agRes.status} ${await agRes.text()}`);
  const agData = await agRes.json();
  if (agData.code !== 0) throw new Error(`TikTok create ad group error: ${agData.message}`);
  const adGroupId = agData.data.adgroup_id;

  // 3. Create ad (text-only — user adds video creative in TikTok Ads Manager)
  const texts = adContent?.primary_texts || adContent?.descriptions || [];
  const adRes = await fetch(`${BASE}/ad/create/`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      advertiser_id: advertiserId,
      adgroup_id: adGroupId,
      creatives: [{
        ad_name: `${name} - Ad 1`,
        ad_text: texts[0] || name,
        call_to_action: adContent?.cta?.toUpperCase().replace(/\s+/g, '_') || 'LEARN_MORE',
        landing_page_url: 'https://example.com',
      }],
    }),
  });
  if (!adRes.ok) throw new Error(`TikTok create ad failed: ${adRes.status} ${await adRes.text()}`);
  const adData = await adRes.json();
  if (adData.code !== 0) throw new Error(`TikTok create ad error: ${adData.message}`);

  return { campaignId, adGroupId, adIds: adData.data?.ad_ids || [], status: 'DISABLED' };
}

async function pauseCampaign(token, advertiserId, campaignId) {
  const res = await fetch(`${BASE}/campaign/status/update/`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ advertiser_id: advertiserId, campaign_ids: [campaignId], opt_status: 'DISABLE' }),
  });
  if (!res.ok) throw new Error(`TikTok pause campaign failed: ${res.status}`);
  return res.json();
}

async function enableCampaign(token, advertiserId, campaignId) {
  const res = await fetch(`${BASE}/campaign/status/update/`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ advertiser_id: advertiserId, campaign_ids: [campaignId], opt_status: 'ENABLE' }),
  });
  if (!res.ok) throw new Error(`TikTok enable campaign failed: ${res.status}`);
  return res.json();
}

module.exports = { getAdvertiserInfo, getCampaigns, createCampaign, pauseCampaign, enableCampaign, providerId: 'tiktok' };
