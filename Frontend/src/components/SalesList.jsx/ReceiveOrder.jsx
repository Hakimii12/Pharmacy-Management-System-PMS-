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
  const [processingOrders, setProcessingOrders] = useState({}); // Track orders being processed

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
    // Mark this order as processing
    setProcessingOrders(prev => ({ ...prev, [orderId]: 'completing' }));
    
    try {
      await axios.post(`${ApiLink}/api/sales/confirm/${orderId}`, {}, {
        withCredentials: true
      }).then((res) => {
        // Remove the completed order from the list
        setPendingOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        toast.success("Order confirmed");
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete order");
    } finally {
      // Remove from processing state
      setProcessingOrders(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    }
  };

  const abortOrder = async (orderId) => {
    // Mark this order as processing
    setProcessingOrders(prev => ({ ...prev, [orderId]: 'aborting' }));
    
    try {
      await axios.post(`${ApiLink}/api/sales/abort/${orderId}`, {}, {
        withCredentials: true
      }).then((res) => {
        // Remove the aborted order from the list
        setPendingOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        toast.success("Order Aborted");
      });
    } catch (error) {
      console.log(error);
      toast.error("System having some trouble");
    } finally {
      // Remove from processing state
      setProcessingOrders(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pending Orders</h1>
      <button
        onClick={FetchingPendingOrders}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Refresh
      </button>
      {pendingOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg">No pending orders</p>
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