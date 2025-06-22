import { useState } from 'react';
import { 
  FaExclamationCircle, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaTimesCircle,
  FaCheck,
  FaTrash,
  FaBell,
  FaEdit,
  FaTimes,
  FaSave
} from 'react-icons/fa';

const NotificationItem = ({ notification, onMarkAsRead, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    stock: notification.stock || 0,
    expirationDate: notification.expirationDate || '',
    price: notification.price || 0
  });
  // Get appropriate icon and color based on notification type
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'SOLD_OUT':
        return {
          icon: <FaTimesCircle className="text-xl" />,
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200'
        };
      case 'EXPIRED':
        return {
          icon: <FaExclamationCircle className="text-xl" />,
          bgColor: 'bg-gray-100',
          iconColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
      case 'LOW_STOCK':
        return {
          icon: <FaExclamationTriangle className="text-xl" />,
          bgColor: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-200'
        };
      case 'NEAR_EXPIRY':
        return {
          icon: <FaExclamationTriangle className="text-xl" />,
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-600',
          borderColor: 'border-orange-200'
        };
      default:
        return {
          icon: <FaInfoCircle className="text-xl" />,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        };
    }
  };

  // Get notification title based on type
  const getNotificationTitle = () => {
    switch (notification.type) {
      case 'SOLD_OUT':
        return 'Sold Out';
      case 'EXPIRED':
        return 'Expired Drug';
      case 'LOW_STOCK':
        return 'Low Stock';
      case 'NEAR_EXPIRY':
        return 'Near Expiry';
      case 'NEW_DRUG':
        return 'New Drug Added';
      default:
        return 'Notification';
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: name === 'stock' || name === 'price' ? parseInt(value) || 0 : value
    }));
  };

  const handleEditSubmit = () => {
    onEdit(notification.id, editedData);
    setIsEditing(false);
  };

  const { icon, bgColor, iconColor, borderColor } = getNotificationIcon();
  const title = getNotificationTitle();
  const timeAgo = formatTime(notification.timestamp);

  if (isEditing) {
    return (
      <div className={`border rounded-xl mb-3 overflow-hidden ${borderColor} bg-white`}>
        <div className="flex">
          <div className={`${bgColor} ${iconColor} p-4 flex items-center justify-center`}>
            {icon}
          </div>
          
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-gray-800">{title}</h3>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {timeAgo}
              </span>
            </div>
            
            <div className="mt-3 space-y-3">
              {(notification.type === 'LOW_STOCK' || notification.type === 'SOLD_OUT') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">New Stock</label>
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      value={editedData.stock}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Price</label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      value={editedData.price}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
              
              {notification.type === 'NEAR_EXPIRY' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Expiration Date</label>
                  <input
                    name="expirationDate"
                    type="date"
                    value={editedData.expirationDate}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg border border-gray-300"
              >
                <FaTimes className="mr-1" /> Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="flex items-center text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg"
              >
                <FaSave className="mr-1" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-xl mb-3 overflow-hidden ${borderColor} ${
      notification.read ? 'bg-white' : 'bg-blue-50'
    }`}>
      <div className="flex">
        {/* Icon section */}
        <div className={`${bgColor} ${iconColor} p-4 flex items-center justify-center`}>
          {icon}
        </div>
        
        {/* Content section */}
        <div className="flex-1 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center">
                {!notification.read && (
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                )}
                {title}
              </h3>
              <p className="text-gray-600 mt-1">{notification.message}</p>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-between items-center mt-3">
            <div className="space-x-2">
              {(notification.type === 'LOW_STOCK' || notification.type === 'SOLD_OUT') && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center text-sm text-gray-600 hover:text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <FaEdit className="mr-1" /> Edit
                </button>
              )}
              
              {(notification.type === 'EXPIRED' || notification.type === 'NEAR_EXPIRY') && (
                <button
                  onClick={() => onDelete(notification.id)}
                  className="flex items-center text-sm text-gray-600 hover:text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <FaTrash className="mr-1" /> Delete
                </button>
              )}
            </div>
            
            <div className="space-x-2">
              {!notification.read && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="flex items-center text-sm text-gray-600 hover:text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <FaCheck className="mr-1" /> Mark as Read
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                className="flex items-center text-sm text-gray-600 hover:text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <FaTrash className="mr-1" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional context for certain notification types */}
      {notification.type === 'LOW_STOCK' && (
        <div className="bg-yellow-50 px-4 py-2 text-sm border-t border-yellow-100">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-yellow-500 mr-2" />
            <span>Consider reordering soon to avoid stockouts</span>
          </div>
        </div>
      )}
      
      {notification.type === 'NEAR_EXPIRY' && (
        <div className="bg-orange-50 px-4 py-2 text-sm border-t border-orange-100">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-orange-500 mr-2" />
            <span>Consider discounting or special promotions</span>
          </div>
        </div>
      )}
      
      {notification.type === 'EXPIRED' && (
        <div className="bg-red-50 px-4 py-2 text-sm border-t border-red-100">
          <div className="flex items-center">
            <FaExclamationCircle className="text-red-500 mr-2" />
            <span>Remove from shelves immediately</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;