import React, { useState } from 'react';
import HistoryTable from './SalesComponent/HistoryTable';
import axios from 'axios';
import { useEffect } from 'react';
import Loading from '../Loading/Loading';
import Api from "../../data/API.json"

const SalesHistory = () => {
  const ApiLink = Api.link
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  
  async function FetchTransactionHistory() {
    setLoading(true)
    try {
      const res = await axios.get(`${ApiLink}/api/sales/allTransactionHistory`, {
        withCredentials: true
      }).then((res) => {
        setHistory(res.data)
      })
      setLoading(false)
    } catch (error) {
      console.log(error)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    FetchTransactionHistory()
  }, [])

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    saleType: '',
    paymentStatus: '',
    pharmacist: '',
    cashier: '',
    customerPhone: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredHistory = history.filter(order => {
    const orderDate = new Date(order.completedAt || order.abortedAt || order.timestamp);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    return (
      (filters.status ? order.status === filters.status : true) &&
      (filters.saleType ? order.saleType === filters.saleType : true) &&
      (filters.paymentStatus ? order.paymentStatus === filters.paymentStatus : true) &&
      (filters.pharmacist ? order.pharmacist?.toLowerCase().includes(filters.pharmacist.toLowerCase()) : true) &&
      (filters.cashier ? (order.cashier || '')?.toLowerCase().includes(filters.cashier.toLowerCase()) : true) &&
      (filters.customerPhone ? (order.customerPhone || '')?.includes(filters.customerPhone) : true) &&
      (!startDate || orderDate >= startDate) &&
      (!endDate || orderDate <= new Date(endDate.setHours(23, 59, 59, 999)))
    );
  });

  const handleUndoProduct = (orderId, productId) => {
    setHistory(prev => 
      prev.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.filter(item => item.productId !== productId);
          if (updatedItems.length === 0) {
            return null;
          }
          return {
            ...order,
            items: updatedItems,
            totalAmount: updatedItems.reduce((sum, item) => sum + item.total, 0)
          };
        }
        return order;
      }).filter(Boolean)
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Transaction History</h1>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="aborted">Aborted</option>
              <option value="credit">Credit</option>
              <option value="partial">Partial</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sale Type</label>
            <select
              name="saleType"
              value={filters.saleType}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Status</label>
            <select
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="credit">Credit</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
            <input
              type="text"
              name="customerPhone"
              value={filters.customerPhone}
              onChange={handleFilterChange}
              placeholder="Search by phone"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pharmacist</label>
            <input
              type="text"
              name="pharmacist"
              value={filters.pharmacist}
              onChange={handleFilterChange}
              placeholder="Search pharmacist"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cashier</label>
            <input
              type="text"
              name="cashier"
              value={filters.cashier}
              onChange={handleFilterChange}
              placeholder="Search cashier"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>
      </div>
      
      {loading ? <Loading/> : <HistoryTable 
        history={filteredHistory} 
        onUndoProduct={handleUndoProduct} 
      />}
    </div>
  );
};

export default SalesHistory;