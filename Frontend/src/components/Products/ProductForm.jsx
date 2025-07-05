import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaExclamationTriangle, FaCalculator } from 'react-icons/fa';
import axios from 'axios'
import {toast} from "react-toastify"
const ProductForm = ({ product,onClose }) => {
  const [name,setName] = useState('');
  const [brand,setBrand] = useState('');
  const [unitPrice , setUnitPrice] = useState('');
  const [quantity , setQuantity] = useState('');
  const [expiryDate , setExpiryDate] = useState('');
  const [batchNumber , setBatchNumber] = useState('');
  const [markup , setMarkup] = useState('');
  const [category,setCategory] = useState('');
  const [dosageForm, setDosageForm] = useState('');
  const [distributorName, setDistributorName] = useState('');
  const [distributorContact, setDistributorContact] =useState('')
  const [errors, setErrors] = useState({});
  const [isExpired, setIsExpired] = useState(false);
  const categories =["medicine","cosmetic","Supplements","Medical Equipment","Other",]
  const handleSubmit = (e) => {
    e.preventDefault();
    const distributor={
      name:distributorName,
      contact:distributorContact
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('brand', brand);
    formData.append('unitPrice', unitPrice);
    formData.append('quantity', quantity);
    formData.append('expiryDate', expiryDate);
    formData.append('batchNo', batchNumber);
    formData.append('markup', markup);
    formData.append('category', category);
    formData.append('DosageForms', dosageForm);
    formData.append('distributor', JSON.stringify(distributor));
    try {
      const data = {
        name,
        brand,
        unitPrice,
        quantity,
        expiryDate,
        batchNo: batchNumber,
        markup,
        category,
        DosageForms: dosageForm,
        distributor: {
          name: distributorName,
          contact: distributorContact
        }
      };

      axios.post("http://localhost:5000/api/product/CreateProducts", data, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      })
        .then(response => {
          if(response.data.message){
                toast.success(response.data.message)
            }
        })
        .catch(error => {
          console.error('Error creating product:', error);
        });
      setName('');
      setBrand('');
      setBatchNumber('');
      setUnitPrice('');
      setExpiryDate('');
      setDosageForm('');
      setQuantity('');
    } catch (error) {
      setErrors('Error sending data')
    }
  };

 const sellingPrice = unitPrice 
  ? (parseFloat(unitPrice) * (1 + parseInt(markup || 0) / 100)).toFixed(2)
  : '0.00';

  const totalValue = unitPrice && quantity
    ? (parseFloat(unitPrice) * parseInt(quantity)).toFixed(2)
    : '0.00';
  const dosageForms = [
    { value: 'tablet', label: 'Tablet' },
    { value: 'syrup', label: 'Syrup' },
    { value: 'injection', label: 'Injection' },
    { value: 'ointment', label: 'Ointment' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
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
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6">
            {isExpired && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-2" />
                <span className="text-red-700">Warning: This product has expired!</span>
              </div>
            )}

            {/* Always show category selector first */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>

            {/* Only show the rest of the form if a category is selected */}
            {category && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* Only show Brand and Dosage Form if category is medicine */}
                {category === "medicine" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Brand *
                      </label>
                      <input
                        type="text"
                        name="brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.brand ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter brand name"
                      />
                      {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="unitPrice"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
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
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
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
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
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
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
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
                    value={markup}
                    onChange={(e) => setMarkup(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.markup ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter markup percentage"
                  />
                  {errors.markup && <p className="mt-1 text-sm text-red-500">{errors.markup}</p>}
                </div>

                {/* Only show Dosage Form if category is medicine */}
                {category === "medicine" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosage Form *
                    </label>
                    <select
                      name="dosageForm"
                      value={dosageForm}
                      onChange={(e) => setDosageForm(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.dosageForm ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select dosage form</option>
                      {dosageForms.map(form => (
                        <option key={form.value} value={form.value}>
                          {form.label}
                        </option>
                      ))}
                    </select>
                    {errors.dosageForm && (
                      <p className="mt-1 text-sm text-red-500">{errors.dosageForm}</p>
                    )}
                  </div>
                )}

                {/* Distributor fields */}
                <div className="space-y-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distributor Name *
                    </label>
                    <input
                      type="text"
                      name="distributor.name"
                      onChange={(e) => setDistributorName(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['distributor.name'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter distributor name"
                    />
                    {errors['distributor.name'] && (
                      <p className="mt-1 text-sm text-red-500">{errors['distributor.name']}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distributor Contact *
                    </label>
                    <input
                      type="tel"
                      name="distributor.contact"
                      onChange={(e) => setDistributorContact(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['distributor.contact'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter contact information"
                    />
                    {errors['distributor.contact'] && (
                      <p className="mt-1 text-sm text-red-500">{errors['distributor.contact']}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Product Summary and Footer only if category is selected */}
            {category && (
              <>
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
                      {isExpired && (
                        <>
                          <div className="text-gray-600">Expiry Status:</div>
                          <div className="font-medium text-red-600">Expired</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200">
                  <div className="flex justify-end space-x-3">
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
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;