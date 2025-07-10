
import React, { useEffect } from 'react';
import OrderCard from './SalesComponent/OrderCard';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'react-toastify';
const ReceiveOrder = () => {
  const [pendingOrders,setPendingOrders]=useState([])
  async function FetchingPendingOrders(){
  try {
        await axios.get("http://localhost:5000/api/sales/sales/pendingStatusItems",{
      withCredentials:true
    }).then((res)=>{
      setPendingOrders(res.data)
    })
  } catch (error) {
    console.error(error)
  }
  }
  useEffect(()=>{
      FetchingPendingOrders()
  })
  // const pendingOrders = [
  //   {
  //     id: 'order-123',
  //     patientName: 'John Doe',
  //     items: [
  //       {
  //         id: '1',
  //         name: 'Amoxicillin',
  //         brand: 'Generic',
  //         category: 'Medicine',
  //         dosageForm: 'Capsule',
  //         quantity: 2,
  //         sellingPrice: 3.0,
  //         total: 6.0
  //       },
  //       {
  //         id: '2',
  //         name: 'Vitamin C',
  //         brand: 'NatureMade',
  //         category: 'Supplement',
  //         dosageForm: 'Tablet',
  //         quantity: 1,
  //         sellingPrice: 2.5,
  //         total: 2.5
  //       }
  //     ],
  //     totalAmount: 8.5,
  //     timestamp: '2023-07-15T10:30:00Z',
  //     pharmacist: 'Dr. Smith'
  //   },
  //   {
  //     id: 'order-1234',
  //     patientName: 'John Doe',
  //     items: [
  //       {
  //         id: '17',
  //         name: 'Amoxicillin',
  //         brand: 'Generic',
  //         category: 'Medicine',
  //         dosageForm: 'Capsule',
  //         quantity: 2,
  //         sellingPrice: 3.0,
  //         total: 6.0
  //       },
  //       {
  //         id: '27',
  //         name: 'Vitamin C',
  //         brand: 'NatureMade',
  //         category: 'Supplement',
  //         dosageForm: 'Tablet',
  //         quantity: 1,
  //         sellingPrice: 2.5,
  //         total: 2.5
  //       }
  //     ],
  //     totalAmount: 8.5,
  //     timestamp: '2023-07-15T10:30:00Z',
  //     pharmacist: 'Dr. Smith'
  //   },
  //   {
  //     id: 'order-1238',
  //     patientName: 'John Doe',
  //     items: [
  //       {
  //         id: '10',
  //         name: 'Amoxicillin',
  //         brand: 'Generic',
  //         category: 'Medicine',
  //         dosageForm: 'Capsule',
  //         quantity: 2,
  //         sellingPrice: 3.0,
  //         total: 6.0
  //       },
  //       {
  //         id: '289',
  //         name: 'Vitamin C',
  //         brand: 'NatureMade',
  //         category: 'Supplement',
  //         dosageForm: 'Tablet',
  //         quantity: 1,
  //         sellingPrice: 2.5,
  //         total: 2.5
  //       }
  //     ],
  //     totalAmount: 8.5,
  //     timestamp: '2023-07-15T10:30:00Z',
  //     pharmacist: 'Dr. Smith'
  //   },
  //   {
  //     id: 'order-12397',
  //     patientName: 'John Doe',
  //     items: [
  //       {
  //         id: '180',
  //         name: 'Amoxicillin',
  //         brand: 'Generic',
  //         category: 'Medicine',
  //         dosageForm: 'Capsule',
  //         quantity: 2,
  //         sellingPrice: 3.0,
  //         total: 6.0
  //       },
  //       {
  //         id: '254',
  //         name: 'Vitamin C',
  //         brand: 'NatureMade',
  //         category: 'Supplement',
  //         dosageForm: 'Tablet',
  //         quantity: 1,
  //         sellingPrice: 2.5,
  //         total: 2.5
  //       }
  //     ],
  //     totalAmount: 8.5,
  //     timestamp: '2023-07-15T10:30:00Z',
  //     pharmacist: 'Dr. Smith'
  //   }
  // ];

  const completeOrder = async(orderId) => {
    console.log(orderId)
    try {
      await axios.post(`http://localhost:5000/api/sales/sales/confirm/${orderId}`,{},{
        withCredentials:true
      }).then((res)=>{
        console.log(res)
        toast.success("Order confirmed")
      })
    } catch (error) {
      console.error(error)
      // if(response.data.message=="Authentication required"){
      //   console.log
      // }
      // localStorage.removeItem("user-threads");
      // sessionStorage.clear();
      // setIsAuth(false);
    }
  };

  const abortOrder = (orderId) => {
    alert(`Order ${orderId} aborted`);
    // In real implementation, this would call your AbortSale API
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pending Orders</h1>
      
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceiveOrder;