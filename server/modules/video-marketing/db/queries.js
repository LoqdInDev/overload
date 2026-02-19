const { db } = require('../../../db/database');

const queries = {
  createCampaign: db.prepare(
    'INSERT INTO vm_campaigns (id, product_name, product_data) VALUES (?, ?, ?)'
  ),
  getCampaign: db.prepare('SELECT * FROM vm_campaigns WHERE id = ?'),
  getAllCampaigns: db.prepare('SELECT id, product_name, created_at, updated_at FROM vm_campaigns ORDER BY updated_at DESC'),
  updateCampaign: db.prepare(
    "UPDATE vm_campaigns SET product_name = ?, product_data = ?, updated_at = datetime('now') WHERE id = ?"
  ),
  deleteCampaign: db.prepare('DELETE FROM vm_campaigns WHERE id = ?'),

  createGeneration: db.prepare(
    'INSERT INTO vm_generations (id, campaign_id, stage, output, raw_response) VALUES (?, ?, ?, ?, ?)'
  ),
  getGenerations: db.prepare(
    'SELECT * FROM vm_generations WHERE campaign_id = ? AND stage = ? ORDER BY created_at DESC'
  ),
  getLatestGeneration: db.prepare(
    'SELECT * FROM vm_generations WHERE campaign_id = ? AND stage = ? ORDER BY created_at DESC LIMIT 1'
  ),
  getAllGenerationsForCampaign: db.prepare(
    'SELECT * FROM vm_generations WHERE campaign_id = ? ORDER BY created_at DESC'
  ),

  addFavorite: db.prepare(
    'INSERT INTO vm_favorites (id, campaign_id, generation_id, item_index) VALUES (?, ?, ?, ?)'
  ),
  removeFavorite: db.prepare('DELETE FROM vm_favorites WHERE id = ?'),
  getFavorites: db.prepare(
    'SELECT * FROM vm_favorites WHERE campaign_id = ?'
  ),
  getFavoritesByGeneration: db.prepare(
    'SELECT * FROM vm_favorites WHERE generation_id = ?'
  ),
};

const videoQueries = {
  createVideoJob(campaignId, sceneNumber, status, prompt, provider) {
    const stmt = db.prepare(
      'INSERT INTO vm_video_jobs (campaign_id, scene_number, status, prompt, provider) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(campaignId, sceneNumber, status, prompt, provider);
    return result.lastInsertRowid;
  },

  updateVideoJob(jobId, status, result) {
    const stmt = db.prepare(
      "UPDATE vm_video_jobs SET status = ?, result = ?, completed_at = datetime('now') WHERE id = ?"
    );
    stmt.run(status, JSON.stringify(result), jobId);
  },

  getVideoJobs(campaignId) {
    return db
      .prepare('SELECT * FROM vm_video_jobs WHERE campaign_id = ? ORDER BY scene_number')
      .all(campaignId);
  },

  getVideoJob(jobId) {
    return db.prepare('SELECT * FROM vm_video_jobs WHERE id = ?').get(jobId);
  },

  deleteVideoJob(jobId) {
    return db.prepare('DELETE FROM vm_video_jobs WHERE id = ?').run(jobId);
  },
};

module.exports = { queries, videoQueries };
