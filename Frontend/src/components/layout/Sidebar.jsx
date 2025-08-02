import { NavLink, useLocation } from "react-router-dom"
import {
  FaHome,
  FaPills,
  FaShoppingCart,
  FaChartLine,
  FaBell,
  FaChevronDown,
  FaChevronUp,
  FaBox,
  FaStore,
  FaCashRegister,
  FaClipboardList,
  FaTruckLoading,
  FaHistory,
} from "react-icons/fa"
import { useState } from "react"
import { FiSettings } from "react-icons/fi"
import { AiOutlineUser, AiOutlineLogout } from "react-icons/ai"

const Sidebar = ({ closeSidebar }) => {
  const user = JSON.parse(localStorage.getItem("user-threads"))
  const userRole = user?.role || 'cashier'; // Default to cashier if role not found
  const [openDropdown, setOpenDropdown] = useState({
    inventory: false,
    sales: false,
    backstore: false,
    dispensary: false,
  })

  const location = useLocation()

  const toggleDropdown = (menu) => {
    setOpenDropdown((prev) => ({ ...prev, [menu]: !prev[menu] }))
  }

  // Function to handle navigation click
  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    if (window.innerWidth < 768) {
      closeSidebar()
    }
  }

  // Authorization helper functions
  const canViewInventory = () => ['admin', 'superAdmin'].includes(userRole);
  const canViewBackstore = () => ['admin', 'superAdmin'].includes(userRole);
  const canViewDispensary = () => ['admin', 'superAdmin'].includes(userRole);
  const canViewPurchaseOrder = () => ['pharmacist', 'admin', 'superAdmin'].includes(userRole);
  const canViewReceiveOrder = () => ['cashier', 'admin', 'superAdmin'].includes(userRole);
  const canViewCloseBalance = () => ['admin', 'superAdmin'].includes(userRole);
  const canViewUserManagement = () => userRole === 'superAdmin';

  // Navigation items with authorization checks
  const navItems = [
    { name: "Dashboard", path: "/", icon: <FaHome />, show: true },
    {
      name: "Inventory.M",
      icon: <FaPills />,
      show: canViewInventory(),
      subItems: [
        { 
          name: "All Stock", 
          path: "/products", 
          icon: <FaBox />,
          show: canViewInventory()
        },
        {
          name: "Backstore",
          icon: <FaStore />,
          show: canViewBackstore(),
          subItems: [
            { 
              name: "Store", 
              path: "/backstore", 
              icon: <FaStore />,
              show: canViewBackstore()
            },
            { 
              name: "Store History", 
              path: "/store-history", 
              icon: <FaHistory />,
              show: canViewBackstore()
            },
          ],
        },
        {
          name: "Dispensary",
          icon: <FaCashRegister />,
          show: canViewDispensary(),
          subItems: [
            { 
              name: "Dispensary", 
              path: "/dispensary", 
              icon: <FaCashRegister />,
              show: canViewDispensary()
            },
            { 
              name: "Dispensary History", 
              path: "/dispensary-history", 
              icon: <FaHistory />,
              show: canViewDispensary()
            },
          ],
        },
      ],
    },
    {
      name: "Sales",
      icon: <FaShoppingCart />,
      show: true,
      subItems: [
        { 
          name: "Purchase Order", 
          path: "/purchase-order", 
          icon: <FaClipboardList />,
          show: canViewPurchaseOrder()
        },
        { 
          name: "Receive Order", 
          path: "/receive-order", 
          icon: <FaTruckLoading />,
          show: canViewReceiveOrder()
        },
        { 
          name: "Close Daily Balance", 
          path: "/close-daily-balance", 
          icon: <FaCashRegister />,
          show: canViewCloseBalance()
        },
        { 
          name: "History", 
          path: "/sales-history", 
          icon: <FaHistory />,
          show: true
        },
      ],
    },
    { name: "Notifications", path: "/notifications", icon: <FaBell />, show: true },
    { name: "Reports", path: "/reports", icon: <FaChartLine />, show: true },
    {
      name: "Setting",
      icon: <FiSettings />,
      show: true,
      subItems: [
        { 
          name: "User Managment", 
          path: "/user-managment", 
          icon: <AiOutlineUser />,
          show: canViewUserManagement()
        },
        { 
          name: "Logout", 
          path: "/logout", 
          icon: <AiOutlineLogout />,
          show: true
        },
      ],
    },
  ]

  // Recursive function to check if any child is active
  const isGroupActive = (items) => {
    return items.some((item) => {
      if (item.subItems) {
        return isGroupActive(item.subItems)
      } else {
        return location.pathname === item.path
      }
    })
  }

  // Filter visible items based on user role
  const filterVisibleItems = (items) => {
    return items.filter(item => {
      if (!item.show) return false;
      
      if (item.subItems) {
        item.subItems = filterVisibleItems(item.subItems);
        // Hide parent if no children are visible
        if (item.subItems.length === 0) return false;
      }
      
      return true;
    });
  };

  const visibleNavItems = filterVisibleItems(navItems);

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white w-64 h-screen fixed flex flex-col z-10 shadow-2xl border-r border-slate-700/50">
      {/* Fixed header */}
      <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
        <h1 className="text-2xl font-bold flex items-center group">
          <div className="relative mr-3">
            <FaPills className="text-emerald-400 group-hover:text-emerald-300 transition-all duration-300 group-hover:rotate-12" />
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md group-hover:bg-emerald-300/30 transition-all duration-300"></div>
          </div>
          <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            Pharma<span className="text-emerald-400">Manage</span>
          </span>
        </h1>
        <p className="text-slate-300 text-sm mt-2 font-medium">Drugstore Management System</p>
      </div>

      {/* Scrollable navigation area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        <nav className="mt-4 px-3 space-y-1">
          {visibleNavItems.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleDropdown(item.name.toLowerCase().replace(" ", "-"))}
                    className={`flex items-center justify-between w-full px-4 py-3 transition-all duration-300 transform rounded-xl hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 hover:shadow-lg hover:scale-[1.02] group ${
                      isGroupActive(item.subItems)
                        ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-white shadow-lg border border-emerald-500/20"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`mr-3 text-lg transition-all duration-300 group-hover:scale-110 ${
                          isGroupActive(item.subItems)
                            ? "text-emerald-400"
                            : "text-slate-400 group-hover:text-emerald-400"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div
                      className={`transition-all duration-300 ${
                        openDropdown[item.name.toLowerCase().replace(" ", "-")] ? "rotate-180" : ""
                      }`}
                    >
                      <FaChevronDown className="text-sm" />
                    </div>
                  </button>
                  {openDropdown[item.name.toLowerCase().replace(" ", "-")] && (
                    <div className="ml-4 pl-3 border-l-2 border-gradient-to-b from-emerald-500/50 to-blue-500/50 mt-2 space-y-1">
                      {item.subItems.map((subItem) => (
                        <div key={subItem.name}>
                          {subItem.subItems ? (
                            <>
                              <button
                                onClick={() => toggleDropdown(subItem.name.toLowerCase().replace(" ", "-"))}
                                className={`flex items-center justify-between w-full px-3 py-2 mt-1 transition-all duration-300 transform rounded-lg hover:bg-slate-700/50 hover:scale-[1.02] group ${
                                  isGroupActive(subItem.subItems)
                                    ? "bg-gradient-to-r from-emerald-600/15 to-blue-600/15 text-white"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center">
                                  <span
                                    className={`mr-3 text-sm transition-all duration-300 group-hover:scale-110 ${
                                      isGroupActive(subItem.subItems)
                                        ? "text-emerald-400"
                                        : "group-hover:text-emerald-400"
                                    }`}
                                  >
                                    {subItem.icon}
                                  </span>
                                  <span className="text-sm font-medium">{subItem.name}</span>
                                </div>
                                <div
                                  className={`transition-all duration-300 ${
                                    openDropdown[subItem.name.toLowerCase().replace(" ", "-")] ? "rotate-180" : ""
                                  }`}
                                >
                                  <FaChevronUp className="text-xs" />
                                </div>
                              </button>

                              {openDropdown[subItem.name.toLowerCase().replace(" ", "-")] && (
                                <div className="ml-4 pl-3 border-l border-slate-600 mt-1 space-y-1">
                                  {subItem.subItems.map((nestedItem) => (
                                    <NavLink
                                      key={nestedItem.name}
                                      to={nestedItem.path}
                                      onClick={handleNavClick}
                                      className={({ isActive }) =>
                                        `flex items-center px-3 py-2 transition-all duration-300 transform rounded-lg hover:bg-slate-700/50 hover:scale-[1.02] group ${
                                          isActive
                                            ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-white shadow-md border-l-2 border-emerald-400"
                                            : "text-slate-400 hover:text-white"
                                        }`
                                      }
                                    >
                                      <span
                                        className={`mr-3 text-xs transition-all duration-300 group-hover:scale-110 ${
                                          location.pathname === nestedItem.path
                                            ? "text-emerald-400"
                                            : "group-hover:text-emerald-400"
                                        }`}
                                      >
                                        {nestedItem.icon}
                                      </span>
                                      <span className="text-xs font-medium">{nestedItem.name}</span>
                                    </NavLink>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <NavLink
                              to={subItem.path}
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                `flex items-center px-3 py-2 mt-1 transition-all duration-300 transform rounded-lg hover:bg-slate-700/50 hover:scale-[1.02] group ${
                                  isActive
                                    ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-white shadow-md border-l-2 border-emerald-400"
                                    : "text-slate-400 hover:text-white"
                                }`
                              }
                            >
                              <span
                                className={`mr-3 text-sm transition-all duration-300 group-hover:scale-110 ${
                                  location.pathname === subItem.path
                                    ? "text-emerald-400"
                                    : "group-hover:text-emerald-400"
                                }`}
                              >
                                {subItem.icon}
                              </span>
                              <span className="text-sm font-medium">{subItem.name}</span>
                            </NavLink>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 transition-all duration-300 transform rounded-xl hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 hover:shadow-lg hover:scale-[1.02] group ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-white shadow-lg border border-emerald-500/20"
                        : "text-slate-300 hover:text-white"
                    }`
                  }
                >
                  <span
                    className={`mr-3 text-lg transition-all duration-300 group-hover:scale-110 ${
                      location.pathname === item.path
                        ? "text-emerald-400"
                        : "text-slate-400 group-hover:text-emerald-400"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Fixed footer */}
      <div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
            <FaPills className="text-white text-sm" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-semibold text-white">PharmaManage v1.0</p>
            <p className="text-xs text-slate-400">© 2025 All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar