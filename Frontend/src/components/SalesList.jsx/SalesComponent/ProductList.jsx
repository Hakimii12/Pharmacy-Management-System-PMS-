// src/components/SalesList.jsx/components/ProductList.jsx
import React from 'react';
import { FaShoppingCart } from 'react-icons/fa';
const ProductList = ({ products, onAdd }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock In Dispensary</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map(product => (
            <tr key={product._id}>
              <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{product.brand}</td>
              <td className="px-6 py-4 whitespace-nowrap">{product.category}</td>
              <td className="px-6 py-4 whitespace-nowrap">{product.DosageForms || "➖"}</td>
              <td className="px-6 py-4 whitespace-nowrap">${product.sellingPrice.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{product.inventory.dispensary}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                      onClick={(e) => {
                        onAdd(product);
                        e.currentTarget.classList.add("animate-bounce");
                        setTimeout(() => {
                          e.currentTarget.classList.remove("animate-bounce");
                        }, 500);
                      }}
                      className="text-blue-600 hover:text-blue-900 transition-transform active:scale-90 text-xl"
                    >
                      <FaShoppingCart />
                    </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;