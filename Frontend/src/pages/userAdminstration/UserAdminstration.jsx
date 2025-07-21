// src/pages/UserAdminstration.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useContext } from 'react';
import { ContextProvider } from '../../contexts/AppContext';
import Api from "../../data/API.json" 
const UserAdminstration = () => {
  const ApiLink=Api.link
  const { isAuth, setIsAuth } = useContext(ContextProvider);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Fetch users when user management tab is active
  useEffect(() => {
    if (activeTab === 'users' && isAuth) {
      fetchUsers();
    }
  }, [activeTab, isAuth]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${ApiLink}/api/user/getAllUser`, {
        withCredentials: true
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      setLoading(true);
      await axios.post(`${ApiLink}/api/user/approval/${newStatus}/${userId}`, {}, {
        withCredentials: true
      });
      toast.success(`User status updated to ${newStatus}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status: ' + (error.response?.data?.message || error.message));
      setLoading(false);
      console.log(error)
    }
  };

  const handleAdminRegister = async (e) => {
    e.preventDefault();
    
    if (adminForm.password !== adminForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post(`${ApiLink}/api/user/register`, {
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
        role: 'admin'
      }, {
        withCredentials: true
      });
      
      toast.success('Admin registered successfully!');
      setAdminForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register admin');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'superAdmin': return 'bg-indigo-100 text-indigo-800';
      case 'pharmacist': return 'bg-cyan-100 text-cyan-800';
      case 'casher': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6">
        {/* Dashboard Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">user Managment</h1>
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('register')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Register Admin
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className="bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition duration-200"
            >
              Manage Users
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'dashboard' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            All status
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('register')}
          >
            Admin Registration
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Stats</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-indigo-800">Total Users</h3>
                  <p className="text-3xl font-bold mt-2">{users.length}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-green-800">Active Users</h3>
                  <p className="text-3xl font-bold mt-2">
                    {users.filter(u => u.status === 'approved').length}
                  </p>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-800">Pending Approvals</h3>
                  <p className="text-3xl font-bold mt-2">
                    {users.filter(u => u.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                <button 
                  onClick={fetchUsers}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh Users'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-700 font-bold">{user.name.charAt(0)}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            {user.status !== 'approved' && (
                              <button
                                onClick={() => handleStatusChange(user._id, 'approve')}
                                className="text-green-600 hover:text-green-900"
                                disabled={loading}
                              >
                                Approve
                              </button>
                            )}
                            {user.status !== 'suspended' && (
                              <button
                                onClick={() => handleStatusChange(user._id, 'suspend')}
                                className="text-purple-600 hover:text-purple-900"
                                disabled={loading}
                              >
                                Suspend
                              </button>
                            )}
                            {user.status !== 'rejected' && (
                              <button
                                onClick={() => handleStatusChange(user._id, 'reject')}
                                className="text-red-600 hover:text-red-900"
                                disabled={loading}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    No users found
                  </div>
                )}
                {loading && (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Register New Admin</h2>
              <form onSubmit={handleAdminRegister}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({...adminForm, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    minLength="6"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm({...adminForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    minLength="6"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-200"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register Admin'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAdminstration;