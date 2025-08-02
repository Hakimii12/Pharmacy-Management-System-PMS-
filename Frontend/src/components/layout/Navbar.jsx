"use client"
import { FaBell, FaUserCircle, FaBars } from "react-icons/fa"

const Navbar = ({ toggleSidebar }) => {
  const user = JSON.parse(localStorage.getItem("user-threads"))
  return (
    <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 z-10 sticky top-0">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Hamburger Menu (Mobile Only) */}
        <button
          onClick={toggleSidebar}
          className="mr-4 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 md:hidden group"
        >
          <FaBars className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
        </button>

        <div className="flex-1 flex items-center justify-end space-x-4">
          {/* Notification Bell */}
          {/* <button className="relative p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 group">
            <FaBell className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg animate-pulse">
              3
            </span>
          </button> */}

          {/* User Profile */}
          <div className="flex items-center bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-2 hover:from-indigo-100 hover:to-blue-100 transition-all duration-200 cursor-pointer group">
            <div className="flex-shrink-0">
              <div className="relative">
                <FaUserCircle className="h-8 w-8 text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-3 hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-800 transition-colors duration-200">
                {user?.name || "Pharmacy Admin"}
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-indigo-600 transition-colors duration-200">
                {user?.role || "Administrator"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
