import React, { useState } from 'react';
import NotificationItem from './NotificationItem';
import { FaBell, FaCheck, FaTrash } from 'react-icons/fa';
import { notifications } from '../../data/notifications';

const NotificationCenter = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [notifs, setNotifs] = useState(notifications);

  const filteredNotifs = activeTab === 'all' 
    ? notifs 
    : notifs.filter(n => n.type === activeTab.toUpperCase());

  const markAsRead = (id) => {
    setNotifs(notifs.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifs(notifs.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifs(notifs.filter(n => n.id !== id));
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const getTabTitle = (tab) => {
    switch(tab) {
      case 'all': return 'All Notifications';
      case 'sold_out': return 'Sold Out Alerts';
      case 'expired': return 'Expired Drugs';
      case 'low_stock': return 'Low Stock';
      default: return 'Notifications';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FaBell className="mr-2 text-blue-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <button 
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            disabled={unreadCount === 0}
          >
            <FaCheck className="mr-1" /> Mark All as Read
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="flex overflow-x-auto space-x-2 pb-1">
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'all' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'sold_out' 
                ? 'bg-red-100 text-red-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('sold_out')}
          >
            Sold Out
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'expired' 
                ? 'bg-gray-100 text-gray-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('expired')}
          >
            Expired
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'low_stock' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('low_stock')}
          >
            Low Stock
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{getTabTitle(activeTab)}</h3>
        
        <div className="space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            filteredNotifs.map(notification => (
              <NotificationItem 
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default NotificationCenter;