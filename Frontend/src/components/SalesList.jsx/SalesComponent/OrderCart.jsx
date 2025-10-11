// OrderCart.jsx
// src/components/SalesList.jsx/components/OrderCart.jsx
import React from 'react';
import { FiShoppingBag, FiTrash2 } from 'react-icons/fi';

const OrderCart = ({ items, onUpdate, onRemove }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Check if expiry date is near (within 30 days)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  // Check if product is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <FiShoppingBag className="h-16 w-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No items in order</p>
          <p className="text-sm mt-1">Add products from the list</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {items.map(item => (
            <div key={item._id} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.brand}</p>
                  
                  {/* Batch and Expiry Info */}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {item.batchNumber && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        Batch: {item.batchNumber}
                      </span>
                    )}
                    {item.expiryDate && (
                      <span className={`px-2 py-1 rounded ${
                        isExpired(item.expiryDate) 
                          ? 'bg-red-100 text-red-700' 
                          : isExpiringSoon(item.expiryDate) 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                      }`}>
                        Exp: {formatDate(item.expiryDate)}
                        {isExpired(item.expiryDate) && ' ⚠️'}
                        {isExpiringSoon(item.expiryDate) && !isExpired(item.expiryDate) && ' ⚠️'}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-green-600 font-semibold">
                      {item.sellingPrice.toFixed(2)} ETB
                    </span>
                    <span className="text-gray-500 text-sm">
                      Total: {(item.quantity * item.sellingPrice).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUpdate(item._id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdate(item._id, parseInt(e.target.value) || 1)}
                    className="w-16 border border-gray-300 rounded-lg p-1 text-center"
                  />
                  <button
                    onClick={() => onUpdate(item._id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
                <button 
                  onClick={() => onRemove(item._id)}
                  className="text-red-500 hover:text-red-700 p-2 transition-colors"
                  title="Remove item"
                >
                  <FiTrash2 />
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