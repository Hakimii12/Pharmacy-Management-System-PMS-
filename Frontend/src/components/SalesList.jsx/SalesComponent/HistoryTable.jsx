// src/components/SalesList.jsx/components/HistoryTable.jsx
import React, { useState } from 'react';
import Api from "../../../data/API.json"
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const HistoryTable = ({ history: initialHistory }) => {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [history, setHistory] = useState(initialHistory);
  const [loadingUndo, setLoadingUndo] = useState({}); // { [orderId_productId]: true }

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleUndoProduct = async (orderId, productId) => {
    const key = `${orderId}_${productId}`;
    setLoadingUndo(prev => ({ ...prev, [key]: true }));
    try {
      const response = await axios.post(
        `${Api.link}/api/sales/undo`,
        { transactionId: orderId, productId },
        { withCredentials: true }
      );

      if (response.data.success) {
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
        toast.success('Product refund processed successfully');
      } else {
        toast.error('Failed to process refund');
      }
    } catch (error) {
      console.error('Error undoing transaction:', error);
      toast.error('Failed to process refund: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingUndo(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} />
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacist</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cashier</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map(order => (
            <React.Fragment key={order.id}>
              <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{order.id.slice(-6)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.patientName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.timestamp)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.pharmacist}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.cashier || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">${order.totalAmount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    order.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    onClick={() => toggleExpand(order.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {expandedOrder === order.id ? 'Collapse' : 'Expand'}
                  </button>
                </td>
              </tr>
              {expandedOrder === order.id && (
                <tr>
                  <td colSpan="8" className="px-6 py-4 bg-gray-50">
                    <div className="space-y-4">
                      <h3 className="font-medium">Order Details</h3>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {order.items.map((item, index) => {
                            const key = `${order.id}_${item.productId}`;
                            return (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.brand}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.category}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.dosageForm}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.sellingPrice.toFixed(2)} <span className='text-xs text-green-800'>(ETB)</span></td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.total.toFixed(2)} <span className='text-xs text-green-800'>(ETB)</span></td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  {order.status === 'completed' && (
                                    <button
                                      onClick={() => handleUndoProduct(order.id, item.productId)}
                                      className={`text-red-600 hover:text-red-900 px-2 py-1 rounded ${loadingUndo[key] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      disabled={loadingUndo[key]}
                                    >
                                      {loadingUndo[key] ? 'Undoing...' : 'Undo'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      
      {history.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No transactions found</p>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;