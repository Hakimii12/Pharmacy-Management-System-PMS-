import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar will be fixed */}
      <Sidebar />
      
      {/* Main content area with left margin */}
      <div className="flex flex-col flex-1 overflow-hidden ml-64">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-blue-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;