import React, { useState, useEffect, useMemo } from 'react';
import SalesItem from './SalesItem';
import SalesForm from './SalesForm';
import { FaPlus, FaSearch, FaFilter, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { sales } from '../../data/sales';

const SalesList = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Convert sales data to transaction format
  const transactions = useMemo(() => {
    return sales.map(sale => {
      // If already in transaction format, return as-is
      if (sale.items && Array.isArray(sale.items)) {
        return sale;
      }
      
      // Convert single item to transaction format
      return {
        id: sale.id,
        timestamp: sale.timestamp,
        items: [{
          drugId: sale.drugId,
          drugName: sale.drugName,
          brand: sale.brand,
          quantitySold: sale.quantitySold,
          unitCostPrice: sale.unitCostPrice,
          markupPercentage: sale.markupPercentage,
          sellingPricePerUnit: sale.sellingPricePerUnit,
          totalSellingPrice: sale.totalSellingPrice,
          profit: sale.profit,
          soldOut: sale.soldOut
        }],
        totalSale: sale.totalSellingPrice,
        totalProfit: sale.profit,
        soldOut: sale.soldOut
      };
    });
  }, []);

  const filteredSales = transactions.filter(transaction => {
    // Search across all items in transaction
    const hasMatchingItem = transaction.items.some(item => 
      item.drugName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const transactionDate = new Date(transaction.timestamp);
    const matchesStart = !startDate || transactionDate >= new Date(startDate);
    const matchesEnd = !endDate || transactionDate <= new Date(endDate);
    
    return hasMatchingItem && matchesStart && matchesEnd;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const goToNextPage = () => currentPage < totalPages && setCurrentPage(p => p + 1);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage(p => p - 1);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Sales Records</h2>
          <button 
            onClick={() => setShowForm(true)}
            className="mt-3 md:mt-0 flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
          >
            <FaPlus className="mr-2" /> New Sale
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
              placeholder="Search sales..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaFilter className="text-gray-400" />
              </div>
              <input
                type="date"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
              />
            </div>
            <span className="mx-2 text-gray-500">to</span>
            <div className="relative w-full">
              <input
                type="date"
                className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sale
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Profit
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
              {currentItems.map(transaction => (
                <SalesItem key={transaction.id} transaction={transaction} />
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredSales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No sales records found</p>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredSales.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredSales.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <FaChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <FaChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showForm && (
        <SalesForm 
          onClose={() => setShowForm(false)} 
          onSave={(saleRecords) => {
            const newTransaction = {
              id: Date.now(),
              timestamp: new Date().toISOString(),
              items: saleRecords,
              totalSale: saleRecords.reduce((sum, item) => sum + item.totalSellingPrice, 0),
              totalProfit: saleRecords.reduce((sum, item) => sum + item.profit, 0),
              soldOut: saleRecords.some(item => item.soldOut)
            };
            
            // Add to sales array (in real app this would be API call)
            sales.unshift(newTransaction);
            setShowForm(false);
          }} 
        />
      )}
    </div>
  );
};

export default SalesList;