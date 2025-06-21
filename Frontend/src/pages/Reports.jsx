import React, { useState, useEffect } from 'react';
import { FaChartLine, FaMoneyBillWave, FaFileExport, FaEdit, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Reports = () => {
  // Mock data for inventory reports with additional fields
  const [soldItems, setSoldItems] = useState([
    { id: 1, name: "Paracetamol", brand: "Panadol", batch: "BATCH001", date: "2025-06-20", quantity: 45, status: "Sold" },
    { id: 2, name: "Ibuprofen", brand: "Advil", batch: "BATCH002", date: "2025-06-19", quantity: 32, status: "Sold" },
    { id: 3, name: "Vitamin C", brand: "NatureMade", batch: "BATCH003", date: "2025-06-18", quantity: 28, status: "Sold" },
    { id: 4, name: "Omeprazole", brand: "Prilosec", batch: "BATCH004", date: "2025-06-17", quantity: 15, status: "Sold" },
    { id: 5, name: "Aspirin", brand: "Bayer", batch: "BATCH005", date: "2025-06-16", quantity: 22, status: "Sold" },
    { id: 6, name: "Antacid", brand: "Tums", batch: "BATCH006", date: "2025-06-15", quantity: 18, status: "Sold" },
    { id: 7, name: "Allergy Relief", brand: "Claritin", batch: "BATCH007", date: "2025-06-14", quantity: 12, status: "Sold" },
    { id: 8, name: "Cough Syrup", brand: "Robitussin", batch: "BATCH008", date: "2025-06-13", quantity: 8, status: "Sold" },
    { id: 9, name: "Pain Relief Cream", brand: "Bengay", batch: "BATCH009", date: "2025-06-12", quantity: 5, status: "Sold" },
    { id: 10, name: "Multivitamin", brand: "Centrum", batch: "BATCH010", date: "2025-06-11", quantity: 30, status: "Sold" },
  ]);
  
  const [zeroStockItems, setZeroStockItems] = useState([
    { id: 11, name: "Aspirin", brand: "Bayer", batch: "BATCH011", lastSold: "2025-06-15", stock: 0, status: "Out of Stock" },
    { id: 12, name: "Antacid", brand: "Tums", batch: "BATCH012", lastSold: "2025-06-10", stock: 0, status: "Out of Stock" },
    { id: 13, name: "Allergy Relief", brand: "Claritin", batch: "BATCH013", lastSold: "2025-06-08", stock: 0, status: "Out of Stock" },
    { id: 14, name: "Vitamin D", brand: "NatureMade", batch: "BATCH014", lastSold: "2025-06-05", stock: 0, status: "Out of Stock" },
    { id: 15, name: "Probiotics", brand: "Culturelle", batch: "BATCH015", lastSold: "2025-06-03", stock: 0, status: "Out of Stock" },
  ]);
  
  const [lowStockItems, setLowStockItems] = useState([
    { id: 16, name: "Cough Syrup", brand: "Robitussin", batch: "BATCH016", stock: 8, threshold: 15, status: "Low Stock" },
    { id: 17, name: "Antihistamine", brand: "Zyrtec", batch: "BATCH017", stock: 12, threshold: 20, status: "Low Stock" },
    { id: 18, name: "Pain Relief Cream", brand: "Bengay", batch: "BATCH018", stock: 5, threshold: 10, status: "Low Stock" },
    { id: 19, name: "Antacid", brand: "Rolaids", batch: "BATCH019", stock: 3, threshold: 10, status: "Low Stock" },
    { id: 20, name: "Eye Drops", brand: "Visine", batch: "BATCH020", stock: 7, threshold: 15, status: "Low Stock" },
    { id: 21, name: "Nasal Spray", brand: "Flonase", batch: "BATCH021", stock: 4, threshold: 10, status: "Low Stock" },
    { id: 22, name: "Laxative", brand: "Dulcolax", batch: "BATCH022", stock: 6, threshold: 12, status: "Low Stock" },
  ]);
  
  const [expiredItems, setExpiredItems] = useState([
    { id: 23, name: "Vitamin D", brand: "NatureMade", batch: "BATCH023", expiryDate: "2025-05-15", status: "Expired" },
    { id: 24, name: "Multivitamin", brand: "Centrum", batch: "BATCH024", expiryDate: "2025-04-30", status: "Expired" },
    { id: 25, name: "Probiotics", brand: "Align", batch: "BATCH025", expiryDate: "2025-06-01", status: "Expired" },
    { id: 26, name: "Fish Oil", brand: "Nordic Naturals", batch: "BATCH026", expiryDate: "2025-05-20", status: "Expired" },
    { id: 27, name: "Vitamin B12", brand: "Nature's Bounty", batch: "BATCH027", expiryDate: "2025-05-25", status: "Expired" },
  ]);
  
  // State for filters and pagination
  const [filters, setFilters] = useState({
    sold: { name: '', brand: '', batch: '' },
    zeroStock: { name: '', brand: '', batch: '' },
    lowStock: { name: '', brand: '', batch: '' },
    expired: { name: '', brand: '', batch: '' }
  });
  
  const [pagination, setPagination] = useState({
    sold: { currentPage: 1, itemsPerPage: 5 },
    zeroStock: { currentPage: 1, itemsPerPage: 5 },
    lowStock: { currentPage: 1, itemsPerPage: 5 },
    expired: { currentPage: 1, itemsPerPage: 5 }
  });
  
  // Status badge component
  const StatusBadge = ({ status }) => {
    let bgColor = 'bg-blue-100 text-blue-800';
    
    switch(status) {
      case 'Sold':
        bgColor = 'bg-green-100 text-green-800';
        break;
      case 'Out of Stock':
        bgColor = 'bg-red-100 text-red-800';
        break;
      case 'Low Stock':
        bgColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'Expired':
        bgColor = 'bg-gray-100 text-gray-800';
        break;
      default:
        break;
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
        {status}
      </span>
    );
  };
  
  // Filter items based on filter criteria
  const filterItems = (items, filterType) => {
    const { name, brand, batch } = filters[filterType];
    
    return items.filter(item => {
      const nameMatch = name ? item.name.toLowerCase().includes(name.toLowerCase()) : true;
      const brandMatch = brand ? item.brand.toLowerCase().includes(brand.toLowerCase()) : true;
      const batchMatch = batch ? item.batch.toLowerCase().includes(batch.toLowerCase()) : true;
      
      return nameMatch && brandMatch && batchMatch;
    });
  };
  
  // Paginate items
  const paginateItems = (items, filterType) => {
    const { currentPage, itemsPerPage } = pagination[filterType];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return items.slice(startIndex, endIndex);
  };
  
  // Handle filter changes
  const handleFilterChange = (filterType, field, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: {
        ...prev[filterType],
        [field]: value
      }
    }));
    
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      [filterType]: {
        ...prev[filterType],
        currentPage: 1
      }
    }));
  };
  
  // Handle page changes
  const handlePageChange = (filterType, newPage) => {
    setPagination(prev => ({
      ...prev,
      [filterType]: {
        ...prev[filterType],
        currentPage: newPage
      }
    }));
  };
  
  // Edit and delete handlers
  const handleEdit = (id, listType) => {
    console.log(`Editing item ${id} from ${listType}`);
    // In a real application, this would open a modal or form
  };
  
  const handleDelete = (id, listType) => {
    console.log(`Deleting item ${id} from ${listType}`);
    
    // Update the appropriate list
    switch(listType) {
      case 'sold':
        setSoldItems(soldItems.filter(item => item.id !== id));
        break;
      case 'zeroStock':
        setZeroStockItems(zeroStockItems.filter(item => item.id !== id));
        break;
      case 'lowStock':
        setLowStockItems(lowStockItems.filter(item => item.id !== id));
        break;
      case 'expired':
        setExpiredItems(expiredItems.filter(item => item.id !== id));
        break;
      default:
        break;
    }
  };
  
  // Filter and paginate data
  const filteredSoldItems = filterItems(soldItems, 'sold');
  const paginatedSoldItems = paginateItems(filteredSoldItems, 'sold');
  
  const filteredZeroStockItems = filterItems(zeroStockItems, 'zeroStock');
  const paginatedZeroStockItems = paginateItems(filteredZeroStockItems, 'zeroStock');
  
  const filteredLowStockItems = filterItems(lowStockItems, 'lowStock');
  const paginatedLowStockItems = paginateItems(filteredLowStockItems, 'lowStock');
  
  const filteredExpiredItems = filterItems(expiredItems, 'expired');
  const paginatedExpiredItems = paginateItems(filteredExpiredItems, 'expired');
  
  // Pagination component
  const Pagination = ({ 
    currentPage, 
    totalItems, 
    itemsPerPage, 
    onPageChange,
    filterType 
  }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    return (
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{" "}
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(filterType, currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <FaChevronLeft className="text-sm" />
          </button>
          
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md">
            {currentPage}
          </span>
          
          <button
            onClick={() => onPageChange(filterType, currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <FaChevronRight className="text-sm" />
          </button>
        </div>
      </div>
    );
  };
  
  // Filter input component
  const FilterInput = ({ filterType, field, placeholder }) => (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={filters[filterType][field]}
        onChange={(e) => handleFilterChange(filterType, field, e.target.value)}
        className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
    </div>
  );
  
  // Report section component
  const ReportSection = ({ 
    title, 
    description, 
    items, 
    filteredItems, 
    paginatedItems, 
    filterType, 
    columns, 
    children 
  }) => {
    const { currentPage, itemsPerPage } = pagination[filterType];
    
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h2 className="font-bold text-blue-800">{title}</h2>
          <p className="text-xs text-blue-600 mt-1">{description}</p>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b">
          <FilterInput 
            filterType={filterType} 
            field="name" 
            placeholder="Filter by name..." 
          />
          <FilterInput 
            filterType={filterType} 
            field="brand" 
            placeholder="Filter by brand..." 
          />
          <FilterInput 
            filterType={filterType} 
            field="batch" 
            placeholder="Filter by batch..." 
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                {columns.map((column, index) => (
                  <th 
                    key={index} 
                    className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedItems.length > 0 ? (
                paginatedItems.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.brand}</div>
                    </td>
                    {children(item)}
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleEdit(item.id, filterType)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, filterType)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} className="py-4 px-4 text-center text-sm text-gray-500">
                    No items found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            filterType={filterType}
          />
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Inventory Status Reports</h1>
          <button className="mt-3 md:mt-0 flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200">
            <FaFileExport className="mr-2" /> Export Report
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Recently Sold Items */}
          <ReportSection
            title="Recently Sold Items"
            description="Items sold in the last 7 days"
            items={soldItems}
            filteredItems={filteredSoldItems}
            paginatedItems={paginatedSoldItems}
            filterType="sold"
            columns={["Product", "Batch", "Date Sold", "Qty"]}
          >
            {(item) => (
              <>
                <td className="py-3 px-4 text-sm text-gray-600">{item.batch}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{item.date}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{item.quantity}</td>
              </>
            )}
          </ReportSection>
          
          {/* Out of Stock Items */}
          <ReportSection
            title="Out of Stock Items"
            description="Items that need restocking"
            items={zeroStockItems}
            filteredItems={filteredZeroStockItems}
            paginatedItems={paginatedZeroStockItems}
            filterType="zeroStock"
            columns={["Product", "Batch", "Last Sold", "Stock"]}
          >
            {(item) => (
              <>
                <td className="py-3 px-4 text-sm text-gray-600">{item.batch}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{item.lastSold}</td>
                <td className="py-3 px-4 text-sm font-medium text-red-600">{item.stock}</td>
              </>
            )}
          </ReportSection>
          
          {/* Low Stock Items */}
          <ReportSection
            title="Low Stock Items"
            description="Items below minimum stock level"
            items={lowStockItems}
            filteredItems={filteredLowStockItems}
            paginatedItems={paginatedLowStockItems}
            filterType="lowStock"
            columns={["Product", "Batch", "Current", "Threshold"]}
          >
            {(item) => (
              <>
                <td className="py-3 px-4 text-sm text-gray-600">{item.batch}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{item.stock}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{item.threshold}</td>
              </>
            )}
          </ReportSection>
          
          {/* Expired Products */}
          <ReportSection
            title="Expired Products"
            description="Items past their expiration date"
            items={expiredItems}
            filteredItems={filteredExpiredItems}
            paginatedItems={paginatedExpiredItems}
            filterType="expired"
            columns={["Product", "Batch", "Expiry Date"]}
          >
            {(item) => (
              <>
                <td className="py-3 px-4 text-sm text-gray-600">{item.batch}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{item.expiryDate}</td>
              </>
            )}
          </ReportSection>
        </div>
      </div>
      
      {/* Inventory Summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Inventory Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100 mr-4">
                <FaChartLine className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Recently Sold</p>
                <p className="text-2xl font-bold text-gray-800">{soldItems.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-5 border border-red-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100 mr-4">
                <FaChartLine className="text-red-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-800">{zeroStockItems.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-100">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100 mr-4">
                <FaChartLine className="text-yellow-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-800">{lowStockItems.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-5 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-gray-200 mr-4">
                <FaMoneyBillWave className="text-gray-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Expired Items</p>
                <p className="text-2xl font-bold text-gray-800">{expiredItems.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;