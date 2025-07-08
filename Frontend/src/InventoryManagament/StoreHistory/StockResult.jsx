// src/components/InventorySummaryCard.jsx
import React from 'react';
import { FaBoxes, FaMoneyBillWave, FaChartLine, FaPills } from 'react-icons/fa';

const InventorySummaryCard = () => {
  // Sample data - replace with your actual data
  const inventoryData = {
    totalPriceInStore: 125847.95,
    totalUnitPrice: 98752.40,
    totalProducts: 143,
    lowStockItems: 12,
    expiredItems: 5,
    profitMargin: 27.42
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Price in Store Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-blue-500">
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                  <FaMoneyBillWave size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Price in Store</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(inventoryData.totalPriceInStore)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Current market value of all inventory
                </p>
              </div>
            </div>
          </div>

          {/* Total Unit Price Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-purple-500">
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                  <FaMoneyBillWave size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Unit Price</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(inventoryData.totalUnitPrice)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Total cost basis of all inventory
                </p>
              </div>
            </div>
          </div>

          {/* Products Summary Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-orange-500">
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
                  <FaBoxes size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Products Summary</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {inventoryData.totalProducts}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-600">
                    {inventoryData.lowStockItems} low stock
                  </span>
                  <span className="text-red-600">
                    {inventoryData.expiredItems} expired
                  </span>
                  <span className="text-red-600">
                    {inventoryData.expiredItems} expired
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default InventorySummaryCard;