const { db } = require('../../../db/database');

function getQueries(wsId) {
  return {
    getAllProjects: async () => db.prepare('SELECT * FROM cd_projects WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId),
    getProjectById: async (id) => db.prepare('SELECT * FROM cd_projects WHERE id = ? AND workspace_id = ?').get(id, wsId),
    createProject: async (...args) => db.prepare('INSERT INTO cd_projects (id, type, title, prompt, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?)').run(...args, wsId),
    deleteProject: async (id) => db.prepare('DELETE FROM cd_projects WHERE id = ? AND workspace_id = ?').run(id, wsId),

    getImagesByProject: async (projectId) => db.prepare('SELECT * FROM cd_images WHERE project_id = ? AND workspace_id = ? ORDER BY created_at DESC').all(projectId, wsId),
    createImage: async (...args) => db.prepare('INSERT INTO cd_images (id, project_id, url, alt, provider, status, metadata, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(...args, wsId),
    updateImageStatus: async (status, url, id) => db.prepare('UPDATE cd_images SET status = ?, url = ? WHERE id = ? AND workspace_id = ?').run(status, url, id, wsId),
    deleteImage: async (id) => db.prepare('DELETE FROM cd_images WHERE id = ? AND workspace_id = ?').run(id, wsId),
  };
}

module.exports = { getQueries };
