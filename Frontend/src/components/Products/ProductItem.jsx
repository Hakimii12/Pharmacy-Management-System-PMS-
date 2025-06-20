import React from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { products } from '../../data/products';
const ProductItem = () => {
  const getStatusColor = () => {
    switch ("In Stock") {
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

  // const getExpiryStatus = () => {
  //   const expiryDate = new Date(products.expirationDate);
  //   const today = new Date();
  //   const diffTime = expiryDate.getTime() - today.getTime();
  //   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
  //   if (diffDays < 0) {
  //     return { text: 'Expired', color: 'text-red-500' };
  //   } else if (diffDays < 30) {
  //     return { text: `Expires in ${diffDays} days`, color: 'text-yellow-500' };
  //   } else {
  //     return { text: new Date(products.expirationDate).toLocaleDateString(), color: 'text-gray-500' };
  //   }
  // };

  // const expiryStatus = getExpiryStatus();

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            okm
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">Paracetamol</div>
            <div className="text-sm text-gray-500">Panadol</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        Pain Relief
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">120</div>
        <div className={`text-xs text-red-800`}>expired</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        5.99
        <div className="text-xs text-gray-500">7.55 sale</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor()}`}>
          In Stock
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button 
          onClick={() => onEdit(products)}
          className="text-blue-600 hover:text-blue-900 mr-3"
        >
          <FaEdit />
        </button>
        <button className="text-red-600 hover:text-red-900">
          <FaTrash />
        </button>
      </td>
    </tr>
  );
};

export default ProductItem;