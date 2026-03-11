const BASE = 'https://googleads.googleapis.com/v16';

function headers(token, developerToken) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'developer-token': developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
  };
}

async function listAccessibleCustomers(token) {
  const res = await fetch(`${BASE}/customers:listAccessibleCustomers`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Google Ads customers failed: ${res.status}`);
  return res.json();
}

async function getCampaigns(token, customerId, { pageSize = 100 } = {}) {
  const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
    campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.cost_micros,
    metrics.conversions, metrics.ctr FROM campaign ORDER BY campaign.name LIMIT ${pageSize}`;

  const res = await fetch(`${BASE}/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Google Ads campaigns failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const results = data[0]?.results || [];
  return results.map(r => ({
    id: r.campaign.id, name: r.campaign.name, status: r.campaign.status,
    channelType: r.campaign.advertisingChannelType,
    budget: r.campaignBudget?.amountMicros ? Number(r.campaignBudget.amountMicros) / 1e6 : 0,
    impressions: Number(r.metrics?.impressions || 0),
    clicks: Number(r.metrics?.clicks || 0),
    cost: r.metrics?.costMicros ? Number(r.metrics.costMicros) / 1e6 : 0,
    conversions: Number(r.metrics?.conversions || 0),
    ctr: Number(r.metrics?.ctr || 0),
  }));
}

async function getCampaignMetrics(token, customerId, { campaignId, startDate, endDate }) {
  const query = `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros,
    metrics.conversions, metrics.ctr, metrics.average_cpc
    FROM campaign WHERE campaign.id = ${campaignId}
    AND segments.date BETWEEN '${startDate}' AND '${endDate}' ORDER BY segments.date`;

  const res = await fetch(`${BASE}/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Google Ads metrics failed: ${res.status}`);
  const data = await res.json();
  return (data[0]?.results || []).map(r => ({
    date: r.segments.date,
    impressions: Number(r.metrics.impressions),
    clicks: Number(r.metrics.clicks),
    cost: Number(r.metrics.costMicros) / 1e6,
    conversions: Number(r.metrics.conversions),
    ctr: Number(r.metrics.ctr),
    avgCpc: Number(r.metrics.averageCpc) / 1e6,
  }));
}

async function pauseCampaign(token, customerId, campaignId) {
  const res = await fetch(`${BASE}/customers/${customerId}/campaigns:mutate`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      operations: [{ update: { resourceName: `customers/${customerId}/campaigns/${campaignId}`, status: 'PAUSED' }, updateMask: 'status' }],
    }),
  });
  if (!res.ok) throw new Error(`Google Ads pause failed: ${res.status}`);
  return res.json();
}

async function enableCampaign(token, customerId, campaignId) {
  const res = await fetch(`${BASE}/customers/${customerId}/campaigns:mutate`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      operations: [{ update: { resourceName: `customers/${customerId}/campaigns/${campaignId}`, status: 'ENABLED' }, updateMask: 'status' }],
    }),
  });
  if (!res.ok) throw new Error(`Google Ads enable failed: ${res.status}`);
  return res.json();
}

// ── Campaign Creation (all resources created as PAUSED) ──────────

async function createCampaignBudget(token, customerId, { name, amountMicros }) {
  const res = await fetch(`${BASE}/customers/${customerId}/campaignBudgets:mutate`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      operations: [{ create: { name: `${name} Budget`, amountMicros: String(amountMicros), deliveryMethod: 'STANDARD', explicitlyShared: false } }],
    }),
  });
  if (!res.ok) throw new Error(`Google Ads create budget failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.results[0].resourceName; // customers/{id}/campaignBudgets/{budgetId}
}

async function createCampaign(token, customerId, { name, objective, budgetMicros, adContent, targeting, strategy }) {
  // 1. Create budget
  const budgetResource = await createCampaignBudget(token, customerId, { name, amountMicros: budgetMicros });

  // 2. Create campaign (PAUSED)
  const objMap = { conversions: 'SEARCH', traffic: 'SEARCH', awareness: 'DISPLAY', leads: 'SEARCH' };
  const biddingMap = { 'Maximize Conversions': 'MAXIMIZE_CONVERSIONS', 'Maximize Clicks': 'MAXIMIZE_CLICKS', 'Target CPA': 'TARGET_CPA', 'Target ROAS': 'TARGET_ROAS' };
  const biddingStrategy = biddingMap[strategy?.bidding] || 'MAXIMIZE_CONVERSIONS';

  const campaignRes = await fetch(`${BASE}/customers/${customerId}/campaigns:mutate`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      operations: [{
        create: {
          name, status: 'PAUSED',
          advertisingChannelType: objMap[objective] || 'SEARCH',
          campaignBudget: budgetResource,
          biddingStrategyType: biddingStrategy,
        },
      }],
    }),
  });
  if (!campaignRes.ok) throw new Error(`Google Ads create campaign failed: ${campaignRes.status} ${await campaignRes.text()}`);
  const campaignData = await campaignRes.json();
  const campaignResource = campaignData.results[0].resourceName;

  // 3. Create ad group
  const agRes = await fetch(`${BASE}/customers/${customerId}/adGroups:mutate`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      operations: [{
        create: {
          name: `${name} - Ad Group 1`, campaign: campaignResource,
          status: 'ENABLED', type: 'SEARCH_STANDARD',
        },
      }],
    }),
  });
  if (!agRes.ok) throw new Error(`Google Ads create ad group failed: ${agRes.status} ${await agRes.text()}`);
  const agData = await agRes.json();
  const adGroupResource = agData.results[0].resourceName;

  // 4. Create responsive search ad
  const headlines = (adContent?.headlines || []).slice(0, 15).map(text => ({ text }));
  const descriptions = (adContent?.descriptions || []).slice(0, 4).map(text => ({ text }));
  if (headlines.length < 3) while (headlines.length < 3) headlines.push({ text: name.substring(0, 30) });
  if (descriptions.length < 2) while (descriptions.length < 2) descriptions.push({ text: `Learn more about ${name}`.substring(0, 90) });

  const adRes = await fetch(`${BASE}/customers/${customerId}/adGroupAds:mutate`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      operations: [{
        create: {
          adGroup: adGroupResource, status: 'ENABLED',
          ad: {
            responsiveSearchAd: { headlines, descriptions },
            finalUrls: ['https://example.com'], // user must replace
          },
        },
      }],
    }),
  });
  if (!adRes.ok) throw new Error(`Google Ads create ad failed: ${adRes.status} ${await adRes.text()}`);

  // 5. Add keywords if available
  const keywords = adContent?.extras?.keywords || targeting?.interests || [];
  if (keywords.length > 0) {
    const kwOps = keywords.slice(0, 20).map(kw => {
      const keyword = typeof kw === 'string' ? kw : (kw.keyword || kw.text || '');
      const matchMap = { Exact: 'EXACT', Phrase: 'PHRASE', Broad: 'BROAD' };
      const matchType = typeof kw === 'string' ? 'BROAD' : (matchMap[kw.match_type] || 'BROAD');
      return { create: { adGroup: adGroupResource, keyword: { text: keyword, matchType } } };
    }).filter(op => op.create.keyword.text);

    if (kwOps.length > 0) {
      await fetch(`${BASE}/customers/${customerId}/adGroupCriteria:mutate`, {
        method: 'POST', headers: headers(token),
        body: JSON.stringify({ operations: kwOps }),
      });
    }
  }

  const campaignId = campaignResource.split('/').pop();
  return { campaignId, campaignResource, adGroupResource, budgetResource, status: 'PAUSED' };
}

module.exports = { listAccessibleCustomers, getCampaigns, getCampaignMetrics, pauseCampaign, enableCampaign, createCampaign, providerId: 'google' };
