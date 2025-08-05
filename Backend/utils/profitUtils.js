import Profit from "../models/ProfitModel.js";
import Sale from "../models/SalesModel.js";

export async function updateProfitSummary(profit, saleDate) {
    try {
        let summary = await Profit.findOne() || new Profit();

        // Get last updated dates or set to saleDate if not present
        const lastDaily = summary.lastDaily || saleDate;
        const lastMonthly = summary.lastMonthly || saleDate;
        const lastYearly = summary.lastYearly || saleDate;

        // Helper to check if two dates are the same day/month/year
        const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
        const isSameMonth = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
        const isSameYear = (d1, d2) => d1.getFullYear() === d2.getFullYear();

        // Reset or increment daily
        if (!isSameDay(new Date(lastDaily), saleDate)) {
            summary.daily = profit;
            summary.lastDaily = saleDate;
        } else {
            summary.daily += profit;
        }

        // Reset or increment monthly
        if (!isSameMonth(new Date(lastMonthly), saleDate)) {
            summary.monthly = profit;
            summary.lastMonthly = saleDate;
        } else {
            summary.monthly += profit;
        }

        // Reset or increment yearly
        if (!isSameYear(new Date(lastYearly), saleDate)) {
            summary.yearly = profit;
            summary.lastYearly = saleDate;
        } else {
            summary.yearly += profit;
        }

        summary.lastUpdated = Date.now();
        await summary.save();
    } catch (error) {
        console.error(error);
    }
}
