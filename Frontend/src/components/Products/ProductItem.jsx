import React, { useState } from 'react';
import { FaEdit, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const ProductItem = ({ product, onEdit }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    switch (product.status) {
      case 'In Stock':
        return 'bg-green-100 text-green-800';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'Sold Out':
        return 'bg-red-100 text-red-800';
      case 'Expired':
        return 'bg-gray-200 text-red-900';
      default:
        return 'bg-blue-100  text-blue-800';
    }
  };

  const getExpiryStatus = () => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-500' };
    } else if (diffDays < 30) {
      return { text: `Expires in ${diffDays} days`, color: 'text-yellow-500' };
    } else {
      return {
        text: expiryDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        color: 'text-gray-500'
      };
    }
  };

  const expiryStatus = getExpiryStatus();
  const sellingPrice = product.unitPrice * (1 + product.markup / 100);

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold">{product.name.charAt(0)}</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{product.name}</div>
              <div className="text-sm text-gray-500">{product.brand}</div>
            </div>
          </div>
        </td>
        <td className="text-sm font-medium text-gray-900">
          {product.category}
          <div className="text-sm font-extralight text-gray-500">{product.batchNo}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className={`text-lg font-bold ${product.quantity <= 5 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {product.quantity}
          </div>
          <div className="flex gap-2 mt-1">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Store: {product.inventory?.store ?? 0}
            </span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Dispensary: {product.inventory?.dispensary ?? 0}
            </span>
          </div>
          <div className={`text-xs mt-1 ${expiryStatus.color}`}>
            {expiryStatus.text}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">${product.unitPrice.toFixed(2)}</div>
          <div className="text-xs text-green-600">${sellingPrice.toFixed(2)} sale</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor()}`}>
            {product.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-2">
          <button
            onClick={() => onEdit(product)}
            className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
            title="Edit product"
          >
            <FaEdit className="text-lg" />
          </button>
          <button
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Delete product"
          >
            <FaTrash className="text-lg" />
          </button>
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="ml-2 text-gray-500 hover:text-gray-900"
            title={showDetails ? "Hide details" : "Show more"}
          >
            {showDetails ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </td>
      </tr>
      {showDetails && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-6 py-4 transition-all duration-300 animate-fade-in-down">
            <div className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-8">
              <div><strong>Distributor:</strong> {product.distributor?.name}</div>
              <div><strong>Contact:</strong> {product.distributor?.contact}</div>
              <div><strong>Dosage Form:</strong> {product.DosageForms}</div>
              <div><strong>Category:</strong> {product.category}</div>
              <div><strong>Patient Name:</strong> {product.patientName || 'N/A'}</div>
              <div><strong>Store:</strong> {product.inventory?.store}</div>
              <div><strong>Dispensary:</strong> {product.inventory?.dispensary}</div>
              <div><strong>Store Threshold:</strong> {product.inventory?.storeThreshold}</div>
              <div><strong>Dispensary Threshold:</strong> {product.inventory?.dispensaryThreshold}</div>
              <div><strong>Created At:</strong> {new Date(product.createdAt).toLocaleString()}</div>
              <div><strong>Updated At:</strong> {new Date(product.updatedAt).toLocaleString()}</div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default ProductItem;