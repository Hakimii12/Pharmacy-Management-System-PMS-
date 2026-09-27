import Profit from "../models/ProfitModel.js";
import { getPagination, paginated } from "../utils/pagination.js";

export async function GetProfit(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 60 });

    const { rows, count: total } = await Profit.findAndCountAll({
      order: [["lastUpdated", "DESC"]],
      offset: skip,
      limit,
    });

    const rowsJson = rows.map((r) => r.toJSON());

    return res.status(200).json({
      ...paginated(rowsJson, { page, limit, total }),
      current: rowsJson[0] || { daily: 0, monthly: 0, yearly: 0, lastUpdated: null },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
