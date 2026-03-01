const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  createUser,
  authenticateUser,
  generateTokenPair,
  verifyRefreshToken,
  revokeRefreshToken,
  getUser,
  createPasswordResetToken,
  resetPassword,
  createEmailVerificationToken,
  verifyEmailToken,
} = require('../services/auth');
const { requireAuth } = require('../middleware/requireAuth');
const { validate, schemas } = require('../middleware/validate');
const { sendWelcome, sendVerification, sendPasswordReset } = require('../services/email');

const router = express.Router();

// Stricter rate limiter for login/signup: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later', code: 'RATE_LIMIT_EXCEEDED' },
});

// POST /api/auth/signup
router.post('/signup', authLimiter, validate(schemas.signup), async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    const user = await createUser(email, password, displayName);
    const tokens = generateTokenPair(user.id);

    // Send welcome and verification emails (fire-and-forget, don't block signup)
    const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    sendWelcome(user.email, user.displayName).catch(err => console.error('[EMAIL] Failed to send welcome email:', err.message));

    const verification = createEmailVerificationToken(user.id);
    if (verification) {
      const verifyLink = `${appUrl}/verify-email?token=${encodeURIComponent(verification.token)}`;
      sendVerification(user.email, user.displayName, verifyLink).catch(err => console.error('[EMAIL] Failed to send verification email:', err.message));
    }

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
router.post('/login', authLimiter, validate(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;

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

// POST /api/auth/auto-login
// Creates a default owner account if none exists and returns tokens
// Only available in development — disabled in production
router.post('/auto-login', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
  try {
    const { db } = require('../db/database');
    let user = db.prepare('SELECT * FROM users ORDER BY created_at ASC LIMIT 1').get();

    if (!user) {
      // Create default owner
      user = await createUser('owner@overload.local', 'overload-auto-2024', 'Owner');
    }

    const tokens = generateTokenPair(user.id);

    res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name || user.displayName, role: user.role },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── Password reset ──────────────────────────────────────────────────

// Rate limiter for password reset: 5 attempts per 15 minutes per IP
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later', code: 'RATE_LIMIT_EXCEEDED' },
});

// POST /api/auth/forgot-password
router.post('/forgot-password', resetLimiter, validate(schemas.forgotPassword), async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = createPasswordResetToken(email);

    // Always return success to avoid leaking whether email exists
    if (result) {
      const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
      const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(result.token)}`;
      sendPasswordReset(result.user.email, result.user.displayName, resetLink)
        .catch(err => console.error('[EMAIL] Failed to send password reset email:', err.message));
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', resetLimiter, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required', code: 'VALIDATION_ERROR' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' });
    }

    await resetPassword(token, newPassword);

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    next(err);
  }
});

// ── Email verification ──────────────────────────────────────────────

// POST /api/auth/send-verification
router.post('/send-verification', requireAuth, async (req, res, next) => {
  try {
    const result = createEmailVerificationToken(req.user.id);
    if (!result) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    const verifyLink = `${appUrl}/verify-email?token=${encodeURIComponent(result.token)}`;
    await sendVerification(result.user.email, result.user.displayName, verifyLink);

    res.json({ message: 'Verification email sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required', code: 'VALIDATION_ERROR' });
    }

    const userId = verifyEmailToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired verification token', code: 'TOKEN_INVALID' });
    }

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
