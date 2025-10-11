import React from 'react';

const OrderCard = ({ order, onComplete, onAbort, isProcessing, processingType }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 transition-all duration-200 hover:shadow-md">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg text-gray-800">Order #{order.id.slice(-6)}</h2>
            <p className="text-gray-600 text-sm mt-1">Patient: {order.patientName}</p>
            <p className="text-xs text-blue-600 mt-1">💰 Cash Sale</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            isProcessing 
              ? processingType === 'completing' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-orange-100 text-orange-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isProcessing 
              ? processingType === 'completing' 
                ? '🔄 Completing...' 
                : '🔄 Aborting...' 
              : '⏳ Pending'
            }
          </span>
        </div>
      </div>
      
      <div className="p-4 border-b">
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between text-sm py-1">
              <div className="flex-1">
                <span className="font-medium text-gray-800">{item.name}</span>
                <div className="text-xs text-gray-500 mt-1">
                  {item.brand} • {item.category} • Qty: {item.quantity}
                </div>
              </div>
              <div className="font-medium text-gray-800">
                ETB {item.total.toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-4 bg-gray-50 flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-600">Total:</span>
          <span className="font-bold text-lg text-gray-800 ml-2">ETB {order.totalAmount.toFixed(2)}</span>
        </div>
        <div className="space-x-2">
          <button
            onClick={onAbort}
            disabled={isProcessing}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              isProcessing 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {isProcessing && processingType === 'aborting' ? (
              <span className="flex items-center">
                <span className="mr-1">⏳</span> Aborting...
              </span>
            ) : '❌ Abort'}
          </button>
          <button
            onClick={onComplete}
            disabled={isProcessing}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              isProcessing 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isProcessing && processingType === 'completing' ? (
              <span className="flex items-center">
                <span className="mr-1">⏳</span> Completing...
              </span>
            ) : '✅ Complete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;