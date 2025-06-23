import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaExclamationTriangle, FaCalculator } from 'react-icons/fa';
import { productCategories } from '../../data/products';

const ProductForm = ({ product, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    unitPrice: '',
    quantity: '',
    expirationDate: '',
    batchNumber: '',
    markup: '',
    category: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isExpired, setIsExpired] = useState(false);
  const [status, setStatus] = useState('In Stock');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand,
        unitPrice: product.unitPrice,
        quantity: product.quantity,
        expirationDate: product.expirationDate,
        batchNumber: product.batchNumber,
        markup: product.markup,
        category: product.category
      });
      checkExpiryStatus(product.expirationDate);
      calculateStatus(product.quantity, product.expirationDate);
    }
  }, [product]);

  const checkExpiryStatus = (date) => {
    const expiryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    setIsExpired(expiryDate < today);
  };

  const calculateStatus = (quantity, expirationDate) => {
    const expiryDate = new Date(expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (expiryDate < today) {
      setStatus('Expired');
    } else if (quantity <= 0) {
      setStatus('Sold Out');
    } else if (quantity <= 5) {
      setStatus('Low Stock');
    } else {
      setStatus('In Stock');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    // Check expiry status when date changes
    if (name === 'expirationDate') {
      checkExpiryStatus(value);
    }
    
    // Calculate status when quantity or expiration date changes
    if (name === 'quantity' || name === 'expirationDate') {
      const qty = name === 'quantity' ? value : formData.quantity;
      const expDate = name === 'expirationDate' ? value : formData.expirationDate;
      calculateStatus(qty, expDate);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name) newErrors.name = 'Product name is required';
    if (!formData.brand) newErrors.brand = 'Brand is required';
    if (!formData.unitPrice || formData.unitPrice <= 0) newErrors.unitPrice = 'Unit price must be positive';
    if (!formData.quantity || formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (!formData.expirationDate) newErrors.expirationDate = 'Expiration date is required';
    if (!formData.batchNumber) newErrors.batchNumber = 'Batch number is required';
    if (!formData.markup || formData.markup < 0) newErrors.markup = 'Markup must be non-negative';
    if (!formData.category) newErrors.category = 'Category is required';
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Create product object with calculated fields
    const newProduct = {
      ...formData,
      id: product ? product.id : Date.now(), // Keep existing ID if editing
      unitPrice: parseFloat(formData.unitPrice),
      quantity: parseInt(formData.quantity),
      markup: parseInt(formData.markup),
      status,
      isExpired,
      totalValue: parseFloat(formData.unitPrice) * parseInt(formData.quantity)
    };
    
    onSave(newProduct);
    onClose();
  };

 const sellingPrice = formData.unitPrice 
  ? (parseFloat(formData.unitPrice) * (1 + parseInt(formData.markup || 0) / 100)).toFixed(2)
  : '0.00';

  const totalValue = formData.unitPrice && formData.quantity 
    ? (parseFloat(formData.unitPrice) * parseInt(formData.quantity)).toFixed(2)
    : '0.00';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {isExpired && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <FaExclamationTriangle className="text-red-500 mr-2" />
              <span className="text-red-700">Warning: This product has expired!</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter product name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand *
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.brand ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter brand name"
              />
              {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.unitPrice ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter unit price"
              />
              {errors.unitPrice && <p className="mt-1 text-sm text-red-500">{errors.unitPrice}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="0"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter quantity"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date *
              </label>
              <input
                type="date"
                name="expirationDate"
                value={formData.expirationDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.expirationDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.expirationDate && <p className="mt-1 text-sm text-red-500">{errors.expirationDate}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.batchNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter batch number"
              />
              {errors.batchNumber && <p className="mt-1 text-sm text-red-500">{errors.batchNumber}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Markup (%) *
              </label>
              <input
                type="number"
                min="0"
                name="markup"
                value={formData.markup}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.markup ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter markup percentage"
              />
              {errors.markup && <p className="mt-1 text-sm text-red-500">{errors.markup}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {productCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>
          </div>
          
          <div className="mt-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-2">Product Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Selling Price:</div>
                <div className="font-medium text-green-600">
                  ${sellingPrice}
                </div>
                
                <div className="text-gray-600">Total Value:</div>
                <div className="font-medium">
                  ${totalValue}
                </div>
                
                <div className="text-gray-600">Status:</div>
                <div className="font-medium">
                  {status === 'Expired' ? (
                    <span className="text-red-600">Expired</span>
                  ) : status === 'Sold Out' ? (
                    <span className="text-red-600">Sold Out</span>
                  ) : status === 'Low Stock' ? (
                    <span className="text-yellow-600">Low Stock</span>
                  ) : (
                    <span className="text-green-600">In Stock</span>
                  )}
                </div>
                
                {isExpired && (
                  <>
                    <div className="text-gray-600">Expiry Status:</div>
                    <div className="font-medium text-red-600">Expired</div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center transition-colors"
            >
              <FaSave className="mr-2" />
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;