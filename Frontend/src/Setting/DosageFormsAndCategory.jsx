import React, { useState, useEffect } from 'react';
import { FaPills, FaTag, FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Api from "../data/API.json"

const DosageFormsAndCategories = () => {
    const ApiLink = Api.link;
  const [activeTab, setActiveTab] = useState('dosageForms');
  const [dosageForms, setDosageForms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newDosageForm, setNewDosageForm] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState({
    dosageForms: false,
    categories: false,
    addingDosage: false,
    addingCategory: false
  });

  // API configuration with correct base path
  const API = axios.create({
    baseURL: `${ApiLink}/api/form`, // Updated base URL
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });

  // Fetch dosage forms
  const fetchDosageForms = async () => {
    setLoading(prev => ({ ...prev, dosageForms: true }));
    try {
      const response = await API.get('/dosage-forms');
      setDosageForms(response.data);
    } catch (error) {
      toast.error('Failed to fetch dosage forms');
    } finally {
      setLoading(prev => ({ ...prev, dosageForms: false }));
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(prev => ({ ...prev, categories: true }));
    try {
      const response = await API.get('/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  useEffect(() => {
    fetchDosageForms();
    fetchCategories();
  }, []);

  // Create new dosage form
  const handleCreateDosageForm = async () => {
    if (!newDosageForm.trim()) {
      toast.warning('Please enter a dosage form name');
      return;
    }

    setLoading(prev => ({ ...prev, addingDosage: true }));
    try {
      const response = await API.post('/dosage-forms', { name: newDosageForm });
      setDosageForms([...dosageForms, response.data]);
      setNewDosageForm('');
      toast.success('Dosage form created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create dosage form');
    } finally {
      setLoading(prev => ({ ...prev, addingDosage: false }));
    }
  };

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategory.trim()) {
      toast.warning('Please enter a category name');
      return;
    }

    setLoading(prev => ({ ...prev, addingCategory: true }));
    try {
      const response = await API.post('/categories', { name: newCategory });
      setCategories([...categories, response.data]);
      setNewCategory('');
      toast.success('Category created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(prev => ({ ...prev, addingCategory: false }));
    }
  };

  // Delete dosage form
  const handleDeleteDosageForm = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dosage form?')) return;

    try {
      const response = await API.delete(`/dosage-forms/${id}`);
      if (response.data.productCount > 0) {
        toast.warn(`Cannot delete - used by ${response.data.productCount} products`);
        return;
      }
      setDosageForms(dosageForms.filter(form => form._id !== id));
      toast.success('Dosage form deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete dosage form');
    }
  };

  // Delete category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await API.delete(`/categories/${id}`);
      if (response.data.productCount > 0) {
        toast.warn(`Cannot delete - used by ${response.data.productCount} products`);
        return;
      }
      setCategories(categories.filter(category => category._id !== id));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  // Start editing
  const startEditing = (id, currentName, type) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Save edited value
  const saveEdit = async (id, type) => {
    if (!editValue.trim()) {
      toast.warning('Name cannot be empty');
      return;
    }

    try {
      if (type === 'dosageForm') {
        await API.put(`/dosage-forms/${id}`, { name: editValue });
        setDosageForms(dosageForms.map(form => 
          form._id === id ? { ...form, name: editValue } : form
        ));
      } else {
        await API.put(`/categories/${id}`, { name: editValue });
        setCategories(categories.map(category => 
          category._id === id ? { ...category, name: editValue } : category
        ));
      }
      setEditingId(null);
      setEditValue('');
      toast.success('Updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-6xl">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-800 flex items-center">
          <FaPills className="mr-2 sm:mr-3 text-emerald-600" />
          <span className="text-sm sm:text-base md:text-xl lg:text-3xl">
            Dosage Forms & Categories
          </span>
        </h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
          Manage medication dosage forms and product categories
        </p>
      </div>

      {/* Responsive Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('dosageForms')}
            className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
              activeTab === 'dosageForms'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FaPills className="mr-1 sm:mr-2" />
              Dosage Forms
              {loading.dosageForms && (
                <span className="ml-1 sm:ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-r-transparent"></span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
              activeTab === 'categories'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <FaTag className="mr-1 sm:mr-2" />
              Categories
              {loading.categories && (
                <span className="ml-1 sm:ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-r-transparent"></span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Dosage Forms Tab - Responsive */}
      {activeTab === 'dosageForms' && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Dosage Forms</h2>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <input
                type="text"
                value={newDosageForm}
                onChange={(e) => setNewDosageForm(e.target.value)}
                placeholder="Add new dosage form"
                className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded sm:rounded-l-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full"
              />
              <button
                onClick={handleCreateDosageForm}
                disabled={loading.addingDosage}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded sm:rounded-r-md flex items-center justify-center disabled:opacity-50"
              >
                {loading.addingDosage ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent mr-2"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <FaPlus className="mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Add</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dosageForms.map((form) => (
                  <tr key={form._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                      {editingId === form._id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-2 py-1 sm:px-3 sm:py-1 border border-gray-300 rounded-md w-full max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{form.name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                      {editingId === form._id ? (
                        <div className="flex justify-end space-x-1 sm:space-x-2">
                          <button
                            onClick={() => saveEdit(form._id, 'dosageForm')}
                            className="text-emerald-600 hover:text-emerald-900 flex items-center"
                          >
                            <FaSave className="sm:mr-1" /> <span className="hidden sm:inline">Save</span>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-gray-600 hover:text-gray-900 flex items-center ml-2"
                          >
                            <FaTimes className="sm:mr-1" /> <span className="hidden sm:inline">Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2 sm:space-x-4">
                          <button
                            onClick={() => handleDeleteDosageForm(form._id)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <FaTrash className="mr-0 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab - Responsive */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Categories</h2>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Add new category"
                className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded sm:rounded-l-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full"
              />
              <button
                onClick={handleCreateCategory}
                disabled={loading.addingCategory}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded sm:rounded-r-md flex items-center justify-center disabled:opacity-50"
              >
                {loading.addingCategory ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent mr-2"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <FaPlus className="mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Add</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                      {editingId === category._id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-2 py-1 sm:px-3 sm:py-1 border border-gray-300 rounded-md w-full max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{category.name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                      {editingId === category._id ? (
                        <div className="flex justify-end space-x-1 sm:space-x-2">
                          <button
                            onClick={() => saveEdit(category._id, 'category')}
                            className="text-emerald-600 hover:text-emerald-900 flex items-center"
                          >
                            <FaSave className="sm:mr-1" /> <span className="hidden sm:inline">Save</span>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-gray-600 hover:text-gray-900 flex items-center ml-2"
                          >
                            <FaTimes className="sm:mr-1" /> <span className="hidden sm:inline">Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2 sm:space-x-4">
                          <button
                            onClick={() => handleDeleteCategory(category._id)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <FaTrash className="mr-0 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DosageFormsAndCategories;