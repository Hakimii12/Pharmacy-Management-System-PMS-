import React, { useState, useEffect } from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const [pageRange, setPageRange] = useState([]);
  
  useEffect(() => {
    // Calculate the range of page numbers to display
    const range = [];
    const maxVisiblePages = 5; // Number of page buttons to show
    const halfRange = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfRange);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }
    
    setPageRange(range);
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-1 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors"
      >
        Prev
      </button>
      
      {/* First page */}
      {pageRange[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-blue-100 transition-colors"
          >
            1
          </button>
          {pageRange[0] > 2 && <span className="px-1">...</span>}
        </>
      )}
      
      {/* Page numbers */}
      {pageRange.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded transition-colors ${
            page === currentPage
              ? "bg-blue-600 text-white font-bold"
              : "bg-gray-100 text-gray-700 hover:bg-blue-100"
          }`}
        >
          {page}
        </button>
      ))}
      
      {/* Last page */}
      {pageRange[pageRange.length - 1] < totalPages && (
        <>
          {pageRange[pageRange.length - 1] < totalPages - 1 && <span className="px-1">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-blue-100 transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 hover:bg-gray-300 transition-colors"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;