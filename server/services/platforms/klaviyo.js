const BASE = 'https://a.klaviyo.com/api';
const REV = '2024-02-15';

function headers(apiKey) {
  return { Authorization: `Klaviyo-API-Key ${apiKey}`, revision: REV, 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function getAccount(apiKey) {
  const res = await fetch(`${BASE}/accounts/`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`Klaviyo account failed: ${res.status}`);
  const { data } = await res.json();
  return data[0] ? { id: data[0].id, name: data[0].attributes?.contact_information?.organization_name } : null;
}

async function getLists(apiKey) {
  const res = await fetch(`${BASE}/lists/`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`Klaviyo lists failed: ${res.status}`);
  const { data } = await res.json();
  return data.map(l => ({ id: l.id, name: l.attributes.name, created: l.attributes.created, updated: l.attributes.updated }));
}

async function getCampaigns(apiKey, { filter } = {}) {
  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);
  const res = await fetch(`${BASE}/campaigns/?${params}`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`Klaviyo campaigns failed: ${res.status}`);
  const { data } = await res.json();
  return data.map(c => ({
    id: c.id, name: c.attributes.name, status: c.attributes.status,
    sendTime: c.attributes.send_time, channel: c.attributes.message_type,
  }));
}

async function createCampaign(apiKey, { name, listId, subject, fromEmail, fromName, htmlContent, channel = 'email' }) {
  // Create campaign
  const campaignBody = {
    data: {
      type: 'campaign', attributes: {
        name, audiences: { included: [listId] },
        send_strategy: { method: 'immediate' },
        message_type: channel,
      },
    },
  };
  const campaignRes = await fetch(`${BASE}/campaigns/`, {
    method: 'POST', headers: headers(apiKey), body: JSON.stringify(campaignBody),
  });
  if (!campaignRes.ok) throw new Error(`Klaviyo create campaign failed: ${campaignRes.status} ${await campaignRes.text()}`);
  const { data: campaign } = await campaignRes.json();

  // Set message content
  const messageId = campaign.relationships?.campaign_messages?.data?.[0]?.id;
  if (messageId && htmlContent) {
    const msgBody = {
      data: {
        type: 'campaign-message', id: messageId,
        attributes: {
          label: name, content: { subject, from_email: fromEmail, from_label: fromName },
          body: htmlContent,
        },
      },
    };
    await fetch(`${BASE}/campaign-messages/${messageId}/`, {
      method: 'PATCH', headers: headers(apiKey), body: JSON.stringify(msgBody),
    });
  }

  return campaign;
}

async function sendCampaign(apiKey, campaignId) {
  const res = await fetch(`${BASE}/campaign-send-jobs/`, {
    method: 'POST', headers: headers(apiKey),
    body: JSON.stringify({ data: { type: 'campaign-send-job', attributes: { campaign_id: campaignId } } }),
  });
  if (!res.ok) throw new Error(`Klaviyo send failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getFlows(apiKey) {
  const res = await fetch(`${BASE}/flows/`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`Klaviyo flows failed: ${res.status}`);
  const { data } = await res.json();
  return data.map(f => ({ id: f.id, name: f.attributes.name, status: f.attributes.status, trigger: f.attributes.trigger_type }));
}

async function getMetrics(apiKey, { filter } = {}) {
  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);
  const res = await fetch(`${BASE}/metrics/?${params}`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`Klaviyo metrics failed: ${res.status}`);
  return res.json();
}

module.exports = { getAccount, getLists, getCampaigns, createCampaign, sendCampaign, getFlows, getMetrics, providerId: 'klaviyo' };
