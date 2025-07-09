// src/components/SalesList.jsx/ReceiveOrder.jsx (Cashier Page)
import React from 'react';
import OrderCard from './SalesComponent/OrderCard';

const ReceiveOrder = () => {
  // Dummy pending orders data
  const pendingOrders = [
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-123',
      patientName: 'John Doe',
      items: [
        {
          id: '1',
          name: 'Amoxicillin',
          brand: 'Generic',
          category: 'Medicine',
          dosageForm: 'Capsule',
          quantity: 2,
          sellingPrice: 3.0,
          total: 6.0
        },
        {
          id: '2',
          name: 'Vitamin C',
          brand: 'NatureMade',
          category: 'Supplement',
          dosageForm: 'Tablet',
          quantity: 1,
          sellingPrice: 2.5,
          total: 2.5
        }
      ],
      totalAmount: 8.5,
      timestamp: '2023-07-15T10:30:00Z',
      pharmacist: 'Dr. Smith'
    },
    {
      id: 'order-456',
      patientName: 'Jane Smith',
      items: [
        {
          id: '3',
          name: 'Hand Sanitizer',
          brand: 'Purell',
          category: 'Sanitary',
          dosageForm: 'Liquid',
          quantity: 3,
          sellingPrice: 4.0,
          total: 12.0
        }
      ],
      totalAmount: 12.0,
      timestamp: '2023-07-15T11:15:00Z',
      pharmacist: 'Dr. Johnson'
    }
  ];

  const completeOrder = (orderId) => {
    alert(`Order ${orderId} completed`);
    // In real implementation, this would call your ConfirmSale API
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