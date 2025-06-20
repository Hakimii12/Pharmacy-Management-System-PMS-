import React from 'react';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const SalesItem = ({ sale }) => {
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

  // Calculate profit percentage
  const profitPercentage = (sale.profit / (sale.totalSellingPrice - sale.profit)) * 100;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 font-medium">
          {formatDate(sale.timestamp)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold">{sale.drugName.charAt(0)}</span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{sale.drugName}</div>
            <div className="text-sm text-gray-500">{sale.brand}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="font-medium text-gray-900">{sale.quantitySold}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div>${sale.sellingPricePerUnit.toFixed(2)}</div>
        <div className="text-xs text-gray-400">${sale.unitCostPrice.toFixed(2)} cost</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
        ${sale.totalSellingPrice.toFixed(2)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="text-sm font-medium text-green-600">
            ${sale.profit.toFixed(2)}
          </span>
          <span className="ml-1 text-xs text-green-500">
            ({profitPercentage.toFixed(1)}%)
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {sale.soldOut ? (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 flex items-center">
            <FaExclamationTriangle className="mr-1" /> Sold Out
          </span>
        ) : (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
            <FaCheckCircle className="mr-1" /> Completed
          </span>
        )}
      </td>
    </tr>
  );
};

export default SalesItem;