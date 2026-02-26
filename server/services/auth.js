const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

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
  `);
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

// Clean up expired refresh tokens periodically
function cleanExpiredTokens() {
  db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();
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
};
