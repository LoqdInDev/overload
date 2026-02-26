const express = require('express');
const { db } = require('../../../db/database');

function getRouter() {
  const router = express.Router();

  // Helper: safely query tables that may not exist
  function safeGet(sql, params = []) {
    try {
      return db.prepare(sql).get(...(Array.isArray(params) ? params : [params]));
    } catch {
      return null;
    }
  }

  // GET /api/onboarding/state
  // Auto-detects completion from other tables
  router.get('/state', (req, res) => {
    const userId = req.user?.id || 'default';

    let state = db.prepare(
      'SELECT * FROM onboarding_state WHERE user_id = ? ORDER BY id DESC LIMIT 1'
    ).get(userId);

    if (!state) {
      // Create initial state
      db.prepare(
        'INSERT INTO onboarding_state (user_id) VALUES (?)'
      ).run(userId);
      state = db.prepare(
        'SELECT * FROM onboarding_state WHERE user_id = ? ORDER BY id DESC LIMIT 1'
      ).get(userId);
    }

    // Auto-detect completion from other modules
    const brandProfile = safeGet('SELECT brand_name FROM bp_profiles ORDER BY id DESC LIMIT 1');
    const brandDone = !!(brandProfile?.brand_name);

    const integrations = safeGet(
      "SELECT COUNT(*) as count FROM int_connections WHERE status = 'connected'"
    );
    const integrationDone = (integrations?.count || 0) > 0;

    const content = safeGet('SELECT COUNT(*) as count FROM cc_projects');
    const firstContentDone = (content?.count || 0) > 0;

    // Update auto-detected fields
    if (brandDone !== !!state.brand_done || integrationDone !== !!state.integration_done || firstContentDone !== !!state.first_content_done) {
      db.prepare(
        `UPDATE onboarding_state SET brand_done = ?, integration_done = ?, first_content_done = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(brandDone ? 1 : 0, integrationDone ? 1 : 0, firstContentDone ? 1 : 0, state.id);
    }

    // Auto-complete if all steps done
    const allDone = brandDone && integrationDone && firstContentDone;
    if (allDone && !state.completed) {
      db.prepare(
        "UPDATE onboarding_state SET completed = 1, updated_at = datetime('now') WHERE id = ?"
      ).run(state.id);
    }

    res.json({
      completed: allDone || !!state.completed,
      dismissed: !!state.dismissed,
      currentStep: state.current_step,
      steps: {
        brand: brandDone,
        integration: integrationDone,
        firstContent: firstContentDone,
      },
    });
  });

  // PUT /api/onboarding/step
  router.put('/step', (req, res) => {
    const userId = req.user?.id || 'default';
    const { step } = req.body;

    if (typeof step !== 'number' || step < 0) {
      return res.status(400).json({ error: 'Invalid step number' });
    }

    db.prepare(
      "UPDATE onboarding_state SET current_step = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(step, userId);

    res.json({ ok: true, currentStep: step });
  });

  // PUT /api/onboarding/dismiss
  router.put('/dismiss', (req, res) => {
    const userId = req.user?.id || 'default';

    db.prepare(
      "UPDATE onboarding_state SET dismissed = 1, updated_at = datetime('now') WHERE user_id = ?"
    ).run(userId);

    res.json({ ok: true });
  });

  // PUT /api/onboarding/complete
  router.put('/complete', (req, res) => {
    const userId = req.user?.id || 'default';

    db.prepare(
      "UPDATE onboarding_state SET completed = 1, updated_at = datetime('now') WHERE user_id = ?"
    ).run(userId);

    res.json({ ok: true });
  });

  return router;
}

module.exports = { getRouter };
