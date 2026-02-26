const express = require('express');
const {
  createUser,
  authenticateUser,
  generateTokenPair,
  verifyRefreshToken,
  revokeRefreshToken,
  getUser,
} = require('../services/auth');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address', code: 'VALIDATION_ERROR' });
    }

    const user = await createUser(email, password, displayName);
    const tokens = generateTokenPair(user.id);

    res.status(201).json({
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }

    const tokens = generateTokenPair(user.id);

    res.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, avatarUrl: user.avatarUrl },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required', code: 'VALIDATION_ERROR' });
  }

  const userId = verifyRefreshToken(refreshToken);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'TOKEN_INVALID' });
  }

  // Revoke old token and issue new pair
  revokeRefreshToken(refreshToken);
  const tokens = generateTokenPair(userId);
  const user = getUser(userId);

  res.json({
    user: user ? { id: user.id, email: user.email, displayName: user.displayName, role: user.role, avatarUrl: user.avatarUrl } : null,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
