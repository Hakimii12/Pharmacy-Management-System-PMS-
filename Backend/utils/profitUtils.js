import Profit from "../models/ProfitModel.js";

export async function updateProfitSummary(profit, saleDate) {
  try {
    let summary = await Profit.findOne();
    if (!summary) {
      summary = await Profit.create({
        daily: 0,
        monthly: 0,
        yearly: 0,
        lastDaily: saleDate,
        lastMonthly: saleDate,
        lastYearly: saleDate,
      });
    }

    const lastDaily = summary.lastDaily || saleDate;
    const lastMonthly = summary.lastMonthly || saleDate;
    const lastYearly = summary.lastYearly || saleDate;

    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
    const isSameMonth = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    const isSameYear = (d1, d2) => d1.getFullYear() === d2.getFullYear();

    const saleD = new Date(saleDate);

    if (!isSameDay(new Date(lastDaily), saleD)) {
      summary.daily = profit;
      summary.lastDaily = saleD;
    } else {
      summary.daily = (summary.daily || 0) + profit;
    }

    if (!isSameMonth(new Date(lastMonthly), saleD)) {
      summary.monthly = profit;
      summary.lastMonthly = saleD;
    } else {
      summary.monthly = (summary.monthly || 0) + profit;
    }

    if (!isSameYear(new Date(lastYearly), saleD)) {
      summary.yearly = profit;
      summary.lastYearly = saleD;
    } else {
      summary.yearly = (summary.yearly || 0) + profit;
    }

    summary.lastUpdated = new Date();
    await summary.save();
  } catch (error) {
    console.error("Error updating profit summary:", error);
  }
}
