const { db } = require('../../../db/database');

function getQueries(wsId) {
  return {
    createCampaign: (id, productName, productData) =>
      db.prepare(
        'INSERT INTO vm_campaigns (id, product_name, product_data, workspace_id) VALUES (?, ?, ?, ?)'
      ).run(id, productName, productData, wsId),
    getCampaign: (id) =>
      db.prepare('SELECT * FROM vm_campaigns WHERE id = ? AND workspace_id = ?').get(id, wsId),
    getAllCampaigns: () =>
      db.prepare('SELECT id, product_name, created_at, updated_at FROM vm_campaigns WHERE workspace_id = ? ORDER BY updated_at DESC').all(wsId),
    updateCampaign: (productName, productData, id) =>
      db.prepare(
        "UPDATE vm_campaigns SET product_name = ?, product_data = ?, updated_at = datetime('now') WHERE id = ? AND workspace_id = ?"
      ).run(productName, productData, id, wsId),
    deleteCampaign: (id) =>
      db.prepare('DELETE FROM vm_campaigns WHERE id = ? AND workspace_id = ?').run(id, wsId),

    createGeneration: (id, campaignId, stage, output, rawResponse) =>
      db.prepare(
        'INSERT INTO vm_generations (id, campaign_id, stage, output, raw_response, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, campaignId, stage, output, rawResponse, wsId),
    getGenerations: (campaignId, stage) =>
      db.prepare(
        'SELECT * FROM vm_generations WHERE campaign_id = ? AND stage = ? AND workspace_id = ? ORDER BY created_at DESC'
      ).all(campaignId, stage, wsId),
    getLatestGeneration: (campaignId, stage) =>
      db.prepare(
        'SELECT * FROM vm_generations WHERE campaign_id = ? AND stage = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(campaignId, stage, wsId),
    getAllGenerationsForCampaign: (campaignId) =>
      db.prepare(
        'SELECT * FROM vm_generations WHERE campaign_id = ? AND workspace_id = ? ORDER BY created_at DESC'
      ).all(campaignId, wsId),

    addFavorite: (id, campaignId, generationId, itemIndex) =>
      db.prepare(
        'INSERT INTO vm_favorites (id, campaign_id, generation_id, item_index, workspace_id) VALUES (?, ?, ?, ?, ?)'
      ).run(id, campaignId, generationId, itemIndex, wsId),
    removeFavorite: (id) =>
      db.prepare('DELETE FROM vm_favorites WHERE id = ? AND workspace_id = ?').run(id, wsId),
    getFavorites: (campaignId) =>
      db.prepare(
        'SELECT * FROM vm_favorites WHERE campaign_id = ? AND workspace_id = ?'
      ).all(campaignId, wsId),
    getFavoritesByGeneration: (generationId) =>
      db.prepare(
        'SELECT * FROM vm_favorites WHERE generation_id = ? AND workspace_id = ?'
      ).all(generationId, wsId),
  };
}

function getVideoQueries(wsId) {
  return {
    createVideoJob(campaignId, sceneNumber, status, prompt, provider) {
      const stmt = db.prepare(
        'INSERT INTO vm_video_jobs (campaign_id, scene_number, status, prompt, provider, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run(campaignId, sceneNumber, status, prompt, provider, wsId);
      return result.lastInsertRowid;
    },

    updateVideoJob(jobId, status, result) {
      const stmt = db.prepare(
        "UPDATE vm_video_jobs SET status = ?, result = ?, completed_at = datetime('now') WHERE id = ? AND workspace_id = ?"
      );
      stmt.run(status, JSON.stringify(result), jobId, wsId);
    },

    getVideoJobs(campaignId) {
      return db
        .prepare('SELECT * FROM vm_video_jobs WHERE campaign_id = ? AND workspace_id = ? ORDER BY scene_number')
        .all(campaignId, wsId);
    },

    getVideoJob(jobId) {
      return db.prepare('SELECT * FROM vm_video_jobs WHERE id = ? AND workspace_id = ?').get(jobId, wsId);
    },

    deleteVideoJob(jobId) {
      return db.prepare('DELETE FROM vm_video_jobs WHERE id = ? AND workspace_id = ?').run(jobId, wsId);
    },
  };
}

module.exports = { getQueries, getVideoQueries };
