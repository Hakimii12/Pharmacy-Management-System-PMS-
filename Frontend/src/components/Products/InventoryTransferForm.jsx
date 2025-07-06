import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const InventoryTransferForm = ({ product, onTransfer, onClose }) => {
  const [transferData, setTransferData] = useState({
    productId: product?._id || '',
    quantity: 1,
    transferType: 'ISSUE_TO_DISPENSARY'
  });
  
  const [maxQuantity, setMaxQuantity] = useState(0);
  
  useEffect(() => {
    if (product) {
      // Set initial max quantity based on transfer type
      const initialMax = transferData.transferType === 'ISSUE_TO_DISPENSARY' 
        ? product.inventory.store 
        : product.inventory.dispensary;
      
      setMaxQuantity(initialMax);
      
      // Update form data with product ID
      setTransferData(prev => ({
        ...prev,
        productId: product._id,
        quantity: Math.min(prev.quantity, initialMax)
      }));
    }
  }, [product, transferData.transferType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'transferType') {
      // When transfer type changes, update max quantity accordingly
      const newMax = value === 'ISSUE_TO_DISPENSARY' 
        ? product.inventory.store 
        : product.inventory.dispensary;
      
      setMaxQuantity(newMax);
      
      // Reset quantity to max if current quantity exceeds new max
      setTransferData(prev => ({
        ...prev,
        [name]: value,
        quantity: Math.min(prev.quantity, newMax)
      }));
    } else {
      setTransferData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onTransfer(transferData);
    onClose();
  };

  if (!product) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-5 text-white">
          <h2 className="text-2xl font-bold">Inventory Transfer</h2>
          <p className="mt-1 opacity-90">Transfer {product.name} between locations</p>
        </div>
        
        <div className="p-5">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 rounded-lg w-12 h-12 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">
                  {product.name.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.brand}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500">Store Inventory</p>
                <p className="text-xl font-bold">{product.inventory.store}</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500">Dispensary Inventory</p>
                <p className="text-xl font-bold">{product.inventory.dispensary}</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  transferData.transferType === 'ISSUE_TO_DISPENSARY' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="transferType"
                    value="ISSUE_TO_DISPENSARY"
                    checked={transferData.transferType === 'ISSUE_TO_DISPENSARY'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="mx-auto w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <span className="font-medium">Issue to Dispensary</span>
                  </div>
                </label>
                
                <label className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  transferData.transferType === 'RETURN_TO_STORE' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="transferType"
                    value="RETURN_TO_STORE"
                    checked={transferData.transferType === 'RETURN_TO_STORE'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="mx-auto w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                      </svg>
                    </div>
                    <span className="font-medium">Return to Store</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Transfer
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  max={maxQuantity}
                  value={transferData.quantity}
                  onChange={handleChange}
                  className="w-full py-3 px-4 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="bg-gray-100 px-4 py-3 border-t border-b border-r border-gray-300 rounded-r-lg text-gray-600">
                  Max: {maxQuantity}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
              >
                Confirm Transfer
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InventoryTransferForm;