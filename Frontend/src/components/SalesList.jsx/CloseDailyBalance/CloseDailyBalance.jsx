import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContextProvider } from '../../../contexts/AppContext';
import axios from 'axios';
import { FaMoneyBillWave, FaCalculator, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CloseDailyBalance = () => {
//   const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    countedAmount: '',
    date: new Date()
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyBalances, setDailyBalances] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

//   useEffect(() => {
//     if (!user || user.role !== 'cashier') {
//       navigate('/');
//     }
//   }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, date });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/sales/sales/close-balance', {
        cashierId: user._id,
        countedAmount: parseFloat(formData.countedAmount),
        date: formData.date
      });
      
      setResult(response.data);
      fetchDailyBalances();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close daily balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyBalances = async () => {
    try {
      const response = await axios.get(`/api/daily-balance?cashierId=${user._id}`);
      setDailyBalances(response.data);
    } catch (err) {
      console.error('Failed to fetch daily balances:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  useEffect(() => {
    fetchDailyBalances();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-6">
          <FaMoneyBillWave className="text-3xl text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">Close Daily Balance</h1>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Cashier
              </label>
              <input
                type="text"
                value='abel'
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Date
              </label>
              <DatePicker
                selected={formData.date}
                onChange={handleDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxDate={new Date()}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Counted Amount
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                $
              </span>
              <input
                type="number"
                name="countedAmount"
                value={formData.countedAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full pl-8 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter counted amount"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center w-full py-3 px-4 rounded-md text-white font-medium ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <FaCalculator className="mr-2" />
                Close Daily Balance
              </>
            )}
          </button>
        </form>

        {result && (
          <div className={`p-4 rounded-md mb-6 ${
            result.dailyBalance.status === 'verified' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <div className="flex items-start">
              {result.dailyBalance.status === 'verified' ? (
                <FaCheckCircle className="text-2xl mr-3 mt-1 text-green-600" />
              ) : (
                <FaExclamationTriangle className="text-2xl mr-3 mt-1 text-yellow-600" />
              )}
              <div>
                <h3 className="text-lg font-bold mb-2">
                  {result.dailyBalance.status === 'verified' 
                    ? 'Balance Verified Successfully!' 
                    : 'Balance Discrepancy Found!'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Expected Amount</p>
                    <p className="font-semibold">{formatCurrency(result.dailyBalance.expectedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Counted Amount</p>
                    <p className="font-semibold">{formatCurrency(result.dailyBalance.countedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="font-semibold">{result.transactionCount}</p>
                  </div>
                </div>
                
                {result.dailyBalance.status === 'discrepancy' && (
                  <div className="mt-2">
                    <p className="font-medium">Discrepancy Note:</p>
                    <p>{result.dailyBalance.discrepancyNote}</p>
                  </div>
                )}
                
                <button 
                  onClick={() => setResult(null)}
                  className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close This Report
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Balance History</h2>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>
          
          {showHistory && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b text-left">Date</th>
                    <th className="py-2 px-4 border-b text-left">Expected</th>
                    <th className="py-2 px-4 border-b text-left">Counted</th>
                    <th className="py-2 px-4 border-b text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyBalances.map((balance) => (
                    <tr key={balance._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-b">{formatDate(balance.date)}</td>
                      <td className="py-3 px-4 border-b">{formatCurrency(balance.expectedAmount)}</td>
                      <td className="py-3 px-4 border-b">{formatCurrency(balance.countedAmount)}</td>
                      <td className="py-3 px-4 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          balance.status === 'verified' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {balance.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {dailyBalances.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No balance records found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloseDailyBalance;