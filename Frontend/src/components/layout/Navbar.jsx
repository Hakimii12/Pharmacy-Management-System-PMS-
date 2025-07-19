// Navbar.js
import React from 'react';
import { FaBell, FaUserCircle, FaBars } from 'react-icons/fa'; // Added FaBars

const Navbar = ({ toggleSidebar }) => {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Hamburger Menu (Mobile Only) */}
        <button 
          onClick={toggleSidebar}
          className="mr-4 text-gray-500 md:hidden"
        >
          <FaBars className="h-6 w-6" />
        </button>
        
        <div className="flex-1 flex items-center justify-end space-x-4">
          {/* Notification Bell */}
          <button className="relative p-1 text-gray-600 hover:text-gray-900 focus:outline-none">
            <FaBell className="h-6 w-6" />
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              3
            </span>
          </button>
          
          {/* User Profile */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaUserCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-3">
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