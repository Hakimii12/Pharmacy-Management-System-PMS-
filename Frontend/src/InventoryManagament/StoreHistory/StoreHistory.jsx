// src/components/DetailedHistoryTable.jsx
import React, { useState } from 'react';
import { FaTrash, FaSearch, FaCalendarAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import InventorySummaryCard from './StockResult';
import { useEffect } from 'react';
import axios from 'axios';
const DetailedHistoryTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [historyData,setHistoryData]=useState([])
  // Toggle row expansion
  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Sample data for the history table
//   const historyData = [
//     {
//       id: 1,
//       productName: "Paracetamol",
//       category: "Medicine",
//       brand: "Panadol",
//       batchNumber: "PAN202312",
//       quantityIssued: 5,
//       dateIssued: "2026-05-04",
//       issuedBy: "Dr. Johnson",
//       quantityLeft: 45,
//       totalQuantity: 50,
//       issuedPrice: 55.99,
//       unitPrice: 50.25,
//       totalIssuedPrice: 279.95,
//       totalUnitPrice: 251.25
//     },
//     {
//       id: 2,
//       productName: "Ibuprofen",
//       category: "Medicine",
//       brand: "Advil",
//       batchNumber: "ADV202310",
//       quantityIssued: 20,
//       dateIssued: "2025-06-12",
//       issuedBy: "Nurse Sarah",
//       quantityLeft: 80,
//       totalQuantity: 100,
//       issuedPrice: 58.50,
//       unitPrice: 52.75,
//       totalIssuedPrice: 1170.00,
//       totalUnitPrice: 1055.00
//     },
//     {
//       id: 3,
//       productName: "Amoxicillin",
//       category: "Antibiotic",
//       brand: "Amoxil",
//       batchNumber: "AMX202311",
//       quantityIssued: 15,
//       dateIssued: "2025-04-30",
//       issuedBy: "Dr. Roberts",
//       quantityLeft: 35,
//       totalQuantity: 50,
//       issuedPrice: 512.72,
//       unitPrice: 485.25,
//       totalIssuedPrice: 7690.80,
//       totalUnitPrice: 7278.75
//     },
//     {
//       id: 4,
//       productName: "Loratadine",
//       category: "Antihistamine",
//       brand: "Claritin",
//       batchNumber: "CLR202312",
//       quantityIssued: 8,
//       dateIssued: "2026-07-22",
//       issuedBy: "Pharmacist Mike",
//       quantityLeft: 42,
//       totalQuantity: 50,
//       issuedPrice: 57.25,
//       unitPrice: 51.80,
//       totalIssuedPrice: 458.00,
//       totalUnitPrice: 414.40
//     },
//     {
//       id: 5,
//       productName: "Omeprazole",
//       category: "Antacid",
//       brand: "Prilosec",
//       batchNumber: "PRI202205",
//       quantityIssued: 12,
//       dateIssued: "2025-03-15",
//       issuedBy: "Dr. Johnson",
//       quantityLeft: 38,
//       totalQuantity: 50,
//       issuedPrice: 59.99,
//       unitPrice: 54.25,
//       totalIssuedPrice: 719.88,
//       totalUnitPrice: 651.00
//     },
//   ];
   async function fetchStoreSummery(){
    try {
       await axios.get("http://localhost:5000/api/product/productToDispensary",{
        withCredentials:true
      }).then((res) => {
        console.log(res.data.history)
        setHistoryData(res.data.history);
      });  
    } catch (error) {
        console.log(error)
    }
   }
   useEffect(()=>{
    fetchStoreSummery()
   },[])
  // Filter data based on search term and date range
  const filteredData = historyData?.filter(item => {
    // Search term filter (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item?.product?.name?.toLowerCase().includes(searchLower) ||
      item?.product?.brand?.toLowerCase().includes(searchLower) ||
      item?.product?.batchNo?.toLowerCase().includes(searchLower) ||
      item.user?.name?.toLowerCase().includes(searchLower);
    
    // Date range filter
    const itemDate = new Date(item.dateIssued);
    const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
    const endDate = dateFilter.end ? new Date(dateFilter.end) : null;
    
    let matchesDate = true;
    if (startDate && endDate) {
      matchesDate = itemDate >= startDate && itemDate <= endDate;
    } else if (startDate) {
      matchesDate = itemDate >= startDate;
    } else if (endDate) {
      matchesDate = itemDate <= endDate;
    }
    
    return matchesSearch && matchesDate;
  });

  // Format date to display in table
  const formatDisplayDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Handle date filter change
  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    setDateFilter(prev => ({ ...prev, [name]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter({ start: '', end: '' });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-blue-50 border-b">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Product Issuance History</h2>
            <p className="text-sm text-gray-600 mt-1">Detailed tracking of all product issuance records</p>
          </div>
          <button 
            onClick={clearFilters}
            className="mt-2 md:mt-0 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="p-4 border-b">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, brand, batch, or issuer..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Date Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
            >
              <FaCalendarAlt className="text-gray-500 mr-2" />
              <span>Date Filter</span>
            </button>
            
            {/* Date Filter Dropdown */}
            {showDateFilter && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-700">Filter by Date Range</h3>
                  <button 
                    onClick={() => setShowDateFilter(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start"
                      value={dateFilter.start}
                      onChange={handleDateFilterChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end"
                      value={dateFilter.end}
                      onChange={handleDateFilterChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Applied filters indicator */}
        <div className="mt-3 flex flex-wrap gap-2">
          {searchTerm && (
            <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
              Search: "{searchTerm}"
              <button 
                onClick={() => setSearchTerm('')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </div>
          )}
          
          {dateFilter.start && (
            <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
              From: {formatDisplayDate(dateFilter.start)}
              <button 
                onClick={() => setDateFilter(prev => ({ ...prev, start: '' }))}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          )}
          
          {dateFilter.end && (
            <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
              To: {formatDisplayDate(dateFilter.end)}
              <button 
                onClick={() => setDateFilter(prev => ({ ...prev, end: '' }))}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Results count */}
      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
        Showing {filteredData.length} of {historyData.length} records
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                {/* Expand column */}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty Issued
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Issued
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Issued By
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(item.id)}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button 
                        className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(item.id);
                        }}
                      >
                        {expandedRows[item.id] ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-800 font-bold">{item?.product?.name?.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item?.product?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item?.product?.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item?.product?.brand}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{item?.product?.batchNo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-semibold">{item?.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDisplayDate(item?.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item?.user?.name} <span className='text-xs text-gray-400'>({item?.user?.role})</span></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100"
                        title="Delete record"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded row for additional details */}
                  {expandedRows[item.id] && (
                    <tr className="bg-blue-50">
                      <td colSpan="9" className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Quantity Left</div>
                            <div className="text-lg font-bold text-blue-600">{item.quantityLeft}</div>
                            <div className="text-xs text-gray-600 mt-1">in stock</div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Total Quantity</div>
                            <div className="text-lg font-bold text-blue-600">{item.totalQuantity}</div>
                            <div className="text-xs text-gray-600 mt-1">original stock</div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Issued Price</div>
                            <div className="text-lg font-bold text-green-600">{formatCurrency(item.issuedPrice)}</div>
                            <div className="text-xs text-gray-600 mt-1">per unit</div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Unit Price</div>
                            <div className="text-lg font-bold text-purple-600">{formatCurrency(item.unitPrice)}</div>
                            <div className="text-xs text-gray-600 mt-1">cost per unit</div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Total Issued Price</div>
                            <div className="text-lg font-bold text-green-600">{formatCurrency(item.totalIssuedPrice)}</div>
                            <div className="text-xs text-gray-600 mt-1">issued value</div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Total Unit Price</div>
                            <div className="text-lg font-bold text-purple-600">{formatCurrency(item.totalUnitPrice)}</div>
                            <div className="text-xs text-gray-600 mt-1">cost value</div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Profit Margin</div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(item.totalIssuedPrice - item.totalUnitPrice)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {(100 * (item.totalIssuedPrice - item.totalUnitPrice) / item.totalUnitPrice).toFixed(2)}%
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase">Stock Status</div>
                            <div className={`text-lg font-bold ${
                              item.quantityLeft / item.totalQuantity > 0.5 
                                ? 'text-green-600' 
                                : item.quantityLeft / item.totalQuantity > 0.25 
                                  ? 'text-yellow-600' 
                                  : 'text-red-600'
                            }`}>
                              {item.quantityLeft / item.totalQuantity > 0.5 
                                ? 'High Stock' 
                                : item.quantityLeft / item.totalQuantity > 0.25 
                                  ? 'Medium Stock' 
                                  : 'Low Stock'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {item.quantityLeft} of {item.totalQuantity} remaining
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                  No records found matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredData.length}</span> of{' '}
            <span className="font-medium">{filteredData.length}</span> results
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Previous
              </button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600">
                1
              </button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                2
              </button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                3
              </button>
              <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
     < InventorySummaryCard/>
    </div>
  );
};

export default DetailedHistoryTable;