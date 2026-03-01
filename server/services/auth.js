const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const SALT_ROUNDS = 12;

function initAuthTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'owner',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Add email_verified column to users if it doesn't exist
  try {
    db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0');
  } catch (_) {
    // Column already exists — ignore
  }
}

async function createUser(email, password, displayName) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
  ).run(id, email.toLowerCase().trim(), passwordHash, displayName || null);

  return { id, email: email.toLowerCase().trim(), displayName, role: 'owner' };
}

async function authenticateUser(email, password) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url,
  };
}

function generateTokenPair(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

  const refreshTokenId = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(refreshTokenId, userId, refreshTokenHash, expiresAt);

  return { accessToken, refreshToken: `${refreshTokenId}:${refreshToken}` };
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function verifyRefreshToken(compositeToken) {
  const [tokenId, rawToken] = compositeToken.split(':');
  if (!tokenId || !rawToken) return null;

  const record = db.prepare(
    'SELECT * FROM refresh_tokens WHERE id = ?'
  ).get(tokenId);

  if (!record) return null;

  if (new Date(record.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(tokenId);
    return null;
  }

  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  if (hash !== record.token_hash) return null;

  return record.user_id;
}

function revokeRefreshToken(compositeToken) {
  const [tokenId] = (compositeToken || '').split(':');
  if (tokenId) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(tokenId);
  }
}

function getUser(userId) {
  const user = db.prepare('SELECT id, email, display_name, role, avatar_url, created_at FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  };
}

// ── Password reset ──────────────────────────────────────────────────

function createPasswordResetToken(email) {
  const user = db.prepare('SELECT id, display_name FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return null; // Don't reveal whether email exists

  // Invalidate any existing unused tokens for this user
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

  const id = crypto.randomUUID();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(id, user.id, tokenHash, expiresAt);

  return {
    token: `${id}:${rawToken}`,
    user: { id: user.id, email: email.toLowerCase().trim(), displayName: user.display_name },
  };
}

function verifyPasswordResetToken(compositeToken) {
  const [tokenId, rawToken] = (compositeToken || '').split(':');
  if (!tokenId || !rawToken) return null;

  const record = db.prepare(
    'SELECT * FROM password_reset_tokens WHERE id = ? AND used = 0'
  ).get(tokenId);

  if (!record) return null;
  if (new Date(record.expires_at) < new Date()) return null;

  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  if (hash !== record.token_hash) return null;

  return record.user_id;
}

async function resetPassword(compositeToken, newPassword) {
  const userId = verifyPasswordResetToken(compositeToken);
  if (!userId) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    err.code = 'TOKEN_INVALID';
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(passwordHash, userId);

  // Mark token as used
  const [tokenId] = compositeToken.split(':');
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(tokenId);

  // Revoke all refresh tokens for this user (force re-login)
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);

  return userId;
}

// ── Email verification ──────────────────────────────────────────────

function createEmailVerificationToken(userId) {
  const user = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  // Invalidate any existing unused tokens for this user
  db.prepare('UPDATE email_verification_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(userId);

  const id = crypto.randomUUID();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  db.prepare(
    'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(id, userId, tokenHash, expiresAt);

  return {
    token: `${id}:${rawToken}`,
    user: { id: user.id, email: user.email, displayName: user.display_name },
  };
}

function verifyEmailToken(compositeToken) {
  const [tokenId, rawToken] = (compositeToken || '').split(':');
  if (!tokenId || !rawToken) return null;

  const record = db.prepare(
    'SELECT * FROM email_verification_tokens WHERE id = ? AND used = 0'
  ).get(tokenId);

  if (!record) return null;
  if (new Date(record.expires_at) < new Date()) return null;

  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  if (hash !== record.token_hash) return null;

  // Mark token as used and verify the user's email
  db.prepare('UPDATE email_verification_tokens SET used = 1 WHERE id = ?').run(tokenId);
  db.prepare("UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?").run(record.user_id);

  return record.user_id;
}

// Clean up expired tokens periodically
function cleanExpiredTokens() {
  db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();
  db.prepare("DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')").run();
  db.prepare("DELETE FROM email_verification_tokens WHERE expires_at < datetime('now')").run();
}

module.exports = {
  initAuthTables,
  createUser,
  authenticateUser,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  getUser,
  cleanExpiredTokens,
  createPasswordResetToken,
  verifyPasswordResetToken,
  resetPassword,
  createEmailVerificationToken,
  verifyEmailToken,
};
