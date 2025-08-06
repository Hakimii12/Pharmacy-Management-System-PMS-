import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaCalculator } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import Api from "../data/API.json"
import { fetchCategories,getCategories  } from '../data/products';
const ProductForm = ({ product, onClose, onSuccess ,fetchProducts}) => {
  const ApiLink=Api.link
  // State initialization with product data if available
  const [productCategories, setProductCategories] = useState([])
  const [name, setName] = useState(product?.name || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [unitPrice, setUnitPrice] = useState(product?.unitPrice || '');
  const [quantity, setQuantity] = useState(product?.quantity || '');
  const [expiryDate, setExpiryDate] = useState(
    product?.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : ''
  );
  const [batchNumber, setBatchNumber] = useState(product?.batchNo || '');
  const [markup, setMarkup] = useState(product?.markup || '');
  const [category, setCategory] = useState(product?.category || '');
  const [dosageForm, setDosageForm] = useState(product?.DosageForms || '');
  const [distributorName, setDistributorName] = useState(product?.distributor?.name || '');
  const [distributorContact, setDistributorContact] = useState(product?.distributor?.contact || '');
  const [errors, setErrors] = useState({});
  const [isSubmitting,setisSubmitting] = useState(false);
  const [productType, setProductType] = useState(product?.type || '');
  const [storeThreshold, setStoreThreshold] = useState(product?.storeThreshold || 10);
  const [dispensaryThreshold, setDispensaryThreshold] = useState(product?.dispensaryThreshold || 10);
  const [unit, setUnit] = useState(product?.unit || ''); // Add this line with other useState hooks

  const categories = productCategories
  const dosageFormsOptions = [
    { value: 'tablet', label: 'Tablet' },
    { value: 'syrup', label: 'Syrup' },
    { value: 'injection', label: 'Injection' },
    { value: 'ointment', label: 'Ointment' }
  ];
  useEffect(() => {
    const loadCategories = async () => {
      await fetchCategories();
      setProductCategories(getCategories());
    };
    loadCategories();
    fetchProducts();
  }, []);
  useEffect(() => {
    // Reset form when switching between create and edit
    if (product) {
      setName(product.name || '');
      setBrand(product.brand || '');
      setUnitPrice(product.unitPrice || '');
      setQuantity(product.quantity || '');
      setExpiryDate(
        product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : ''
      );
      setBatchNumber(product.batchNo || '');
      setMarkup(product.markup || '');
      setCategory(product.category || '');
      setDosageForm(product.DosageForms || '');
      setDistributorName(product.distributor?.name || '');
      setDistributorContact(product.distributor?.contact || '');
      setProductType(product.type || '');
      setStoreThreshold(
        product.inventory.storeThreshold !== undefined && product.inventory.storeThreshold !== null
          ? String(product.inventory.storeThreshold)
          : '10'
      );
      setDispensaryThreshold(
        product.inventory.dispensaryThreshold !== undefined && product.inventory.dispensaryThreshold !== null
          ? String(product.inventory.dispensaryThreshold)
          : '10'
      );
      setUnit(product.unit || ''); // Add this line
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setisSubmitting(true); // Start loading

    const distributor = {
      name: distributorName,
      contact: distributorContact
    };

    const data = {
      name,
      brand,
      unitPrice: parseFloat(unitPrice),
      quantity: parseInt(quantity),
      expiryDate,
      batchNo: batchNumber,
      markup: parseFloat(markup),
      category,
      DosageForms: dosageForm,
      distributor,
      type: category !== "medicine" ? productType : undefined,
      storeThreshold: parseInt(storeThreshold),
      dispensaryThreshold: parseInt(dispensaryThreshold),
      ...(category === "medicine" && unit ? { unit } : {}), // Add unit if medicine
    };

    try {
      if (product) {
        // Update existing product
        const response = await axios.put(
          `${ApiLink}/api/product/update/${product._id}`,
          data,
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
          }
        );
        fetchProducts();
        toast.success(response.data.message || 'Product updated successfully');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        // Create new product
        const response = await axios.post(
          `${ApiLink}/api/product/CreateProducts`,
          data,
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
          }
        );
        setDosageForm('')
        setBatchNumber('')
        setExpiryDate('')
        setQuantity('')
        setUnitPrice('')
        setBrand('')
        setName('')
        fetchProducts()
        toast.success(response.data.message || 'Product created successfully');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setisSubmitting(false); // End loading
    }
  };

  const sellingPrice = unitPrice 
    ? (parseFloat(unitPrice) * (1 + parseFloat(markup || 0) / 100)).toFixed(2)
    : '0.00';

  const totalValue = unitPrice && quantity
    ? (parseFloat(unitPrice) * parseInt(quantity)).toFixed(2)
    : '0.00';

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
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>

            {category && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                {category === "medicine" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Brand *
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.brand ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter brand name"
                      />
                      {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit *
                      </label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                        placeholder="e.g. tablet, ml, capsule"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (ETB) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.unitPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter unit price"
                    required
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
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.quantity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter quantity"
                    required
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.expiryDate && <p className="mt-1 text-sm text-red-500">{errors.expiryDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.batchNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter batch number"
                    required
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
                    value={markup}
                    onChange={(e) => setMarkup(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.markup ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter markup percentage"
                    required
                  />
                  {errors.markup && <p className="mt-1 text-sm text-red-500">{errors.markup}</p>}
                </div>

                {category === "medicine" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosage Form *
                    </label>
                    <select
                      value={dosageForm}
                      onChange={(e) => setDosageForm(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.dosageForm ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select dosage form</option>
                      {dosageFormsOptions.map(form => (
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

                <div className="space-y-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distributor Name *
                    </label>
                    <input
                      type="text"
                      value={distributorName}
                      onChange={(e) => setDistributorName(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.distributorName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter distributor name"
                      required
                    />
                    {errors.distributorName && (
                      <p className="mt-1 text-sm text-red-500">{errors.distributorName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distributor Contact *
                    </label>
                    <input
                      type="tel"
                      value={distributorContact}
                      onChange={(e) => setDistributorContact(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.distributorContact ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter contact information"
                      required
                    />
                    {errors.distributorContact && (
                      <p className="mt-1 text-sm text-red-500">{errors.distributorContact}</p>
                    )}
                  </div>
                </div>
                {category !== "medicine" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type *
                    </label>
                    <input
                      type="text"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                      placeholder="Enter product type"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={storeThreshold}
                    onChange={(e) => setStoreThreshold(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                    placeholder="Enter store threshold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dispensary Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dispensaryThreshold}
                    onChange={(e) => setDispensaryThreshold(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                    placeholder="Enter dispensary threshold"
                    required
                  />
                </div>
              </div>
              
            )}

            {category && (
              <>
                <div className="mt-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-medium text-blue-800 mb-2">Product Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-600">Selling Price:</div>
                      <div className="font-medium text-green-600">
                        {sellingPrice} <span className="text-xs">ETB</span>
                      </div>
                      <div className="text-gray-600">Total Value:</div>
                      <div className="font-medium">
                        {totalValue} <span className="text-xs">ETB</span>
                      </div>
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
                      disabled={isSubmitting}
                    >
                      <FaSave className="mr-2" />
                      {isSubmitting
                        ? (product ? 'Updating...' : 'Adding...')
                        : (product ? 'Update Product' : 'Add Product')}
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