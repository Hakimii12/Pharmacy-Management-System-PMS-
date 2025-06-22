import React, { useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const SalesItem = ({ transaction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate total quantity
  const totalQuantity = transaction.items.reduce((sum, item) => sum + item.quantitySold, 0);

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 font-medium">
            {formatDate(transaction.timestamp)}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold">T</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                Transaction #{transaction.id}
              </div>
              <div className="text-sm text-gray-500">
                {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="font-medium text-gray-900">{totalQuantity}</div>
          <div className="text-xs text-gray-400">total units</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
          ${transaction.totalSale.toFixed(2)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <span className="text-sm font-medium text-green-600">
              ${transaction.totalProfit.toFixed(2)}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {transaction.soldOut ? (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 flex items-center">
              <FaExclamationTriangle className="mr-1" /> Sold Out
            </span>
          ) : (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
              <FaCheckCircle className="mr-1" /> Completed
            </span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-blue-600"
          >
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </td>
      </tr>
      
      {/* Expanded details */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan="7" className="px-6 py-4">
            <div className="ml-12">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Items in this transaction:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Drug
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transaction.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.drugName}</div>
                          <div className="text-sm text-gray-500">{item.brand}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {item.quantitySold}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ${item.sellingPricePerUnit.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          ${item.totalSellingPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">
                          ${item.profit.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {item.soldOut ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Sold Out
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default SalesItem;