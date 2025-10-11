// ProductList.jsx
// src/components/SalesList.jsx/components/ProductList.jsx
import React, { useState } from 'react';
import { FaShoppingCart } from 'react-icons/fa';

const PRODUCTS_PER_PAGE = 10;

const ProductList = ({ products, onAdd }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const startIdx = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts = products.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

  const handlePrev = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

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
    <div className="overflow-x-auto">
      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <p className="text-sm text-blue-700">
          Showing {paginatedProducts.length} of {products.length} products
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {paginatedProducts.map(product => (
          <div key={product._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between">
              {/* Product Info */}
              <div className="flex-1 mb-3 sm:mb-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div className="mb-2 sm:mb-0">
                    <h3 className="font-semibold text-gray-800 truncate" title={product.name}>
                      {product.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                        {product.brand}
                      </span>
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                        {product.category}
                      </span>
                      {product.DosageForms && (
                        <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                          {product.DosageForms}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="font-bold text-green-600 text-lg">
                      {product.sellingPrice.toFixed(2)} <span className="text-xs">ETB</span>
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Stock: <span className={`font-medium ${(product.inventory?.dispensary || 0) < 10 ? 'text-red-500' : 'text-green-500'}`}>
                        {product.inventory?.dispensary ?? "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Batch and Expiry Info */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">Batch:</span>
                    <span className="font-medium">
                      {product.batchNo || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">Expiry:</span>
                    <span className={`font-medium ${
                      isExpired(product.expiryDate) 
                        ? 'text-red-500' 
                        : isExpiringSoon(product.expiryDate) 
                          ? 'text-orange-500' 
                          : 'text-green-500'
                    }`}>
                      {formatDate(product.expiryDate)}
                      {isExpired(product.expiryDate) && ' (Expired)'}
                      {isExpiringSoon(product.expiryDate) && !isExpired(product.expiryDate) && ' (Soon)'}
                    </span>
                  </div>
                </div>
                
                {product.type && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Type: {product.type}</span>
                  </div>
                )}
              </div>

              {/* Add to Cart Button */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start">
                <button
                  onClick={(e) => {
                    onAdd(product);
                    e.currentTarget.classList.add("animate-bounce");
                    setTimeout(() => {
                      e.currentTarget.classList.remove("animate-bounce");
                    }, 500);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                  title="Add to Order"
                >
                  <FaShoppingCart className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination Controls */}
      {products.length > 0 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            Next
          </button>
        </div>
      )}
      
      {products.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No products found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;