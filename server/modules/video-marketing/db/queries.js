const { db } = require('../../../db/database');

function getQueries(wsId) {
  return {
    createCampaign: async (id, productName, productData) =>
      db.prepare(
        'INSERT INTO vm_campaigns (id, product_name, product_data, workspace_id) VALUES (?, ?, ?, ?)'
      ).run(id, productName, productData, wsId),
    getCampaign: async (id) =>
      db.prepare('SELECT * FROM vm_campaigns WHERE id = ? AND workspace_id = ?').get(id, wsId),
    getAllCampaigns: async () =>
      db.prepare('SELECT id, product_name, created_at, updated_at FROM vm_campaigns WHERE workspace_id = ? ORDER BY updated_at DESC').all(wsId),
    updateCampaign: async (productName, productData, id) =>
      db.prepare(
        "UPDATE vm_campaigns SET product_name = ?, product_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?"
      ).run(productName, productData, id, wsId),
    deleteCampaign: async (id) =>
      db.prepare('DELETE FROM vm_campaigns WHERE id = ? AND workspace_id = ?').run(id, wsId),

    createGeneration: async (id, campaignId, stage, output, rawResponse) =>
      db.prepare(
        'INSERT INTO vm_generations (id, campaign_id, stage, output, raw_response, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, campaignId, stage, output, rawResponse, wsId),
    getGenerations: async (campaignId, stage) =>
      db.prepare(
        'SELECT * FROM vm_generations WHERE campaign_id = ? AND stage = ? AND workspace_id = ? ORDER BY created_at DESC'
      ).all(campaignId, stage, wsId),
    getLatestGeneration: async (campaignId, stage) =>
      db.prepare(
        'SELECT * FROM vm_generations WHERE campaign_id = ? AND stage = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(campaignId, stage, wsId),
    getAllGenerationsForCampaign: async (campaignId) =>
      db.prepare(
        'SELECT * FROM vm_generations WHERE campaign_id = ? AND workspace_id = ? ORDER BY created_at DESC'
      ).all(campaignId, wsId),

    addFavorite: async (id, campaignId, generationId, itemIndex) =>
      db.prepare(
        'INSERT INTO vm_favorites (id, campaign_id, generation_id, item_index, workspace_id) VALUES (?, ?, ?, ?, ?)'
      ).run(id, campaignId, generationId, itemIndex, wsId),
    removeFavorite: async (id) =>
      db.prepare('DELETE FROM vm_favorites WHERE id = ? AND workspace_id = ?').run(id, wsId),
    getFavorites: async (campaignId) =>
      db.prepare(
        'SELECT * FROM vm_favorites WHERE campaign_id = ? AND workspace_id = ?'
      ).all(campaignId, wsId),
    getFavoritesByGeneration: async (generationId) =>
      db.prepare(
        'SELECT * FROM vm_favorites WHERE generation_id = ? AND workspace_id = ?'
      ).all(generationId, wsId),
  };
}

function getVideoQueries(wsId) {
  return {
    async createVideoJob(campaignId, sceneNumber, status, prompt, provider) {
      const result = await db.prepare(
        'INSERT INTO vm_video_jobs (campaign_id, scene_number, status, prompt, provider, workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(campaignId, sceneNumber, status, prompt, provider, wsId);
      return result.lastInsertRowid;
    },

    async updateVideoJob(jobId, status, result) {
      await db.prepare(
        "UPDATE vm_video_jobs SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?"
      ).run(status, JSON.stringify(result), jobId, wsId);
    },

    async getVideoJobs(campaignId) {
      return db.prepare('SELECT * FROM vm_video_jobs WHERE campaign_id = ? AND workspace_id = ? ORDER BY scene_number').all(campaignId, wsId);
    },

    async getVideoJob(jobId) {
      return db.prepare('SELECT * FROM vm_video_jobs WHERE id = ? AND workspace_id = ?').get(jobId, wsId);
    },

    async deleteVideoJob(jobId) {
      return db.prepare('DELETE FROM vm_video_jobs WHERE id = ? AND workspace_id = ?').run(jobId, wsId);
    },

    async deleteAllVideoJobs() {
      return db.prepare('DELETE FROM vm_video_jobs WHERE workspace_id = ?').run(wsId);
    },

    async getAllVideoJobs() {
      return db.prepare(`
        SELECT j.*, c.product_name
        FROM vm_video_jobs j
        LEFT JOIN vm_campaigns c ON c.id = j.campaign_id
        WHERE j.workspace_id = ?
        ORDER BY j.created_at DESC
        LIMIT 200
      `).all(wsId);
    },
  };
}

module.exports = { getQueries, getVideoQueries };
