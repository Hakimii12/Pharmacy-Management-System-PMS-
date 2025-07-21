import Profit from "../models/ProfitModel.js"
export async function GetProfit(req, res) {
    try {
      const profit = await Profit.find()
      res.status(200).json(profit)
    } catch (error) {
      res.status(500).json({ massage: error.message })
    }
}