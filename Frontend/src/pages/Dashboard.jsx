import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPills, FaMoneyBillWave, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';
import InventoryChart from '../components/dashboard/InventoryChart';
const Dashboard = () => {
  const [stats, setStats] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [nearExpiryProducts, setNearExpiryProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
   useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Define all API endpoints
        const endpoints = [
          'http://localhost:5000/api/product/getCountAllProduct',
          'http://localhost:5000/api/sales/sales/GetTotalSales',
          'http://localhost:5000/api/notify/getLowStock',
          'http://localhost:5000/api/notify/getNearExpiryProducts',
          'http://localhost:5000/api/profit/profit',
          'http://localhost:5000/api/sales/sales/getRecentSales'
        ];

        // Fetch all data in parallel
        const responses = await Promise.all(
          endpoints.map(url => axios.get(url,{withCredentials:true}),)
        );

        // Extract data from responses
        const [
          productsRes, 
          salesRes, 
          lowStockRes, 
          nearExpiryRes, 
          profitRes, 
          recentSalesRes
        ] = responses.map(res => res.data);

        // Prepare stats data with validation
        const statsData = [
          {
            title: "Total products",
            value: productsRes?.totalProducts || 0,
            change: "+12%",
            icon: <FaPills className="text-blue-500" />,
            color: "bg-blue-100"
          },
          {
            title: "Total Sales",
            value: `$${salesRes?.totalSales || 0}`,
            change: "+8.5%",
            icon: <FaMoneyBillWave className="text-green-500" />,
            color: "bg-green-100"
          },
          {
            title: "Low Stock",
            value: lowStockRes?.count || 0,
            change: "+2",
            icon: <FaExclamationTriangle className="text-yellow-500" />,
            color: "bg-yellow-100"
          },
          {
            title: "Monthly Profit",
            value: `$${profitRes[0]?.monthly || 0}`,
            change: "+15.2%",
            icon: <FaChartLine className="text-purple-500" />,
            color: "bg-purple-100"
          }
        ];

        // Filter out low stock products with quantity > 0
        const validLowStock = (lowStockRes?.lowStockProducts || []).filter(
          product => product.quantity > 0
        );

        setStats(statsData);
        setLowStockProducts(validLowStock);
        setNearExpiryProducts(nearExpiryRes?.nearExpiryProducts || []);
        setRecentSales(recentSalesRes?.sales || []);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  );

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
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sales Overview</h2>
          <InventoryChart salesData={recentSales} />
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Low Stock Alert</h2>
          <div className="space-y-4">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product, index) => (
                <div key={index} className="flex items-center p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                    <FaExclamationTriangle className="text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{product.name} ({product.brand})</h3>
                    <p className="text-sm text-gray-600">Only {product.quantity} units left</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No low stock items</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Near Expiry Products</h2>
          <div className="overflow-x-auto">
            {nearExpiryProducts.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nearExpiryProducts.map((product, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.brand}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(product.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${product.quantity < 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {product.quantity} units
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center py-4">No near expiry products</p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Sales</h2>
          <div className="space-y-4">
            {recentSales.length > 0 ? (
              recentSales.map((sale, index) => (
                <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold">Sale #{index + 1}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${sale.saleAmount?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-green-500">
                        +${sale.profit?.toFixed(2) || '0.00'} profit
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent sales</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;