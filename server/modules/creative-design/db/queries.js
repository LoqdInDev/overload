const { db } = require('../../../db/database');

const queries = {
  getAllProjects: db.prepare('SELECT * FROM cd_projects ORDER BY created_at DESC'),
  getProjectById: db.prepare('SELECT * FROM cd_projects WHERE id = ?'),
  createProject: db.prepare('INSERT INTO cd_projects (id, type, title, prompt, metadata) VALUES (?, ?, ?, ?, ?)'),
  deleteProject: db.prepare('DELETE FROM cd_projects WHERE id = ?'),

  getImagesByProject: db.prepare('SELECT * FROM cd_images WHERE project_id = ? ORDER BY created_at DESC'),
  createImage: db.prepare('INSERT INTO cd_images (id, project_id, url, alt, provider, status, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  updateImageStatus: db.prepare('UPDATE cd_images SET status = ?, url = ? WHERE id = ?'),
  deleteImage: db.prepare('DELETE FROM cd_images WHERE id = ?'),
};

module.exports = { queries };
