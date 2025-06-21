
import { NavLink } from 'react-router-dom';
import { 
  FaHome, FaPills, FaShoppingCart, FaChartLine, FaBell 
} from 'react-icons/fa';
import { FaClipboardList } from 'react-icons/fa';


const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <FaHome /> },
    { name: 'Products', path: '/products', icon: <FaPills /> },
    { name: 'Sales', path: '/sales', icon: <FaShoppingCart /> },
    { name: 'Notifications', path: '/notifications', icon: <FaBell /> },
    { name: 'Reports', path: '/reports', icon: <FaChartLine /> },
  ];

  return (
    <div className="bg-blue-800 text-white w-64 min-h-screen flex flex-col">
      <div className="p-4">
        <h1 className="text-2xl font-bold flex items-center">
          <FaPills className="mr-2 text-blue-300" />
          Pharma<span className="text-blue-300">Manage</span>
        </h1>
        <p className="text-blue-200 text-sm mt-1">Drugstore Management System</p>
      </div>
      
      <nav className="flex-1 mt-6 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 mt-1 transition-colors duration-200 transform rounded-lg hover:bg-blue-700 ${
                isActive ? 'bg-blue-900 text-white' : 'text-blue-200'
              }`
            }
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
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