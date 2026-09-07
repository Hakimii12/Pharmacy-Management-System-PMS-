/**
 * Pagination helpers shared by every list endpoint.
 *
 * The `limit` a client asks for is always clamped to MAX_LIMIT so no request can
 * force the server to serialise an unbounded collection.
 */

export const DEFAULT_LIMIT = 25
export const MAX_LIMIT = 100

export function getPagination(query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const requestedPage = Number.parseInt(query.page, 10)
  const requestedLimit = Number.parseInt(query.limit, 10)

  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, maxLimit) : defaultLimit

  return { page, limit, skip: (page - 1) * limit }
}

export function paginated(data, { page, limit, total }) {
  return {
    data,
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  }
}

/**
 * Wraps the tail of an aggregation pipeline in a $facet so the page of documents
 * and the total count come back from a single round-trip.
 *
 * `dataStages` should contain the $sort/$skip/$limit plus any $lookup work that
 * only needs to run for the current page.
 */
export function facetPage(dataStages) {
  return [{ $facet: { data: dataStages, meta: [{ $count: "total" }] } }]
}

export function readFacet(result) {
  const first = result[0] || {}
  return {
    data: first.data || [],
    total: first.meta?.[0]?.total || 0,
  }
}

/** Case-insensitive "contains" matcher, with regex metacharacters neutralised. */
export function searchRegex(term) {
  const escaped = String(term).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(escaped, "i")
}

/** Builds a `{ $gte, $lte }` range, or undefined when neither bound is supplied. */
export function dateRange(startDate, endDate) {
  if (!startDate && !endDate) return undefined
  const range = {}
  if (startDate) range.$gte = new Date(startDate)
  if (endDate) {
    // Treat a bare YYYY-MM-DD end date as inclusive of that whole day.
    const end = new Date(endDate)
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) end.setHours(23, 59, 59, 999)
    range.$lte = end
  }
  return range
}
