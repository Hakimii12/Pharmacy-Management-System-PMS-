import Profit from "../models/ProfitModel.js";
import Sale from "../models/SalesModel.js";
export async function updateProfitSummary(profit,saleDate){
    try {
        const startOfDay = new Date(saleDate);
        startOfDay.setHours(0,0,0,0)
        const startOfMonth = new Date(saleDate.getFullYear(),saleDate.getMonth(),1);
        const startOfYear = new Date(saleDate.getFullYear(),0,1);
        let summary = await Profit.findOne() || new Profit();
        console.log(profit)
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
    } catch (error) {
        console.error(error);
    }
}
