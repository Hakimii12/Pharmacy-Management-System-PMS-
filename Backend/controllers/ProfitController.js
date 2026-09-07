import Profit from "../models/ProfitModel.js"
import { getPagination, paginated } from "../utils/pagination.js"

/**
 * Profit rollups.
 *
 * `updateProfitSummary` keeps a single running document, but nothing enforces
 * that, so this reads a bounded, sorted page rather than the whole collection.
 * The newest row is surfaced as `current` because that is what the dashboard
 * actually renders.
 */
export async function GetProfit(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 60 })

    const [rows, total] = await Promise.all([
      Profit.find().sort({ lastUpdated: -1 }).skip(skip).limit(limit).lean(),
      Profit.estimatedDocumentCount(),
    ])

    return res.status(200).json({
      ...paginated(rows, { page, limit, total }),
      current: rows[0] || { daily: 0, monthly: 0, yearly: 0, lastUpdated: null },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
