import React, { useState } from 'react';
import { FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';

const ProductItem = ({ product, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState({ ...product });

  const getStatusColor = (status) => {
    switch (status) {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedProduct(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'salePrice' 
        ? parseFloat(value) 
        : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onEdit(editedProduct);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-6 py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              P
            </div>
            <div className="ml-4 space-y-2">
              <input
                name="name"
                value={editedProduct.name}
                onChange={handleChange}
                className="w-full px-2 py-1 border rounded text-sm"
              />
              <input
                name="brand"
                value={editedProduct.brand}
                onChange={handleChange}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <input
            name="category"
            value={editedProduct.category}
            onChange={handleChange}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </td>
        <td className="px-6 py-4 space-y-2">
          <input
            name="stock"
            type="number"
            value={editedProduct.stock}
            onChange={handleChange}
            className="w-full px-2 py-1 border rounded text-sm"
          />
          <input
            name="expirationDate"
            type="date"
            value={editedProduct.expirationDate}
            onChange={handleChange}
            className="w-full px-2 py-1 border rounded text-xs"
          />
        </td>
        <td className="px-6 py-4 space-y-2">
          <input
            name="price"
            type="number"
            step="0.01"
            value={editedProduct.price}
            onChange={handleChange}
            className="w-full px-2 py-1 border rounded text-sm"
          />
          <input
            name="salePrice"
            type="number"
            step="0.01"
            value={editedProduct.salePrice}
            onChange={handleChange}
            className="w-full px-2 py-1 border rounded text-xs"
            placeholder="Sale price"
          />
        </td>
        <td className="px-6 py-4">
          <select
            name="status"
            value={editedProduct.status}
            onChange={handleChange}
            className={`w-full px-2 py-1 border rounded text-sm ${getStatusColor(editedProduct.status)}`}
          >
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Sold Out">Sold Out</option>
            <option value="Expired">Expired</option>
          </select>
        </td>
        <td className="px-6 py-4 space-x-2">
          <button
            onClick={handleSubmit}
            className="text-green-600 hover:text-green-800"
          >
            <FaSave />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaTimes />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            P
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
          onClick={() => setIsEditing(true)}
          className="text-blue-600 hover:text-blue-900 mr-3"
        >
          <FaEdit />
        </button>
        <button 
          onClick={() => onDelete(product.id)}
          className="text-red-600 hover:text-red-900"
        >
          <FaTrash />
        </button>
      </td>
    </tr>
  );
};

export default ProductItem;