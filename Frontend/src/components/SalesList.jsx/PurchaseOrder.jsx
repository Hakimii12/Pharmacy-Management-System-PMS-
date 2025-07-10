// src/components/SalesList.jsx/PurchaseOrder.jsx (Pharmacist Page)
import React, { useEffect, useState } from 'react';
import ProductList from './SalesComponent/ProductList';
import OrderCart from './SalesComponent/OrderCart';
import axios from 'axios';
import { toast } from 'react-toastify';
  const PurchaseOrder = () => {
const [products,setProdcuts]=useState([])
async function FetchItems(){
  const response = await axios.get("http://localhost:5000/api/product/dispensaryProducts",{
      withCredentials:true
    }).then((res)=>{
      setProdcuts(res.data.products)
    })
}
useEffect(()=>{
  FetchItems()
},[])
  const [filters, setFilters] = useState({
    name: '',
    brand: '',
    category: '',
    dosageForm: ''
  });
  
  const [orderItems, setOrderItems] = useState([]);
  const [patientName, setPatientName] = useState('');
  console.log(orderItems)

  const filteredProducts = products.filter(product => {
    return (
      product.name.toLowerCase().includes(filters.name.toLowerCase()) &&
      product.brand.toLowerCase().includes(filters.brand.toLowerCase()) &&
      (filters.category ? product.category === filters.category : true) &&
      (filters.dosageForm ? product.dosageForm === filters.dosageForm : true)
    );
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
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

 const [isSubmitting, setIsSubmitting] = useState(false);

// Modify handleSubmitOrder function
const handleSubmitOrder = async () => {
  if (!patientName.trim() || orderItems.length === 0 || isSubmitting) return;
  
  setIsSubmitting(true);
  
  try {
    // Transform order items to required format
    const payload = {
      patientName:patientName,
      items: orderItems.map(item => ({
        quantity: item.quantity.toString(), // Convert to string as per requirement
        productId: item._id,

      }))
    };

    const response = await axios.post(
      "http://localhost:5000/api/sales/sales",
      payload,
      { withCredentials: true }
    );
     console.log(response)
    // Reset form on success
    setOrderItems([]);
    setPatientName('');
    toast.success(`Order sent to cashier for ${patientName}`)
  } catch (error) {
    toast.error(error.response.data.error)
    setIsSubmitting(false)  
;}
};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Create Purchase Order</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Product Search</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={filters.name}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={filters.brand}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">All</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Supplement">Supplement</option>
                  <option value="Sanitary">Sanitary</option>
                  <option value="Cosmetic">Cosmetic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Dosage Form</label>
                <select
                  name="dosageForm"
                  value={filters.dosageForm}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">All</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Liquid">Liquid</option>
                  <option value="Cream">Cream</option>
                </select>
              </div>
            </div>
            
            <ProductList 
              products={filteredProducts} 
              onAdd={addToOrder} 
            />
          </div>
        </div>
        
        <div>
          <div className="bg-white p-4 rounded-lg shadow sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Current Order</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            
            <OrderCart 
              items={orderItems} 
              onUpdate={updateQuantity} 
              onRemove={removeItem} 
            />
            
            <div className="mt-4 flex justify-between items-center">
              <span className="font-bold">
                Total: ${orderItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0).toFixed(2)}
              </span>
              <button
            onClick={()=>{handleSubmitOrder()}}
            disabled={!patientName.trim() || orderItems.length === 0 || isSubmitting}
            className={`px-4 py-2 rounded ${
              patientName.trim() && orderItems.length > 0 && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Sending...' : 'Send to Cashier'}
          </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrder;