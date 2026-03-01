/**
 * Pagination middleware and helper
 *
 * Middleware parses ?page=1&limit=20 from query params.
 * Defaults: page=1, limit=20, maxLimit=100.
 * Attaches req.pagination = { page, limit, offset } to the request.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function pagination(req, res, next) {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
}

/**
 * Build a standardized paginated response object.
 *
 * @param {Array} items - The data items for the current page
 * @param {number} total - Total number of items across all pages
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {{ data: Array, pagination: { page: number, limit: number, total: number, totalPages: number } }}
 */
function paginatedResponse(items, total, page, limit) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = { pagination, paginatedResponse };
