import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCheck, FaSearch, FaFilter, FaSortAmountDown, FaAngleLeft, FaAngleRight, FaTrash } from 'react-icons/fa';
import { products } from '../../data/products';

const SalesForm = ({ onSave, onClose }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredproducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredproducts.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortBy]);

  // Get unique categories for filter dropdown
  const categories = ['All', ...new Set(products.map(drug => drug.category))];

  // Scroll to bottom when new item is added
  useEffect(() => {
    if (selectedItems.length > 0 && formRef.current) {
      formRef.current.scrollTo({
        top: formRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [selectedItems]);

  const handleAddItem = (drug) => {
    // Check if already added
    const existingItem = selectedItems.find(item => item.drug.id === drug.id);
    
    if (existingItem) {
      // Update quantity if already added
      setSelectedItems(prev => 
        prev.map(item => 
          item.drug.id === drug.id 
            ? { ...item, quantity: Math.min(item.quantity + 1, drug.quantity) } 
            : item
        )
      );
    } else {
      // Add new item
      setSelectedItems(prev => [
        ...prev,
        {
          drug,
          quantity: 1,
          costPrice: drug.unitPrice,
          sellingPricePerUnit: drug.unitPrice * (1 + drug.markup / 100),
        }
      ]);
    }
  };

  const handleQuantityChange = (id, value) => {
    const parsedValue = parseInt(value) || 1;
    
    setSelectedItems(prev => 
      prev.map(item => {
        if (item.drug.id === id) {
          return { 
            ...item, 
            quantity: Math.max(1, Math.min(parsedValue, item.drug.quantity))
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(prev => prev.filter(item => item.drug.id !== id));
  };

  const calculateSaleDetails = () => {
    let totalSale = 0;
    let totalProfit = 0;
    
    const detailedItems = selectedItems.map(item => {
      const sellingPrice = item.sellingPricePerUnit * item.quantity;
      const profit = (item.sellingPricePerUnit - item.costPrice) * item.quantity;
      
      totalSale += sellingPrice;
      totalProfit += profit;
      
      return {
        ...item,
        totalSellingPrice: sellingPrice,
        profit
      };
    });
    
    return {
      detailedItems,
      totalSale,
      totalProfit
    };
  };

  const { detailedItems, totalSale, totalProfit } = calculateSaleDetails();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate selections
    const newErrors = {};
    
    if (selectedItems.length === 0) {
      newErrors.general = 'Please select at least one product';
    }
    
    selectedItems.forEach(item => {
      if (item.quantity > item.drug.quantity) {
        newErrors[`quantity-${item.drug.id}`] = `Only ${item.drug.quantity} units available`;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Create sale records
    const saleRecords = detailedItems.map(item => ({
      drugId: item.drug.id,
      drugName: item.drug.name,
      brand: item.drug.brand,
      quantitySold: item.quantity,
      unitCostPrice: item.costPrice,
      markupPercentage: item.drug.markup,
      sellingPricePerUnit: item.sellingPricePerUnit,
      totalSellingPrice: item.totalSellingPrice,
      profit: item.profit,
      soldOut: (item.drug.quantity - item.quantity) === 0
    }));
    
    onSave(saleRecords);
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
              {errors.general && (
                <p className="text-red-500 text-center mb-4">{errors.general}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentItems.length > 0 ? (
                  currentItems.map(drug => (
                    <div 
                      key={drug.id}
                      onClick={() => handleAddItem(drug)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedItems.some(item => item.drug.id === drug.id)
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-100' 
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
              
              {/* Pagination Controls */}
              {filteredproducts.length > itemsPerPage && (
                <div className="flex items-center justify-center mt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`flex items-center px-3 py-1 rounded-l-md ${
                      currentPage === 1 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FaAngleLeft className="mr-1" /> Prev
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 mx-0.5 ${
                        currentPage === page
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`flex items-center px-3 py-1 rounded-r-md ${
                      currentPage === totalPages 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Next <FaAngleRight className="ml-1" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Selected Items Section */}
            {selectedItems.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
                <h3 className="text-lg font-bold text-blue-800 mb-4">
                  Selected Products for Sale
                </h3>
                
                {detailedItems.map((item) => (
                  <div key={item.drug.id} className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900">{item.drug.name} ({item.drug.brand})</h4>
                        <p className="text-sm text-gray-500">{item.drug.category}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(item.drug.id)}
                        className="text-gray-500 hover:text-red-500 p-1"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max={item.drug.quantity}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.drug.id, e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`quantity-${item.drug.id}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          <div className="absolute right-3 top-2 text-gray-400">
                            units
                          </div>
                        </div>
                        {errors[`quantity-${item.drug.id}`] && (
                          <p className="mt-1 text-sm text-red-500">{errors[`quantity-${item.drug.id}`]}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">
                          {item.drug.quantity} units available
                        </p>
                      </div>
                      
                      <div>
                        <div className="text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-gray-600">Unit Cost:</div>
                            <div className="font-medium">${item.costPrice.toFixed(2)}</div>
                            
                            <div className="text-gray-600">Markup:</div>
                            <div className="font-medium">{item.drug.markup}%</div>
                            
                            <div className="text-gray-600">Selling Price:</div>
                            <div className="font-medium text-green-600">${item.sellingPricePerUnit.toFixed(2)}</div>
                            
                            <div className="text-gray-600">Quantity:</div>
                            <div className="font-medium">{item.quantity}</div>
                            
                            <div className="text-gray-600 font-semibold">Total:</div>
                            <div className="font-bold text-lg">
                              ${item.totalSellingPrice.toFixed(2)}
                            </div>
                            
                            <div className="text-gray-600 font-semibold">Profit:</div>
                            <div className="font-bold text-green-600">
                              ${item.profit.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Grand Total */}
                <div className="mt-6 pt-4 border-t border-blue-200">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-800">
                        Grand Total Sale: <span className="text-green-600">${totalSale.toFixed(2)}</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-800">
                        Total Profit: <span className="text-green-600">${totalProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
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
              disabled={selectedItems.length === 0}
              className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center ${
                selectedItems.length > 0 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              onClick={handleSubmit}
            >
              <FaCheck className="mr-2" />
              Complete Sale ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesForm;