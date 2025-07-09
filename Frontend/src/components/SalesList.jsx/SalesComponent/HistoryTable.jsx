// src/components/SalesList.jsx/components/HistoryTable.jsx
import React, { useState } from 'react';

const HistoryTable = ({ history, onUndoProduct }) => {
  const [expandedOrder, setExpandedOrder] = useState(null);

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
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
                          {order.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{item.name}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{item.brand}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{item.category}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{item.dosageForm}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">${item.unitPrice.toFixed(2)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">${item.total.toFixed(2)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {order.status === 'completed' && (
                                  <button
                                    onClick={() => onUndoProduct(order.id, item.productId)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Undo
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
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