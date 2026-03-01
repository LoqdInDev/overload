const crypto = require('crypto');

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;

function formatEntry(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
}

const logger = {
  error(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.error) {
      console.error(formatEntry('error', message, meta));
    }
  },
  warn(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.warn) {
      console.warn(formatEntry('warn', message, meta));
    }
  },
  info(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.info) {
      console.log(formatEntry('info', message, meta));
    }
  },
  debug(message, meta) {
    if (CURRENT_LEVEL >= LOG_LEVELS.debug) {
      console.log(formatEntry('debug', message, meta));
    }
  },
};

/**
 * Express middleware that attaches a unique request ID to each request.
 * The ID is available as req.id and returned in the X-Request-Id header.
 */
function requestIdMiddleware(req, _res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  _res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = { logger, requestIdMiddleware };
