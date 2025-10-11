import React, { useState } from 'react';
import Api from "../../../data/API.json"
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const HistoryTable = ({ history: initialHistory, onUndoProduct }) => {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [history, setHistory] = useState(initialHistory);
  const [loadingUndo, setLoadingUndo] = useState({});
  
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState({ 
    isOpen: false, 
    order: null 
  });
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `${(amount || 0).toFixed(2)} ETB`;
  };

  const getStatusBadge = (status, paymentStatus, dueDate) => {
    let badgeClass = '';
    let text = status;

    if (status === 'completed' && paymentStatus === 'paid') {
      badgeClass = 'bg-green-100 text-green-800';
      text = 'Paid';
    } else if (status === 'completed' && paymentStatus === 'partial') {
      badgeClass = 'bg-yellow-100 text-yellow-800';
      text = 'Partial';
    } else if (status === 'credit' || paymentStatus === 'credit') {
      badgeClass = 'bg-blue-100 text-blue-800';
      text = 'Credit';
    } else if (paymentStatus === 'overdue') {
      badgeClass = 'bg-red-100 text-red-800';
      text = 'Overdue';
    } else if (status === 'aborted') {
      badgeClass = 'bg-red-100 text-red-800';
      text = 'Aborted';
    } else if (status === 'refunded') {
      badgeClass = 'bg-gray-100 text-gray-800';
      text = 'Refunded';
    }

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
        {text}
      </span>
    );
  };

  const getSaleTypeBadge = (saleType) => {
    const badgeClass = saleType === 'credit' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
        {saleType || 'cash'}
      </span>
    );
  };

  const handleUndoProduct = async (orderId, productId) => {
    const key = `${orderId}_${productId}`;
    setLoadingUndo(prev => ({ ...prev, [key]: true }));
    try {
      const response = await axios.post(
        `${Api.link}/api/sales/undo`,
        { transactionId: orderId, productId },
        { withCredentials: true }
      );

      if (response.data.success) {
        setHistory(prev =>
          prev.map(order => {
            if (order.id === orderId) {
              const updatedItems = order.items.filter(item => item.productId !== productId);
              if (updatedItems.length === 0) {
                return null;
              }
              return {
                ...order,
                items: updatedItems,
                totalAmount: updatedItems.reduce((sum, item) => sum + item.total, 0)
              };
            }
            return order;
          }).filter(Boolean)
        );
        toast.success('Product refund processed successfully');
      } else {
        toast.error('Failed to process refund');
      }
    } catch (error) {
      console.error('Error undoing transaction:', error);
      toast.error('Failed to process refund: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingUndo(prev => ({ ...prev, [key]: false }));
    }
  };

  // Handle credit payment
  const handleCreditPayment = (order) => {
    setPaymentModal({
      isOpen: true,
      order: order
    });
    setPaymentAmount(order.remainingBalance || 0);
    setPaymentMethod('cash');
    setPaymentNotes('');
  };

  const processCreditPayment = async () => {
    const { order } = paymentModal;
    
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > order.remainingBalance) {
      toast.error('Payment amount cannot exceed remaining balance');
      return;
    }

    setProcessingPayment(true);

    try {
      const payload = {
        transactionId: order.id,
        paymentAmount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod,
        notes: paymentNotes
      };

      const response = await axios.post(
        `${Api.link}/api/sales/process-credit-payment`,
        payload,
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(`✅ Payment of ${formatCurrency(paymentAmount)} recorded successfully`);
        
        // Refresh the entire history to get accurate data from backend
        try {
          const refreshResponse = await axios.get(`${Api.link}/api/sales/allTransactionHistory`, {
            withCredentials: true
          });
          setHistory(refreshResponse.data);
        } catch (refreshError) {
          console.error('Error refreshing data:', refreshError);
          // Fallback: update locally with backend response
          setHistory(prev =>
            prev.map(prevOrder => {
              if (prevOrder.id === order.id) {
                return {
                  ...prevOrder,
                  amountPaid: response.data.totalAmountPaid || (prevOrder.amountPaid + paymentAmount),
                  remainingBalance: response.data.newTotalBalance || (prevOrder.remainingBalance - paymentAmount),
                  paymentStatus: response.data.paymentStatus,
                  status: response.data.paymentStatus === 'paid' ? 'completed' : prevOrder.status
                };
              }
              return prevOrder;
            })
          );
        }

        setPaymentModal({ isOpen: false, order: null });
      } else {
        toast.error('Failed to process payment');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error(error.response?.data?.error || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Payment Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">💳 Process Credit Payment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order ID</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{paymentModal.order.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="text-sm">{paymentModal.order.patientName}</p>
                {paymentModal.order.customerPhone && (
                  <p className="text-xs text-gray-500">{paymentModal.order.customerPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Remaining Balance</label>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(paymentModal.order.remainingBalance)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Amount *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={paymentModal.order.remainingBalance}
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="mobile_money">📱 Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows="2"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Additional payment notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setPaymentModal({ isOpen: false, order: null })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={processCreditPayment}
                disabled={processingPayment || !paymentAmount}
                className={`px-4 py-2 rounded ${
                  processingPayment || !paymentAmount
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {processingPayment ? 'Processing...' : '💳 Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid/Balance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map(order => (
            <React.Fragment key={order.id}>
              <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{order.id.slice(-6)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.patientName}
                  {order.customerPhone && (
                    <div className="text-xs text-gray-500">{order.customerPhone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.completedAt || order.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getSaleTypeBadge(order.saleType)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getStatusBadge(order.status, order.paymentStatus, order.dueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {order.saleType === 'credit' ? (
                    <div>
                      <div className="text-green-600">Paid: {formatCurrency(order.amountPaid || 0)}</div>
                      <div className="text-red-600">Balance: {formatCurrency(order.remainingBalance || order.totalAmount)}</div>
                    </div>
                  ) : (
                    <span className="text-green-600">Paid: {formatCurrency(order.totalAmount)}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(order.id);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {expandedOrder === order.id ? '▲ Collapse' : '▼ Expand'}
                    </button>
                    {order.saleType === 'credit' && (order.remainingBalance > 0 || order.totalAmount > (order.amountPaid || 0)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreditPayment(order);
                        }}
                        className="text-green-600 hover:text-green-900 ml-2"
                        title="Record Payment"
                      >
                        💳 Pay
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {expandedOrder === order.id && (
                <tr>
                  <td colSpan="8" className="px-6 py-4 bg-gray-50">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Order Summary */}
                        <div className="bg-white p-4 rounded border">
                          <h4 className="font-semibold mb-2">Order Summary</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Transaction ID:</span>
                              <span className="font-mono">{order.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Patient:</span>
                              <span>{order.patientName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sale Type:</span>
                              <span className="font-semibold">{order.saleType?.toUpperCase() || 'CASH'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <span>{order.status}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payment Status:</span>
                              <span>{order.paymentStatus}</span>
                            </div>
                            {order.customerPhone && (
                              <div className="flex justify-between">
                                <span>Customer Phone:</span>
                                <span>{order.customerPhone}</span>
                              </div>
                            )}
                            {order.dueDate && (
                              <div className="flex justify-between">
                                <span>Due Date:</span>
                                <span className={new Date(order.dueDate) < new Date() ? 'text-red-600 font-semibold' : ''}>
                                  {formatDate(order.dueDate)}
                                  {new Date(order.dueDate) < new Date() && ' (Overdue)'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Information */}
                        {(order.saleType === 'credit' || order.paymentStatus === 'partial') && (
                          <div className="bg-white p-4 rounded border">
                            <h4 className="font-semibold mb-2">Payment Information</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Total Amount:</span>
                                <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Amount Paid:</span>
                                <span className="text-green-600">{formatCurrency(order.amountPaid || 0)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1">
                                <span>Remaining Balance:</span>
                                <span className="text-red-600 font-semibold">
                                  {formatCurrency(order.remainingBalance || (order.totalAmount - (order.amountPaid || 0)))}
                                </span>
                              </div>
                              {(order.remainingBalance > 0 || order.totalAmount > (order.amountPaid || 0)) && (
                                <button
                                  onClick={() => handleCreditPayment(order)}
                                  className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                                >
                                  💳 Record Payment
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <h3 className="font-medium">Order Items</h3>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {order.items.map((item, index) => {
                            const key = `${order.id}_${item.productId}`;
                            return (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.brand}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.category}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.dosageForm}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{formatCurrency(item.sellingPrice)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{formatCurrency(item.total)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  {order.status === 'completed' && order.paymentStatus !== 'credit' && (
                                    <button
                                      onClick={() => handleUndoProduct(order.id, item.productId)}
                                      className={`text-red-600 hover:text-red-900 px-2 py-1 rounded ${loadingUndo[key] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      disabled={loadingUndo[key]}
                                    >
                                      {loadingUndo[key] ? 'Undoing...' : 'Undo'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      
      {history.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No transactions found</p>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;