import ProductItem from './ProductItem';
import ProductForm from './ProductForm';
import { FaPlus, FaSearch } from 'react-icons/fa';
import { products, productCategories } from '../../data/products';
import { useState } from 'react';
import { useEffect } from 'react';
import Loading from '../Loading/Loading';
import axios from 'axios';
import Api from "../../data/API.json"
const ProductList = () => {
  const ApiLink=Api.link
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [fetched,setFetched]=useState([])
  const [isLoading,setIsLoading]=useState(false)
  async function fetchProducts(){
    setIsLoading(true)
  try {
    const response = await axios.get(`${ApiLink}/api/product/allProducts`,{
      withCredentials:true
    });
    setFetched(response?.data?.products)
    setIsLoading(false)
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
    setIsLoading(false)
  }finally{
    setIsLoading(false)
  }
};
useEffect(()=>{
  fetchProducts()
},[])
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedProduct(null);
  };

  const filteredProducts = fetched.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || product.inventory.storeStatus === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Product Inventory</h2>
          <button
  onClick={() => setShowForm(true)}
  className="relative mt-10 md:w-10 w-5 flex items-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 active:scale-95 group overflow-hidden"
>
  {/* Ripple effect elements */}
  <span className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-active:opacity-10 group-active:animate-ripple"></span>
  
  {/* Button content */}
  <span className="relative flex items-center">
    <FaPlus className="mr-3 transition-transform duration-300 group-hover:rotate-90" />
  </span>
  
  {/* Pulsing dot for mobile */}
  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse sm:hidden"></span>
</button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search products..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {productCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Sold Out">Sold Out</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
        {isLoading ? (<Loading/>):<div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drug Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <ProductItem key={product._id} product={product} onEdit={handleEdit} fetchProducts={fetchProducts}/>
                
              ))}
            </tbody>
            
          </table>
        </div>}
        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No products found matching your criteria</p>
          </div>
        )}
      </div>
      
      {showForm && (
        <ProductForm product={selectedProduct} onClose={handleCloseForm} fetchProducts={fetchProducts}/>
      )}
    </div>
  );
};

export default ProductList;