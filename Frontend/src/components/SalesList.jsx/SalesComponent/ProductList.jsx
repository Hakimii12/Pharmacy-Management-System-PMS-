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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price & Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedProducts.map(product => (
            <tr key={product._id}>
              {/* Product: Name, Brand, Quantity */}
              <td className="px-6 py-4 align-top max-w-xs">
                <span
                  className="font-semibold block truncate"
                  title={product.name}
                >
                  {product.name}
                </span>
                <div className="text-xs text-gray-500">
                  Brand: <span className="font-medium">{product.brand}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Qty: {product.inventory?.dispensary ?? "N/A"}
                </div>
              </td>
              {/* Details: Category, Dosage Form, Type */}
              <td className="px-6 py-4 whitespace-nowrap align-top">
                <span className="font-semibold">{product.category}</span>
                <div className="text-xs text-gray-500">
                  Dosage: {product.DosageForms || "_"}
                </div>
                <div className="text-xs text-gray-500">
                  Type: {product.type || "_"}
                </div>
              </td>
              {/* Price & Action */}
              <td className="px-6 py-4 whitespace-nowrap align-top">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-green-600">{product.sellingPrice.toFixed(2)} <span className="text-xs">ETB</span></span>
                  <button
                    onClick={(e) => {
                      onAdd(product);
                      e.currentTarget.classList.add("animate-bounce");
                      setTimeout(() => {
                        e.currentTarget.classList.remove("animate-bounce");
                      }, 500);
                    }}
                    className="text-blue-600 hover:text-blue-900 transition-transform active:scale-90 text-xl ml-2"
                    title="Add to Purchase Order"
                  >
                    <FaShoppingCart />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-4 space-x-2">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ProductList;