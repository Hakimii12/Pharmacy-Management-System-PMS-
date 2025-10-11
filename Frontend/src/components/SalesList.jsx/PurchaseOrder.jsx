// PurchaseOrder.jsx
// src/components/SalesList.jsx/PurchaseOrder.jsx (Pharmacist Page)
import React, { useEffect, useState } from 'react';
import ProductList from './SalesComponent/ProductList';
import OrderCart from './SalesComponent/OrderCart';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../Loading/Loading';
import Api from "../../data/API.json";
import { fetchCategories, getCategories, GetDosageForm, fetchDosageForm } from '../../data/products';
import { FiRefreshCw, FiFilter, FiX, FiSearch } from 'react-icons/fi';

const PurchaseOrder = () => {
  const ApiLink = Api.link
  const [products, setProdcuts] = useState([])
  const [loading, setLoading] = useState(false)
  const [productCategories, setProductCategories] = useState([]);
  const [fetchDosageForms, setFetchDosageForms] = useState([]);
  
  // Credit sale states
  const [saleType, setSaleType] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showCreditFields, setShowCreditFields] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      await fetchCategories();
      setProductCategories(getCategories());
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      await fetchDosageForm();
      setFetchDosageForms(GetDosageForm());
    };
    loadCategories();
  }, []);

  async function FetchItems(){
    setLoading(true)
    try {
      const response = await axios.get(`${ApiLink}/api/product/dispensaryProductsToSell`,{
        withCredentials:true
      }).then((res)=>{
        setProdcuts(res.data.products)
        setLoading(false)
        toast.success('Products refreshed successfully');
      })
    } catch (error) {
      setLoading(false)
      toast.error('Failed to refresh products');
    }
    finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    FetchItems();
  },[])

  const [filters, setFilters] = useState({
    search: '', // Combined search for name and brand
    category: '',
    dosageForm: '',
    type: ''
  });

  const [orderItems, setOrderItems] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = products.filter(product => {
    const searchTerm = filters.search.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      (product.name || '').toLowerCase().includes(searchTerm) ||
      (product.brand || '').toLowerCase().includes(searchTerm);
    
    const matchesCategory = filters.category === '' || 
      (product.category || '').toLowerCase() === filters.category.toLowerCase();
    
    const matchesDosageForm = filters.dosageForm === '' || 
      (product.DosageForms || '').toLowerCase() === filters.dosageForm.toLowerCase();
    
    const matchesType = filters.type === '' || 
      (product.type || '').toLowerCase().includes(filters.type.toLowerCase());

    return matchesSearch && matchesCategory && matchesDosageForm && matchesType;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      dosageForm: '',
      type: ''
    });
  };

  const addToOrder = (product) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) return;
    setOrderItems(prev => 
      prev.map(item => item._id === id ? { ...item, quantity } : item)
    );
  };

  const removeItem = (id) => {
    setOrderItems(prev => prev.filter(item => item._id !== id));
  };

  // Calculate order total
  const orderTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
  
  // Handle sale type change
  const handleSaleTypeChange = (type) => {
    setSaleType(type);
    setShowCreditFields(type === 'credit');
    if (type === 'cash') {
      setAmountPaid(orderTotal);
    } else {
      setAmountPaid(0);
      // Set default due date to 30 days from now for credit sales
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      setDueDate(defaultDueDate.toISOString().split('T')[0]);
    }
  };

  // Handle amount paid change with validation
  const handleAmountPaidChange = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= orderTotal) {
      setAmountPaid(numAmount);
    }
  };

  // Update amount paid when order total changes for cash sales
  useEffect(() => {
    if (saleType === 'cash') {
      setAmountPaid(orderTotal);
    }
  }, [orderTotal, saleType]);

  const handleSubmitOrder = async () => {
    // Validate based on sale type
    if (orderItems.length === 0 || isSubmitting) return;
    
    // For credit sales, patient name and customer phone are required
    if (saleType === 'credit') {
      if (!patientName.trim()) {
        toast.error('Patient name is required for credit sales');
        return;
      }
      if (!customerPhone.trim()) {
        toast.error('Customer phone number is required for credit sales');
        return;
      }
      if (amountPaid > orderTotal) {
        toast.error('Amount paid cannot exceed order total');
        return;
      }
    }
    
    // For cash sales, use default name if not provided
    const patientNameToSend = saleType === 'cash' && !patientName.trim() 
      ? 'Walk-in Customer' 
      : patientName;
    
    setIsSubmitting(true);
    
    try {
      let response;
      
      if (saleType === 'credit') {
        // Use credit sale endpoint
        response = await axios.post(
          `${ApiLink}/api/sales/create-credit-sale`,
          {
            patientName: patientNameToSend,
            items: orderItems.map(item => ({
              quantity: item.quantity.toString(),
              productId: item._id,
            })),
            saleType: saleType,
            amountPaid: amountPaid,
            customerPhone: customerPhone,
            customerAddress: customerAddress,
            dueDate: dueDate
          },
          { withCredentials: true }
        );
      } else {
        // Use existing cash sale endpoint
        response = await axios.post(
          `${ApiLink}/api/sales/prepareAndSaveSale`,
          {
            patientName: patientNameToSend,
            items: orderItems.map(item => ({
              quantity: item.quantity.toString(),
              productId: item._id,
            })),
          },
          { withCredentials: true }
        );
      }

      // Reset form on success
      setOrderItems([]);
      setPatientName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setSaleType('cash');
      setShowCreditFields(false);
      setAmountPaid(0);
      
      const successMessage = saleType === 'credit' 
        ? `✅ Credit sale completed for ${patientNameToSend}. Remaining balance: ETB ${(orderTotal - amountPaid).toFixed(2)}`
        : `📋 Order sent to cashier for ${patientNameToSend}`;
      
      toast.success(successMessage);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Create Sale</h1>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <button
            onClick={clearFilters}
            className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
          >
            <FiX className="mr-1" />
            Clear Filters
          </button>
          <button
            onClick={FetchItems}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <FiFilter className="text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold">Product Search</h2>
            </div>
            
            {/* Combined Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by product name or brand..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Search will match both product names and brands
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage Form</label>
                <select
                  name="dosageForm"
                  value={filters.dosageForm}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Forms</option>
                  {fetchDosageForms.map(form => (
                    <option key={form._id} value={form.name}>{form.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <input
                  type="text"
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by type"
                />
              </div>
            </div>
            
            {loading ? <Loading/> : <ProductList 
              products={filteredProducts} 
              onAdd={addToOrder} 
            />}
          </div>
        </div>
        
        <div>
          <div className="bg-white p-4 rounded-lg shadow sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Current Order</h2>
            
            {/* Patient Information */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name {saleType === 'credit' && '*'}
                {saleType === 'cash' && (
                  <span className="text-gray-500 text-sm font-normal"> (Optional - defaults to "Walk-in Customer")</span>
                )}
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={saleType === 'cash' ? "Enter patient name (optional)" : "Enter patient name"}
              />
            </div>

            {/* Sale Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale Type</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="cash"
                    checked={saleType === 'cash'}
                    onChange={() => handleSaleTypeChange('cash')}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Cash Sale</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="credit"
                    checked={saleType === 'credit'}
                    onChange={() => handleSaleTypeChange('credit')}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Credit Sale</span>
                </label>
              </div>
            </div>

            {/* Credit Sale Fields */}
            {showCreditFields && (
              <div className="mb-4 space-y-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800">Credit Sale Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Address</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => handleAmountPaidChange(e.target.value)}
                    min="0"
                    max={orderTotal}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Partial payment amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave as 0 for full credit, or enter partial payment
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Amount Paid for Cash Sales */}
            {saleType === 'cash' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => handleAmountPaidChange(e.target.value)}
                  min="0"
                  max={orderTotal}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            
            <OrderCart 
              items={orderItems} 
              onUpdate={updateQuantity} 
              onRemove={removeItem} 
            />
            
            {/* Order Summary */}
            <div className="mt-4 space-y-2 bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="font-semibold">Order Total:</span>
                <span className="font-bold text-green-600">
                  {orderTotal.toFixed(2)} ETB
                </span>
              </div>
              
              {saleType === 'credit' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm">Amount Paid:</span>
                    <span className="text-sm">{amountPaid.toFixed(2)} ETB</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-semibold">Remaining Balance:</span>
                    <span className="font-bold text-red-600">
                      {(orderTotal - amountPaid).toFixed(2)} ETB
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={handleSubmitOrder}
              disabled={orderItems.length === 0 || isSubmitting || (saleType === 'credit' && !patientName.trim())}
              className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-all ${
                orderItems.length > 0 && !isSubmitting && (saleType === 'cash' || (saleType === 'credit' && patientName.trim()))
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting 
                ? 'Processing...' 
                : saleType === 'credit' 
                  ? '✅ Complete Credit Sale' 
                  : '📋 Send to Cashier'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrder;