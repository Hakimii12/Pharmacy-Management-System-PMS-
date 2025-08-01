// src/components/SalesList.jsx/components/OrderCart.jsx
import React from 'react';
import { FaRemoveFormat } from 'react-icons/fa';
import {FiShoppingBag} from 'react-icons/fi'
const OrderCart = ({ items, onUpdate, onRemove }) => {
  return (
    <div className="border rounded-lg p-4">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative">
            {/* Bouncing shopping cart icon */}
            <FiShoppingBag
              className="text-gray-400 h-12 w-12 mb-2 animate-bounceCart mx-auto"
            />
            
            {/* Floating text with color transition */}
            <p className="text-gray-500 text-center animate-float bg-gradient-to-r from-gray-400 via-gray-600 to-gray-400 bg-clip-text text-transparent">
              No items in order
            </p>
            
            {/* Subtle floating dots */}
            <div className="absolute -bottom-2 left-0 right-0 flex justify-center space-x-1">
              {[...Array(3)].map((_, i) => (
                <span 
                  key={i}
                  className="h-1 w-1 bg-gray-300 rounded-full animate-float"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item._id} className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.brand} • {item.sellingPrice.toFixed(2)} <span className='text-green-600 text-xs'>ETB</span></p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onUpdate(item._id, parseInt(e.target.value))}
                  className="w-16 border rounded p-1 text-center"
                />
                <button 
                  onClick={() => onRemove(item._id)}
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