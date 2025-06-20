import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCheck, FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import { products } from '../../data/products';

const SalesForm = ({ onSave, onClose }) => {
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const formRef = useRef(null);
  
  // Filter only products that are in stock
  const inStockproducts = products.filter(drug => drug.quantity > 0 && !drug.isExpired);

  // Apply search, filter and sort
  const filteredproducts = inStockproducts
    .filter(drug => {
      const matchesSearch = drug.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           drug.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || drug.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'price') return a.unitPrice - b.unitPrice;
      return 0;
    });

  // Get unique categories for filter dropdown
  const categories = ['All', ...new Set(products.map(drug => drug.category))];

  // Scroll to bottom when drug is selected
  useEffect(() => {
    if (selectedDrug && formRef.current) {
      formRef.current.scrollTo({
        top: formRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [selectedDrug]);

  const calculateSaleDetails = () => {
    if (!selectedDrug) return null;
    
    const costPrice = selectedDrug.unitPrice;
    const sellingPricePerUnit = costPrice * (1 + selectedDrug.markup / 100);
    const totalSellingPrice = sellingPricePerUnit * quantity;
    const profit = (sellingPricePerUnit - costPrice) * quantity;
    
    return {
      costPrice,
      sellingPricePerUnit,
      totalSellingPrice,
      profit
    };
  };

  const saleDetails = calculateSaleDetails();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedDrug) {
      setErrors({ drug: 'Please select a drug' });
      return;
    }
    
    if (quantity <= 0) {
      setErrors({ quantity: 'Quantity must be at least 1' });
      return;
    }
    
    if (quantity > selectedDrug.quantity) {
      setErrors({ quantity: `Only ${selectedDrug.quantity} units available` });
      return;
    }
    
    const saleRecord = {
      drugId: selectedDrug.id,
      drugName: selectedDrug.name,
      brand: selectedDrug.brand,
      quantitySold: quantity,
      unitCostPrice: saleDetails.costPrice,
      markupPercentage: selectedDrug.markup,
      sellingPricePerUnit: saleDetails.sellingPricePerUnit,
      totalSellingPrice: saleDetails.totalSellingPrice,
      profit: saleDetails.profit,
      soldOut: (selectedDrug.quantity - quantity) === 0
    };
    
    onSave(saleRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Record New Sale
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Scrollable content area */}
        <div 
          ref={formRef}
          className="overflow-y-auto flex-grow p-6"
        >
          <form onSubmit={handleSubmit}>
            {/* Drug Search and Filter Section */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Find Drug to Sell</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-gray-400" />
                  </div>
                  <select
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSortAmountDown className="text-gray-400" />
                  </div>
                  <select
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="name">Sort by Name</option>
                    <option value="quantity">Sort by Stock (High to Low)</option>
                    <option value="price">Sort by Price (Low to High)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {filteredproducts.length} of {inStockproducts.length} available products
                </p>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
            
            {/* Drug Selection Grid */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredproducts.length > 0 ? (
                  filteredproducts.map(drug => (
                    <div 
                      key={drug.id}
                      onClick={() => {
                        setSelectedDrug(drug);
                        setErrors({});
                      }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedDrug?.id === drug.id 
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' 
                          : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{drug.name}</h3>
                          <p className="text-sm text-gray-500">{drug.brand}</p>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {drug.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${drug.unitPrice.toFixed(2)}</p>
                          <p className={`text-xs ${
                            drug.quantity > 50 ? 'text-green-600' : 
                            drug.quantity > 10 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {drug.quantity} in stock
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-blue-600">Markup: {drug.markup}%</span>
                        <span className="text-green-600">
                          Sale: ${(drug.unitPrice * (1 + drug.markup / 100)).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            drug.quantity > 50 ? 'bg-green-500' : 
                            drug.quantity > 10 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, drug.quantity)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">No products found matching your criteria</p>
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('All');
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              {errors.drug && <p className="mt-2 text-sm text-red-500">{errors.drug}</p>}
            </div>
            
            {/* Sale Details */}
            {selectedDrug && (
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
                <h3 className="text-lg font-bold text-blue-800 mb-4">
                  Selling: {selectedDrug.name} ({selectedDrug.brand})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={selectedDrug.quantity}
                        value={quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setQuantity(value);
                          setErrors({});
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.quantity ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <div className="absolute right-3 top-2 text-gray-400">
                        units
                      </div>
                    </div>
                    {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedDrug.quantity} units available
                    </p>
                  </div>
                  
                  {saleDetails && (
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <h3 className="font-medium text-blue-800 mb-2">Sale Summary</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-600">Unit Cost:</div>
                        <div className="font-medium">
                          ${saleDetails.costPrice.toFixed(2)}
                        </div>
                        
                        <div className="text-gray-600">Markup:</div>
                        <div className="font-medium">
                          {selectedDrug.markup}%
                        </div>
                        
                        <div className="text-gray-600">Selling Price:</div>
                        <div className="font-medium text-green-600">
                          ${saleDetails.sellingPricePerUnit.toFixed(2)}
                        </div>
                        
                        <div className="text-gray-600">Quantity:</div>
                        <div className="font-medium">
                          {quantity}
                        </div>
                        
                        <div className="text-gray-600 font-semibold">Total Sale:</div>
                        <div className="font-bold text-lg">
                          ${saleDetails.totalSellingPrice.toFixed(2)}
                        </div>
                        
                        <div className="text-gray-600 font-semibold">Profit:</div>
                        <div className="font-bold text-green-600">
                          ${saleDetails.profit.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
        
        {/* Fixed button footer */}
        <div className="border-t border-gray-200 p-4 bg-white sticky bottom-0">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedDrug}
              className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center ${
                selectedDrug 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              onClick={handleSubmit}
            >
              <FaCheck className="mr-2" />
              Complete Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesForm;