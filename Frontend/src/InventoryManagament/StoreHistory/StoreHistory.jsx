// src/components/HistoryTable.jsx
import React from 'react';
import { FaTrash, FaSortDown, FaSortUp } from 'react-icons/fa';

const StoreHistory = () => {
  // Sample data for the history table
  const historyData = [
    {
      id: 1,
      productName: "Paracetamol",
      category: "Medicine",
      brand: "Panadol",
      batchNumber: "PAN202312",
      quantityIssued: 5,
      dateIssued: "May 4, 2026",
      issuedBy: "Dr. Johnson"
    },
    {
      id: 2,
      productName: "Ibuprofen",
      category: "Medicine",
      brand: "Advil",
      batchNumber: "ADV202310",
      quantityIssued: 20,
      dateIssued: "Jun 12, 2025",
      issuedBy: "Nurse Sarah"
    },
    {
      id: 3,
      productName: "Amoxicillin",
      category: "Antibiotic",
      brand: "Amoxil",
      batchNumber: "AMX202311",
      quantityIssued: 15,
      dateIssued: "Apr 30, 2025",
      issuedBy: "Dr. Roberts"
    },
    {
      id: 4,
      productName: "Loratadine",
      category: "Antihistamine",
      brand: "Claritin",
      batchNumber: "CLR202312",
      quantityIssued: 8,
      dateIssued: "Jul 22, 2026",
      issuedBy: "Pharmacist Mike"
    },
    {
      id: 5,
      productName: "Omeprazole",
      category: "Antacid",
      brand: "Prilosec",
      batchNumber: "PRI202205",
      quantityIssued: 12,
      dateIssued: "Mar 15, 2025",
      issuedBy: "Dr. Johnson"
    },
    {
      id: 6,
      productName: "Aspirin",
      category: "Analgesic",
      brand: "Bayer",
      batchNumber: "BAY202401",
      quantityIssued: 25,
      dateIssued: "Feb 28, 2025",
      issuedBy: "Nurse Sarah"
    },
    {
      id: 7,
      productName: "Cetirizine",
      category: "Antihistamine",
      brand: "Zyrtec",
      batchNumber: "ZYR202402",
      quantityIssued: 18,
      dateIssued: "Jan 10, 2025",
      issuedBy: "Pharmacist Mike"
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-blue-50 border-b">
        <h2 className="text-xl font-bold text-gray-800">Product Issuance History</h2>
        <p className="text-sm text-gray-600 mt-1">Track all product issuance records</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                Batch Number
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity Issued
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date of Issued
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Who Issued
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {historyData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-800 font-bold">{item.productName.charAt(0)}</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.brand}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.batchNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-semibold">{item.quantityIssued}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.dateIssued}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.issuedBy}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100">
                    <FaTrash className="text-sm" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">1</span> to <span className="font-medium">7</span> of{' '}
            <span className="font-medium">7</span> results
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
    </div>
  );
};

export default StoreHistory;