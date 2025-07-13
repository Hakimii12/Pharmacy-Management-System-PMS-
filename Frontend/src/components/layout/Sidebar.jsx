// Updated Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FaHome, FaPills, FaShoppingCart, FaChartLine, FaBell, 
  FaChevronDown, FaChevronUp, FaBox, FaStore, FaCashRegister,
  FaClipboardList, FaTruckLoading, FaHistory, FaUser,
} from 'react-icons/fa';
import { useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import { AiOutlineUser, AiOutlineLogout } from 'react-icons/ai';
const Sidebar = () => {
  const [openDropdown, setOpenDropdown] = useState({
    inventory: false,
    sales: false,
    backstore: false,
    dispensary: false
  });
  const location = useLocation();

  const toggleDropdown = (menu) => {
    setOpenDropdown(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <FaHome /> },
    { 
      name: 'Inventory.M', 
      icon: <FaPills />,
      subItems: [
        { name: 'All Stock', path: '/products', icon: <FaBox /> },
        { 
          name: 'Backstore', 
          icon: <FaStore />,
          subItems: [
            { name: 'Store', path: '/backstore', icon: <FaStore /> },
            { name: 'Store History', path: '/store-history', icon: <FaHistory /> }
          ]
        },
        { 
          name: 'Dispensary', 
          icon: <FaCashRegister />,
          subItems: [
            { name: 'Dispensary', path: '/dispensary', icon: <FaCashRegister /> },
            { name: 'Dispensary History', path: '/dispensary-history', icon: <FaHistory /> }
          ]
        },
      ]
    },
    { 
      name: 'Sales', 
      icon: <FaShoppingCart />,
      subItems: [
        { name: 'Purchase Order', path: '/purchase-order', icon: <FaClipboardList /> },
        { name: 'Receive Order', path: '/receive-order', icon: <FaTruckLoading /> },
        { name: 'Close Daily Balance', path: '/close-daily-balance', icon: <FaCashRegister /> },
        { name: 'History', path: '/sales-history', icon: <FaHistory /> },
        
      ]
    },
    { name: 'Notifications', path: '/notifications', icon: <FaBell /> },
    { name: 'Reports', path: '/reports', icon: <FaChartLine /> },
    { 
      name: 'Setting', 
      icon: <FiSettings />,
      subItems: [
        { name: 'User Managment', path: '/user-managment', icon: <AiOutlineUser /> },
        { name: 'Logout', path: '/logout', icon: <AiOutlineLogout /> },
        
      ]
    }
  ];

  // Recursive function to check if any child is active
  const isGroupActive = (items) => {
    return items.some(item => {
      if (item.subItems) {
        return isGroupActive(item.subItems);
      } else {
        return location.pathname === item.path;
      }
    });
  };

  return (
    <div className="bg-blue-800 text-white w-64 min-h-screen flex flex-col">
      <div className="p-4">
        <h1 className="text-2xl font-bold flex items-center">
          <FaPills className="mr-2 text-blue-300" />
          Pharma<span className="text-blue-300">Manage</span>
        </h1>
        <p className="text-blue-200 text-sm mt-1">Drugstore Management System</p>
      </div>
      
      <nav className="flex-1 mt-6 px-2 space-y-1">
        {navItems.map((item) => (
          <div key={item.name}>
            {item.subItems ? (
              <>
                <button
                  onClick={() => toggleDropdown(item.name.toLowerCase().replace(' ', '-'))}
                  className={`flex items-center justify-between w-full px-4 py-3 transition-colors duration-200 transform rounded-lg hover:bg-blue-700 ${
                    isGroupActive(item.subItems) ? 'bg-blue-900 text-white' : 'text-blue-200'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {openDropdown[item.name.toLowerCase().replace(' ', '-')] ? 
                    <FaChevronUp className="text-sm" /> : 
                    <FaChevronDown className="text-sm" />
                  }
                </button>

                {openDropdown[item.name.toLowerCase().replace(' ', '-')] && (
                  <div className="ml-4 pl-2 border-l border-blue-600">
                    {item.subItems.map((subItem) => (
                      <div key={subItem.name}>
                        {subItem.subItems ? (
                          <>
                            <button
                              onClick={() => toggleDropdown(subItem.name.toLowerCase().replace(' ', '-'))}
                              className={`flex items-center justify-between w-full px-4 py-2 mt-1 transition-colors duration-200 transform rounded-lg hover:bg-blue-700 ${
                                isGroupActive(subItem.subItems) ? 'bg-blue-900 text-white' : 'text-blue-200'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="mr-3 text-sm">{subItem.icon}</span>
                                <span className="text-sm font-medium">{subItem.name}</span>
                              </div>
                              {openDropdown[subItem.name.toLowerCase().replace(' ', '-')] ? 
                                <FaChevronUp className="text-xs" /> : 
                                <FaChevronDown className="text-xs" />
                              }
                            </button>
                            
                            {openDropdown[subItem.name.toLowerCase().replace(' ', '-')] && (
                              <div className="ml-4 pl-2 border-l border-blue-600">
                                {subItem.subItems.map((nestedItem) => (
                                  <NavLink
                                    key={nestedItem.name}
                                    to={nestedItem.path}
                                    className={({ isActive }) =>
                                      `flex items-center px-4 py-2 mt-1 transition-colors duration-200 transform rounded-lg hover:bg-blue-700 ${
                                        isActive ? 'bg-blue-900 text-white' : 'text-blue-200'
                                      }`
                                    }
                                  >
                                    <span className="mr-3 text-xs">{nestedItem.icon}</span>
                                    <span className="text-xs font-medium">{nestedItem.name}</span>
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <NavLink
                            to={subItem.path}
                            className={({ isActive }) =>
                              `flex items-center px-4 py-2 mt-1 transition-colors duration-200 transform rounded-lg hover:bg-blue-700 ${
                                isActive ? 'bg-blue-900 text-white' : 'text-blue-200'
                              }`
                            }
                          >
                            <span className="mr-3 text-sm">{subItem.icon}</span>
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
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 transition-colors duration-200 transform rounded-lg hover:bg-blue-700 ${
                    isActive ? 'bg-blue-900 text-white' : 'text-blue-200'
                  }`
                }
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center">
          <div className="ml-3">
            <p className="text-sm font-medium text-white">PharmaManage v1.0</p>
            <p className="text-xs text-blue-300">© 2023 All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;