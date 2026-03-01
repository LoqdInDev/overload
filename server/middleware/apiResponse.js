/**
 * API Response Helper Middleware
 *
 * Attaches standardized response helper methods to `res`.
 * Routes can optionally use these helpers for consistent JSON responses.
 *
 * Usage:
 *   app.use(apiResponse);
 *   // then in any route:
 *   res.success({ user: { id: 1 } });
 *   res.paginated(items, { page: 1, pageSize: 20, total: 100 });
 *   res.error('Not found', 'NOT_FOUND', 404);
 */

function apiResponse(req, res, next) {
  /**
   * Send a successful response.
   * @param {*} data - The response payload
   * @param {number} [status=200] - HTTP status code
   */
  res.success = function (data, status = 200) {
    return res.status(status).json({
      success: true,
      data,
    });
  };

  /**
   * Send a successful paginated response.
   * @param {Array} data - The array of items
   * @param {object} pagination - Pagination metadata
   * @param {number} pagination.page - Current page number
   * @param {number} pagination.pageSize - Items per page
   * @param {number} pagination.total - Total number of items
   * @param {number} [pagination.totalPages] - Total pages (auto-calculated if omitted)
   */
  res.paginated = function (data, pagination) {
    const totalPages = pagination.totalPages
      || Math.ceil(pagination.total / pagination.pageSize)
      || 0;

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages,
      },
    });
  };

  /**
   * Send an error response.
   * @param {string} message - Human-readable error message
   * @param {string} [code='INTERNAL_ERROR'] - Machine-readable error code
   * @param {number} [status=500] - HTTP status code
   */
  res.error = function (message, code = 'INTERNAL_ERROR', status = 500) {
    return res.status(status).json({
      success: false,
      error: {
        message,
        code,
      },
    });
  };

  next();
}

module.exports = { apiResponse };
