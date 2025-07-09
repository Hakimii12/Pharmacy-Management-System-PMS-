// src/components/SalesList.jsx/components/OrderCard.jsx
import React from 'react';

const OrderCard = ({ order, onComplete, onAbort }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg">Order #{order.id.slice(-6)}</h2>
            <p className="text-gray-600">Patient: {order.patientName}</p>
          </div>
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            Pending
          </span>
        </div>
      </div>
      
      <div className="p-4 border-b">
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between text-sm">
              <div>
                <span className="font-medium">{item.name}</span>
                <div className="text-xs text-gray-500">
                  {item.brand} • {item.category} • Qty: {item.quantity}
                </div>
              </div>
              <div>
                ${item.total.toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-4 flex justify-between items-center">
        <span className="font-bold">${order.totalAmount.toFixed(2)}</span>
        <div className="space-x-2">
          <button
            onClick={onAbort}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Abort
          </button>
          <button
            onClick={onComplete}
            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;