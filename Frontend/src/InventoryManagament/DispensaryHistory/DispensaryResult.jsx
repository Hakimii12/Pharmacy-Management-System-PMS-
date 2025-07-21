// src/components/InventorySummaryCard.jsx
import React, { useEffect, useState } from 'react';
import { FaBoxes, FaMoneyBillWave } from 'react-icons/fa';
import axios from 'axios';
import Api from "../../data/API.json"
const InventorySummaryCard = () => {
  const ApiLink=Api.link
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchInventorySummary() {
    try {
      const res = await axios.get(
        `${ApiLink}/api/product/getCountedDispensary`,
        { withCredentials: true }
      );
      setInventoryData(res.data);
      console.log(res.data)
    } catch (err) {
      console.error("Error fetching inventory data:", err);
      setError("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventorySummary();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!inventoryData) {
    return null;
  }

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
                  {formatCurrency(inventoryData.totalSellingValue)}
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
                  {formatCurrency(inventoryData.totalInventoryValue)}
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
                  {inventoryData.totalInDispensary}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="text-yellow-600">
                  {inventoryData.lowInDispensary} low stock
                </span>
                <span className="text-gray-500">
                  {inventoryData.outOfStockInDispensary} stock out
                </span>
                <span className="text-red-600">
                  {inventoryData.expiredInDispensary} expired
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