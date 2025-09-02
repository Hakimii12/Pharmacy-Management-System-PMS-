"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import {
  BarChart3,
  Package,
  AlertTriangle,
  Calendar,
  ArrowUpDown,
  Warehouse,
  Pill,
  RefreshCw,
  Activity,
  Eye,
  Calculator,
  History,
  TrendingUp,
  Download,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  List
} from "lucide-react"

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState("dispensarySummary")
  const [productInventory, setProductInventory] = useState(null)
  const [dispensaryCalculation, setDispensaryCalculation] = useState(null)
  const [inventoryHistory, setInventoryHistory] = useState([])
  const [reconcileResult, setReconcileResult] = useState(null)
  const [dispensarySummary, setDispensarySummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [filters, setFilters] = useState({
    productId: "",
    startDate: "",
    endDate: ""
  })
  const [reconcileForm, setReconcileForm] = useState({
    adjustmentQty: 0,
    reason: "",
    location: "dispensary"
  })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productMap, setProductMap] = useState(new Map()) // To map product names to IDs
  const [summarySearch, setSummarySearch] = useState("")
  const [summaryStatus, setSummaryStatus] = useState("")

  // API base URL - adjust as needed
  const API_BASE = "http://localhost:5000/api"

  // Fetch dispensary summary
  const fetchDispensarySummary = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axios.get(
        `${API_BASE}/inventory/getDispensarySummary`,
        { withCredentials: true }
      )
      setDispensarySummary(response.data)
      
      // Create a mapping of product names to IDs for easier lookup
      const newProductMap = new Map()
      response.data.products.forEach(product => {
        // In a real application, you'd use the actual product ID
        // For now, we'll use the name as ID since the sample data doesn't include IDs
        newProductMap.set(product.name, product.productId) // Replace with product.id when available
      })
      setProductMap(newProductMap)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch dispensary summary")
    } finally {
      setLoading(false)
    }
  }, [API_BASE])

  // Fetch product inventory
  const fetchProductInventory = useCallback(async (productId) => {
    if (!productId) return
    setLoading(true)
    setError("")
    try {
      const response = await axios.get(
        `${API_BASE}/inventory/product/${productId}`,
        { withCredentials: true }
      )
      setProductInventory(response.data)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch product inventory")
    } finally {
      setLoading(false)
    }
  }, [API_BASE])

  // Calculate dispensary inventory
  const calculateDispensaryInventory = useCallback(async (productId, startDate, endDate) => {
    if (!productId) return
    setLoading(true)
    setError("")
    try {
      let url = `${API_BASE}/inventory/calculate/${productId}`
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`
      }
      const response = await axios.get(
        url,
        { withCredentials: true }
      )
      setDispensaryCalculation(response.data)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to calculate dispensary inventory")
    } finally {
      setLoading(false)
    }
  }, [API_BASE])

  // Fetch inventory history
  const fetchInventoryHistory = useCallback(async (productId, limit = 50) => {
    if (!productId) return
    setLoading(true)
    setError("")
    try {
      const response = await axios.get(
        `${API_BASE}/inventory/history/${productId}?limit=${limit}`,
        { withCredentials: true }
      )
      setInventoryHistory(response.data.history || [])
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch inventory history")
    } finally {
      setLoading(false)
    }
  }, [API_BASE])

  // Reconcile inventory
  const reconcileInventory = useCallback(async (productId, adjustmentQty, reason, location) => {
    if (!productId) return
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const response = await axios.post(
        `${API_BASE}/inventory/reconcile/${productId}`,
        { adjustmentQty, reason, location },
        { withCredentials: true }
      )
      setReconcileResult(response.data)
      setSuccess("Inventory reconciled successfully")
      // Refresh the data
      fetchProductInventory(productId)
      calculateDispensaryInventory(productId, filters.startDate, filters.endDate)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reconcile inventory")
    } finally {
      setLoading(false)
    }
  }, [API_BASE, fetchProductInventory, calculateDispensaryInventory, filters])

  // Handle form changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleReconcileChange = (e) => {
    const { name, value } = e.target
    setReconcileForm(prev => ({ ...prev, [name]: value }))
  }

  // Apply filters
  const applyFilters = () => {
    if (filters.productId) {
      if (activeTab === "product") {
        fetchProductInventory(filters.productId)
      } else if (activeTab === "calculate") {
        calculateDispensaryInventory(filters.productId, filters.startDate, filters.endDate)
      } else if (activeTab === "history") {
        fetchInventoryHistory(filters.productId)
      }
    }
  }

  // Handle reconcile form submission
  const handleReconcileSubmit = (e) => {
    e.preventDefault()
    if (filters.productId) {
      reconcileInventory(
        filters.productId,
        parseInt(reconcileForm.adjustmentQty),
        reconcileForm.reason,
        reconcileForm.location
      )
    }
  }

  // Handle product selection from the dispensary summary
  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    // Use the product ID (in a real app, you'd use product.id)
    // For now, we'll use the product name as ID since the sample data doesn't include IDs
    const productId = product.productId // Replace with product.id when available
    setFilters(prev => ({ ...prev, productId }))
    
    // Automatically switch to the product details tab and fetch data
    setActiveTab("product")
    fetchProductInventory(productId)
  }

  // Reset messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // Load dispensary summary on component mount
  useEffect(() => {
    fetchDispensarySummary()
  }, [fetchDispensarySummary])

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <BarChart3 className="mr-3" />
          Inventory Management
        </h1>
        <p className="text-gray-600">Track and manage your pharmacy inventory</p>
      </div>

      {/* Notification messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertTriangle className="mr-2" size={20} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <CheckCircle className="mr-2" size={20} />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === "dispensarySummary" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("dispensarySummary")}
        >
          <Warehouse className="inline mr-2" size={18} />
          Dispensary Summary
        </button>
        <button
          className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === "product" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("product")}
        >
          <Package className="inline mr-2" size={18} />
          Product Inventory
        </button>
        <button
          className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === "calculate" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("calculate")}
        >
          <Calculator className="inline mr-2" size={18} />
          Calculate Inventory
        </button>
        <button
          className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === "history" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("history")}
        >
          <History className="inline mr-2" size={18} />
          Inventory History
        </button>
        <button
          className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === "reconcile" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("reconcile")}
        >
          <RefreshCw className="inline mr-2" size={18} />
          Reconcile Inventory
        </button>
      </div>

      {/* Filter Section (only show for tabs that need it) */}
      {activeTab !== "dispensarySummary" && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex items-center mb-4">
            <Filter className="text-gray-500 mr-2" size={20} />
            <h3 className="text-lg font-medium">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Product</label>
              <select
                name="productId"
                value={filters.productId}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a product</option>
                {dispensarySummary?.products?.map((product, index) => (
                  <option key={index} value={product.productId}>
                    {product.name} - {product.brand}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={applyFilters}
                disabled={loading || !filters.productId}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center disabled:opacity-50"
              >
                <Search className="mr-2" size={18} />
                {loading ? "Loading..." : "Apply Filters"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {loading && (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="animate-spin text-blue-500 mr-2" />
            <span>Loading data...</span>
          </div>
        )}

        {/* Dispensary Summary Tab */}
        {activeTab === "dispensarySummary" && dispensarySummary && !loading && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Warehouse className="mr-2" />
                Dispensary Summary
              </h2>
              <button
                onClick={fetchDispensarySummary}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center"
              >
                <RefreshCw className="mr-2" size={18} />
                Refresh
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-800">
                  {dispensarySummary.products.length}
                </div>
                <p className="text-sm">Total Products</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-800">
                  {dispensarySummary.products.filter(p => p.status === "In Stock").length}
                </div>
                <p className="text-sm">In Stock</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-800">
                  {dispensarySummary.products.filter(p => p.status === "Low Stock").length}
                </div>
                <p className="text-sm">Low Stock</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-800">
                  {dispensarySummary.products.filter(p => p.status === "Sold Out").length}
                </div>
                <p className="text-sm">Sold Out</p>
              </div>
            </div>

            {/* Products Table */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by name, brand, batch number..."
                value={summarySearch}
                onChange={e => setSummarySearch(e.target.value)}
                className="p-2 border border-gray-300 rounded-md flex-1"
              />
              <select
                value={summaryStatus}
                onChange={e => setSummaryStatus(e.target.value)}
                className="p-2 border border-gray-300 rounded-md w-48"
              >
                <option value="">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Sold Out">Sold Out</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sold</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Dispensary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dispensarySummary.products
                    .filter(product => {
                      const name = product.name?.toLowerCase() || "";
                      const brand = product.brand?.toLowerCase() || "";
                      const batchNo = product.batchNo?.toLowerCase() || "";
                      const search = summarySearch.toLowerCase();

                      const matchesSearch =
                        name.includes(search) ||
                        brand.includes(search) ||
                        batchNo.includes(search);

                      const matchesStatus = summaryStatus === "" || product.status === summaryStatus;
                      return matchesSearch && matchesStatus;
                    })
                    .map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.brand}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.status === "In Stock" ? "bg-green-100 text-green-800" :
                          product.status === "Low Stock" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(product.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.totalSold}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.actualInDispensary}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleProductSelect(product)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Expected Values</h4>
                  <p>Total Unit Price: ${dispensarySummary.totals.totalUnitPriceExpected.toFixed(2)}</p>
                  <p>Total Selling Price: ${dispensarySummary.totals.totalSellingPriceExpected.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Actual Values</h4>
                  <p>Total Unit Price: ${dispensarySummary.totals.totalUnitPriceActual.toFixed(2)}</p>
                  <p>Total Selling Price: ${dispensarySummary.totals.totalSellingPriceActual.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Inventory Tab */}
        {activeTab === "product" && productInventory && !loading && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Package className="mr-2" />
              Product Inventory Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Product Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {productInventory.product?.name}</p>
                  <p><span className="font-medium">Batch No:</span> {productInventory.product?.batchNo}</p>
                  <p><span className="font-medium">Expiry Date:</span> {new Date(productInventory.product?.expiryDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Inventory Summary</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Store Quantity:</span> {productInventory.inventory?.store}</p>
                  <p><span className="font-medium">Dispensary Quantity:</span> {productInventory.inventory?.dispensary}</p>
                  <p><span className="font-medium">Total Quantity:</span> {productInventory.inventory?.total}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Recent Transfers</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  {productInventory.recentTransfers?.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {productInventory.recentTransfers.map((transfer, index) => (
                        <li key={index} className="py-2">
                          <p className="font-medium">{transfer.type}</p>
                          <p>Quantity: {transfer.quantity}</p>
                          <p>Date: {new Date(transfer.date).toLocaleDateString()}</p>
                          <p>By: {transfer.user?.name}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No recent transfers</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Recent Sales</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  {productInventory.recentSales?.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {productInventory.recentSales.map((sale, index) => (
                        <li key={index} className="py-2">
                          <p className="font-medium">Sale: {sale.quantitySold} units</p>
                          <p>Amount: ${sale.saleAmount}</p>
                          <p>Date: {new Date(sale.completedAt).toLocaleDateString()}</p>
                          <p>By: {sale.cashier?.name || sale.pharmacist?.name}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No recent sales</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculate Inventory Tab */}
        {activeTab === "calculate" && dispensaryCalculation && !loading && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Calculator className="mr-2" />
              Dispensary Inventory Calculation
            </h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Formula:</h3>
              <p className="text-sm">
                Closing Dispensary Inventory = (Opening Balance + Received from Store) - (Sold to Patient + Returned to Store)
              </p>
              <p className="text-sm mt-2">
                Time Period: {dispensaryCalculation.timePeriod.startDate} to {dispensaryCalculation.timePeriod.endDate}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Product Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {dispensaryCalculation.product?.name}</p>
                  <p><span className="font-medium">Batch No:</span> {dispensaryCalculation.product?.batchNo}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Calculation Results</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Total Issued:</span> {dispensaryCalculation.calculations.totalIssued} units</p>
                  <p><span className="font-medium">Total Returned:</span> {dispensaryCalculation.calculations.totalReturned} units</p>
                  <p><span className="font-medium">Total Sold:</span> {dispensaryCalculation.calculations.totalSold} units</p>
                  <p><span className="font-medium">Expected in Dispensary:</span> {dispensaryCalculation.calculations.expectedDispensaryQty} units</p>
                  <p><span className="font-medium">Actual in Dispensary:</span> {dispensaryCalculation.calculations.actualDispensaryQty} units</p>
                  <p className={`font-medium ${dispensaryCalculation.calculations.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Discrepancy: {dispensaryCalculation.calculations.discrepancy} units
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-800">
                  {dispensaryCalculation.calculations.totalIssued}
                </div>
                <p className="text-sm">Total Issued</p>
              </div>
              
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-800">
                  {dispensaryCalculation.calculations.totalReturned}
                </div>
                <p className="text-sm">Total Returned</p>
              </div>
              
              <div className="bg-red-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-800">
                  {dispensaryCalculation.calculations.totalSold}
                </div>
                <p className="text-sm">Total Sold</p>
              </div>
            </div>
          </div>
        )}

        {/* Inventory History Tab */}
        {activeTab === "history" && inventoryHistory.length > 0 && !loading && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <History className="mr-2" />
              Inventory History
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryHistory.map((event, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {event.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.user}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reconcile Inventory Tab */}
        {activeTab === "reconcile" && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <RefreshCw className="mr-2" />
              Reconcile Inventory
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <form onSubmit={handleReconcileSubmit} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Reconciliation Form</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Quantity</label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setReconcileForm(prev => ({ ...prev, adjustmentQty: parseInt(prev.adjustmentQty) - 1 }))}
                        className="p-2 bg-gray-200 rounded-l-md"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        name="adjustmentQty"
                        value={reconcileForm.adjustmentQty}
                        onChange={handleReconcileChange}
                        className="w-20 p-2 border-y border-gray-300 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setReconcileForm(prev => ({ ...prev, adjustmentQty: parseInt(prev.adjustmentQty) + 1 }))}
                        className="p-2 bg-gray-200 rounded-r-md"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                      name="location"
                      value={reconcileForm.location}
                      onChange={handleReconcileChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="store">Store</option>
                      <option value="dispensary">Dispensary</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      name="reason"
                      value={reconcileForm.reason}
                      onChange={handleReconcileChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows="3"
                      placeholder="Explain why this adjustment is needed"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !filters.productId}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Reconcile Inventory"}
                  </button>
                </form>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Reconciliation Result</h3>
                {reconcileResult ? (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="text-green-500 mr-2" />
                      <span className="font-medium">Reconciliation Successful</span>
                    </div>
                    <p className="mb-2">Adjustment: {reconcileResult.adjustment.quantity} units</p>
                    <p>Reason: {reconcileResult.adjustment.adjustmentReason}</p>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
                    <p>No reconciliation performed yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no data */}
        {!loading && !productInventory && !dispensaryCalculation && inventoryHistory.length === 0 && activeTab !== "reconcile" && activeTab !== "dispensarySummary" && (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No inventory data</h3>
            <p className="text-gray-500">Select a product from the filters to view inventory information</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryManagement;