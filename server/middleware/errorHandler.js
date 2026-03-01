const { logger } = require('../services/logger');

class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'AppError';
  }
}

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  logger.error(`${req.method} ${req.path} ${status} ${code}`, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    status,
    code,
    stack: status === 500 ? err.stack : undefined,
  });

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'Resource already exists', code: 'DUPLICATE' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' });
  }

  // Sanitize: never leak raw error messages for 500s
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    code,
  });
}

module.exports = { errorHandler, AppError };
