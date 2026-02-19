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

module.exports = { listAccessibleCustomers, getCampaigns, getCampaignMetrics, pauseCampaign, enableCampaign, providerId: 'google' };
