import React from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';

const ProductItem = ({ product, onEdit }) => {
  const getStatusColor = () => {
    switch (product.status) {
      case 'In Stock':
        return 'bg-green-100 text-green-800';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'Sold Out':
        return 'bg-red-100 text-red-800';
      case 'Expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getExpiryStatus = () => {
    const expiryDate = new Date(product.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    
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
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {product.category}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${product.quantity <= 5 ? 'text-yellow-600 font-medium' : 'text-gray-900'}`}>
          {product.quantity}
        </div>
        <div className={`text-xs ${expiryStatus.color}`}>
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
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
      </td>
    </tr>
  );
};

export default ProductItem;