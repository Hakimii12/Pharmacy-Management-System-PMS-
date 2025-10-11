import React, { useEffect } from 'react';
import OrderCard from './SalesComponent/OrderCard';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Loading from "../Loading/Loading"
import Api from "../../data/API.json"

const ReceiveOrder = () => {
  const ApiLink = Api.link;
  const [pendingOrders, setPendingOrders] = useState([]);
  const [processingOrders, setProcessingOrders] = useState({});

  async function FetchingPendingOrders() {
    try {
      await axios.get(`${ApiLink}/api/sales/pendingStatusItems`, {
        withCredentials: true
      }).then((res) => {
        setPendingOrders(res.data);
      });
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    FetchingPendingOrders();
  }, []);

  const completeOrder = async (orderId) => {
    setProcessingOrders(prev => ({ ...prev, [orderId]: 'completing' }));
    
    try {
      await axios.post(`${ApiLink}/api/sales/confirm/${orderId}`, {}, {
        withCredentials: true
      }).then((res) => {
        setPendingOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        toast.success("✅ Order confirmed and completed");
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete order");
    } finally {
      setProcessingOrders(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    }
  };

  const abortOrder = async (orderId) => {
    setProcessingOrders(prev => ({ ...prev, [orderId]: 'aborting' }));
    
    try {
      await axios.post(`${ApiLink}/api/sales/abort/${orderId}`, {}, {
        withCredentials: true
      }).then((res) => {
        setPendingOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        toast.success("❌ Order Aborted");
      });
    } catch (error) {
      console.log(error);
      toast.error("System having some trouble");
    } finally {
      setProcessingOrders(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pending Cash Orders</h1>
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={FetchingPendingOrders}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          🔄 Refresh
        </button>
        <div className="text-sm text-gray-600">
          💡 <strong>Note:</strong> Credit sales are now processed directly by pharmacists
        </div>
      </div>
      {pendingOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg">No pending cash orders</p>
          <p className="text-gray-400 text-sm mt-2">All cash orders have been processed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingOrders.map(order => (
            <OrderCard 
              key={order.id}
              order={order}
              onComplete={() => completeOrder(order.id)}
              onAbort={() => abortOrder(order.id)}
              isProcessing={processingOrders[order.id] || false}
              processingType={processingOrders[order.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceiveOrder;