import { Op } from "sequelize";

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

export function getPagination(query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, maxLimit) : defaultLimit;

  return { page, limit, skip: (page - 1) * limit, offset: (page - 1) * limit };
}

export function paginated(data, { page, limit, total }) {
  return {
    data,
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

export function searchRegex(term) {
  return `%${String(term || "").trim()}%`;
}

export function searchLike(term) {
  return `%${String(term || "").trim()}%`;
}

export function dateRange(startDate, endDate) {
  if (!startDate && !endDate) return undefined;
  const range = {};
  if (startDate) range[Op.gte] = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) end.setHours(23, 59, 59, 999);
    range[Op.lte] = end;
  }
  return range;
}
