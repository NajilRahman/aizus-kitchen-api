/**
 * Pagination utility functions
 */

/**
 * Parse pagination query parameters
 * @param {Object} req - Express request object
 * @returns {Object} Pagination options { page, limit, skip }
 */
function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse search query parameter
 * @param {Object} req - Express request object
 * @returns {string} Search query string
 */
function parseSearch(req) {
  return (req.query.search || req.query.q || "").trim();
}

/**
 * Create pagination response
 * @param {Array} data - Array of items
 * @param {number} total - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response
 */
function createPaginationResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Build search regex for MongoDB
 * @param {string} searchQuery - Search query string
 * @param {Array} fields - Fields to search in
 * @returns {Object} MongoDB query object
 */
function buildSearchQuery(searchQuery, fields = ["name"]) {
  if (!searchQuery) return {};

  const searchRegex = { $regex: searchQuery, $options: "i" };
  
  if (fields.length === 1) {
    return { [fields[0]]: searchRegex };
  }

  return {
    $or: fields.map(field => ({ [field]: searchRegex })),
  };
}

module.exports = {
  parsePagination,
  parseSearch,
  createPaginationResponse,
  buildSearchQuery,
};

