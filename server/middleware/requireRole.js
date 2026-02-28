function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.workspace || !allowedRoles.includes(req.workspace.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions for this workspace',
        code: 'INSUFFICIENT_ROLE',
      });
    }
    next();
  };
}

module.exports = { requireRole };
