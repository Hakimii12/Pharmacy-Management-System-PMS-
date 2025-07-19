// Navbar.js
import React from 'react';
import { FaBell, FaUserCircle, FaBars } from 'react-icons/fa';

const Navbar = ({ toggleSidebar }) => {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
          >
            <FaBars className="h-6 w-6" />
          </button>
        </div>
        
        <div className="relative w-64 hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {/* Search icon would go here */}
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative p-1 text-gray-600 hover:text-gray-900 focus:outline-none">
            <FaBell className="h-6 w-6" />
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">3</span>
          </button>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaUserCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-3 hidden sm:block">
              <p className="text-sm font-medium text-gray-700">Pharmacy Admin</p>
              <p className="text-xs font-medium text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;