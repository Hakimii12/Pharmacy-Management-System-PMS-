import Profit from "../models/ProfitModel.js";
import Sale from "../models/SalesModel.js";
export async function updateProfitSummary(profit,saleDate=new Date()){
    try {
        const startOfDay = new Date(saleDate);
        startOfDay.setHours(0,0,0,0)
        const startOfMonth = new Date(saleDate.getFullYear(),saleDate.getMonth(),1);
        const startOfYear = new Date(saleDate.getFullYear(),0,1);
        let summary = await Profit.findOne() || new Profit();
        if(saleDate >=startOfDay){
            summary.daily +=profit;
        }
        if (saleDate >= startOfMonth) {
            summary.monthly += profit;
        }
        if (saleDate >= startOfYear) {
            summary.yearly += profit;
        }
        summary.lastUpdated = Date.now();
        await summary.save();
        recalculateAggregates();
    } catch (error) {
        console.error(error);
    }
}
export async function recalculateAggregates(){
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [daily, monthly, yearly] = await Promise.all([
      Sale.aggregate([{
        $match: { timestamp: { $gte: startOfDay } }
      }, {
        $group: { _id: null, total: { $sum: "$profit" } }
      }]),
      Sale.aggregate([{
        $match: { timestamp: { $gte: startOfMonth } }
      }, {
        $group: { _id: null, total: { $sum: "$profit" } }
      }]),
      Sale.aggregate([{
        $match: { timestamp: { $gte: startOfYear } }
      }, {
        $group: { _id: null, total: { $sum: "$profit" } }
      }])
    ]);

    await Profit.updateOne({}, {
      daily: daily[0]?.total || 0,
      monthly: monthly[0]?.total || 0,
      yearly: yearly[0]?.total || 0,
      lastUpdated: now
    });
  } catch (err) {
    console.error('Error recalculating aggregates:', err);
  } 
}
