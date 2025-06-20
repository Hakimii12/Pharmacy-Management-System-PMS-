import React from 'react';
import SummeryCards from '../components/dashboard/SummeryCards';
import InventoryChart from '../components/dashboard/InventoryChart';
import { FaPills, FaMoneyBillWave, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';
import { products, inventoryStats} from '../data/products';
import {salesStats,sales} from "../data/sales"

const Dashboard = () => {
  const stats = [
    {
      title: "Total products",
      value: products.length,
      change: "+12%",
      icon: <FaPills className="text-blue-500" />,
      color: "bg-blue-100"
    },
    {
      title: "Total Sales",
      value: `$${salesStats.totalSales}`,
      change: "+8.5%",
      icon: <FaMoneyBillWave className="text-green-500" />,
      color: "bg-green-100"
    },
    {
      title: "Low Stock",
      value: inventoryStats.lowStock,
      change: "+2",
      icon: <FaExclamationTriangle className="text-yellow-500" />,
      color: "bg-yellow-100"
    },
    {
      title: "Monthly Profit",
      value: `$${salesStats.totalProfit}`,
      change: "+15.2%",
      icon: <FaChartLine className="text-purple-500" />,
      color: "bg-purple-100"
    }
  ];

  const lowStockproducts = products.filter(drug => drug.status === "Low Stock");
  const nearExpiryproducts = products.filter(drug => drug.expirationDate < "2024-01-01");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className={`${stat.color} rounded-xl shadow p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className="p-3 rounded-full bg-white">
                {stat.icon}
              </div>
            </div>
            <p className="text-green-500 text-sm mt-2">
              <span className="font-semibold">{stat.change}</span> from last month
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Inventory Overview</h2>
          <InventoryChart />
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Low Stock Alert</h2>
          <div className="space-y-4">
            {lowStockproducts.map(drug => (
              <div key={drug.id} className="flex items-center p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                  <FaExclamationTriangle className="text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold">{drug.name} ({drug.brand})</h3>
                  <p className="text-sm text-gray-600">Only {drug.quantity} units left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Near Expiry products</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {nearExpiryproducts.map(drug => (
                  <tr key={drug.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{drug.name}</div>
                      <div className="text-sm text-gray-500">{drug.brand}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(drug.expirationDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${drug.quantity < 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {drug.quantity} units
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Sales</h2>
          <div className="space-y-4">
            {sales.slice(0, 5).map(sale => (
              <div key={sale.id} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{sale.drugName} ({sale.brand})</h3>
                    <p className="text-sm text-gray-500">{new Date(sale.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${sale.totalSellingPrice.toFixed(2)}</p>
                    <p className="text-sm text-green-500">+${sale.profit.toFixed(2)} profit</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;