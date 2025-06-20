import React from 'react';
import ProfitReports from '../components/reports/ProfitReports';
import SalesChart from '../components/reports/SalesChart';
import { FaChartLine, FaMoneyBillWave, FaFileExport } from 'react-icons/fa';
import { profitReports, salesTrends, topSellingDrugs } from '../data/reports';

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>
          <button className="mt-3 md:mt-0 flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200">
            <FaFileExport className="mr-2" /> Export Report
          </button>
        </div>
        
        <ProfitReports />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sales Trends</h2>
          <SalesChart data={salesTrends} />
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Top Selling Drugs</h2>
          <div className="space-y-4">
            {topSellingDrugs.map((drug, index) => (
              <div key={drug.name} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">{index + 1}</span>
                    </div>
                    <h3 className="font-medium">{drug.name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${drug.sales.toLocaleString()}</p>
                    <p className="text-sm text-green-500">Profit: ${drug.profit.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(drug.sales / topSellingDrugs[0].sales) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Profit Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100 mr-4">
                <FaChartLine className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Daily Profit</p>
                <p className="text-2xl font-bold text-gray-800">${profitReports.daily.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-5 border border-green-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100 mr-4">
                <FaChartLine className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Profit</p>
                <p className="text-2xl font-bold text-gray-800">${profitReports.monthly.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100 mr-4">
                <FaMoneyBillWave className="text-purple-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Yearly Profit</p>
                <p className="text-2xl font-bold text-gray-800">${profitReports.yearly.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;