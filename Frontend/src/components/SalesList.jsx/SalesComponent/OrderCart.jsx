// src/components/SalesList.jsx/components/OrderCart.jsx
import React from 'react';

const OrderCart = ({ items, onUpdate, onRemove }) => {
  return (
    <div className="border rounded-lg p-4">
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No items in order</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.brand} • ${item.sellingPrice.toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onUpdate(item.id, parseInt(e.target.value))}
                  className="w-16 border rounded p-1 text-center"
                />
                <button 
                  onClick={() => onRemove(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderCart;