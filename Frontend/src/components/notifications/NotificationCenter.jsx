import React, { useState } from 'react';
import NotificationItem from './NotificationItem';
import { FaBell, FaCheck, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { useEffect } from 'react';
import Api from "../../data/API.json"
const NotificationCenter = () => {
  const ApiLink=Api.link
  const [activeTab, setActiveTab] = useState('all');
  const [notifs, setNotifs] = useState([]);
  async function FetchNotification(){
    try {
      res= await axios.get(`${ApiLink}/api/notify/notification`,{
      withCredentials:true
     }).then((res)=>{
      console.log(res.data)
      setNotifs(res.data)
     })
    } catch (error) {
      console.log(error)
    }
     
  }
  useEffect(()=>{
    FetchNotification()
  },[])
  const filteredNotifs = activeTab === 'all' 
    ? notifs 
    : notifs.filter(n => n.type.toUpperCase() === activeTab.toUpperCase());

  const markAsRead = async(id) => {
    try {
      res=await axios.put(`${ApiLink}/api/notify/notification/${id}`,{withCredentials:true})
      .then((res)=>{
        console.log(res)
      })
    } catch (error) {
      console.log(error)
    }
    setNotifs(notifs.map(n => 
      n._id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = async() => {
    res = await axios.put(`${ApiLink}/api/notify/MarkAsReadAll`,{
      withCredentials:true
    }).then((res)=>{
      console.log(res)
    })
    setNotifs(notifs.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = async(id) => {
    try {
      res=await axios.delete(`${ApiLink}/api/notify/removeNotification/${id}`,{withCredentials:true})
      .then((res)=>{
        console.log(res)
      })
    } catch (error) {
      console.log(error)
    }
    setNotifs(notifs.filter(n => n._id !== id));
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const getTabTitle = (tab) => {
    switch(tab) {
      case 'all': return 'All Notifications';
      case 'OutOfStock': return 'Sold Out Alerts';
      case 'Expired': return 'Expired Drugs';
      case 'LowStock': return 'Low Stock';
      case 'NearExpiry':return 'nearly expire'
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

              activeTab === 'OutOfStock' 
                ? 'bg-red-100 text-red-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('OutOfStock')}
          >
            Sold Out
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'Expired' 
                ? 'bg-gray-100 text-gray-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('Expired')}
          >
            Expired
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'LowStock' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('LowStock')}
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
                key={notification._id}
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