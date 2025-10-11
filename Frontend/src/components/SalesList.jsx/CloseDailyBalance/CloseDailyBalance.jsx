import { useState, useEffect } from "react"
import { CalendarDays, DollarSign, Users, AlertTriangle, CheckCircle, XCircle, Search, Filter, CreditCard, History, User, Phone, MapPin, Plus, Minus, Eye, EyeOff, TrendingUp, BarChart3, Wallet, Undo2 } from "lucide-react"
import axios from "axios"
import Api from "../../../data/API.json"

// Configure axios defaults
axios.defaults.withCredentials = true

export default function CreditManagement() {
  const ApiLink = Api.link
  const [creditSales, setCreditSales] = useState([])
  const [filteredSales, setFilteredSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedTransactions, setExpandedTransactions] = useState(new Set())
  const [filters, setFilters] = useState({
    paymentStatus: '',
    customerPhone: ''
  })

  // Payment form states per transaction
  const [paymentForms, setPaymentForms] = useState({})
  const [processingPayments, setProcessingPayments] = useState({})
  const [undoingTransactions, setUndoingTransactions] = useState({})

  // Card color themes
  const cardThemes = [
    {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      header: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      accent: 'text-blue-600'
    },
    {
      bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
      border: 'border-purple-200',
      header: 'bg-gradient-to-r from-purple-500 to-pink-500',
      accent: 'text-purple-600'
    },
    {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      border: 'border-green-200',
      header: 'bg-gradient-to-r from-green-500 to-emerald-500',
      accent: 'text-green-600'
    },
    {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      border: 'border-orange-200',
      header: 'bg-gradient-to-r from-orange-500 to-amber-500',
      accent: 'text-orange-600'
    },
    {
      bg: 'bg-gradient-to-br from-indigo-50 to-violet-50',
      border: 'border-indigo-200',
      header: 'bg-gradient-to-r from-indigo-500 to-violet-500',
      accent: 'text-indigo-600'
    }
  ]

  const getCardTheme = (index) => {
    return cardThemes[index % cardThemes.length]
  }

  // Fetch credit sales
  const fetchCreditSales = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (filters.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus)
      if (filters.customerPhone) queryParams.append('customerPhone', filters.customerPhone)

      const response = await axios.get(`${ApiLink}/api/sales/credit-sales?${queryParams}`)
      
      if (response.data.success) {
        const sales = response.data.creditSales || []
        setCreditSales(sales)
        setFilteredSales(sales)
        
        // Initialize payment forms for each transaction
        const initialForms = {}
        sales.forEach(sale => {
          initialForms[sale.transactionId] = {
            paymentAmount: sale.totalRemainingBalance > 0 ? Math.min(100, sale.totalRemainingBalance) : 0,
            paymentMethod: 'cash',
            notes: ''
          }
        })
        setPaymentForms(initialForms)
      }
    } catch (error) {
      console.error('Error fetching credit sales:', error)
      alert('Failed to load credit sales')
    } finally {
      setLoading(false)
    }
  }

  // Process credit payment for a specific transaction
  const processPayment = async (transactionId) => {
    if (!paymentForms[transactionId]?.paymentAmount || paymentForms[transactionId].paymentAmount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    setProcessingPayments(prev => ({ ...prev, [transactionId]: true }))
    
    try {
      const paymentData = {
        transactionId,
        paymentAmount: parseFloat(paymentForms[transactionId].paymentAmount),
        paymentMethod: paymentForms[transactionId].paymentMethod,
        notes: paymentForms[transactionId].notes
      }

      const response = await axios.post(`${ApiLink}/api/sales/process-credit-payment`, paymentData)
      
      if (response.data.success) {
        // Success animation effect
        const successElement = document.getElementById(`success-${transactionId}`)
        if (successElement) {
          successElement.classList.remove('hidden')
          setTimeout(() => {
            successElement.classList.add('hidden')
          }, 3000)
        }
        
        // Refresh the data after a brief delay to show success animation
        setTimeout(() => {
          fetchCreditSales()
        }, 1000)
      } else {
        alert(`Payment failed: ${response.data.error}`)
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      alert(error.response?.data?.error || 'Failed to process payment')
    } finally {
      setProcessingPayments(prev => ({ ...prev, [transactionId]: false }))
    }
  }

  // Undo payment for paid or partial transactions
 // Undo payment for paid or partial transactions
const undoPayment = async (transactionId) => {
  if (!confirm('Are you sure you want to undo this payment? This will refund all payments and restore the credit balance. This action cannot be undone.')) {
    return
  }

  setUndoingTransactions(prev => ({ ...prev, [transactionId]: true }))
  
  try {
    // For credit sales, we only send transactionId (no productId)
    const response = await axios.post(`${ApiLink}/api/sales/undo`, { 
      transactionId 
      // Don't send productId for credit sales - the backend will handle all items
    })
    
    if (response.data.success) {
      // Success animation effect
      const successElement = document.getElementById(`undo-success-${transactionId}`)
      if (successElement) {
        successElement.classList.remove('hidden')
        setTimeout(() => {
          successElement.classList.add('hidden')
        }, 3000)
      }
      
      // Refresh the data after a brief delay to show success animation
      setTimeout(() => {
        fetchCreditSales()
      }, 1000)
    } else {
      alert(`Undo failed: ${response.data.error}`)
    }
  } catch (error) {
    console.error('Error undoing payment:', error)
    alert(error.response?.data?.error || 'Failed to undo payment')
  } finally {
    setUndoingTransactions(prev => ({ ...prev, [transactionId]: false }))
  }
}

  // Update payment form for a specific transaction
  const updatePaymentForm = (transactionId, field, value) => {
    setPaymentForms(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        [field]: value
      }
    }))
  }

  // Toggle transaction expansion
  const toggleTransactionExpansion = (transactionId) => {
    setExpandedTransactions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }

  // Apply filters
  useEffect(() => {
    let filtered = creditSales
    
    if (filters.paymentStatus) {
      filtered = filtered.filter(sale => sale.paymentStatus === filters.paymentStatus)
    }
    
    if (filters.customerPhone) {
      filtered = filtered.filter(sale => 
        sale.customerPhone?.includes(filters.customerPhone)
      )
    }
    
    setFilteredSales(filtered)
  }, [filters, creditSales])

  // Load credit sales on component mount
  useEffect(() => {
    fetchCreditSales()
  }, [])

  const getStatusBadge = (status) => {
    const statusConfig = {
      'paid': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'partial': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
      'credit': { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
    }
    
    const config = statusConfig[status] || statusConfig.credit
    const IconComponent = config.icon
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDueDateColor = (dueDate) => {
    const daysUntilDue = getDaysUntilDue(dueDate)
    if (daysUntilDue < 0) return 'text-red-600 bg-red-50 border-red-200'
    if (daysUntilDue <= 3) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  // Check if transaction can be undone (paid or partial status)
  const canUndoTransaction = (sale) => {
    return sale.paymentStatus === 'paid' || sale.paymentStatus === 'partial'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-2xl mb-3 sm:mb-4 transform hover:scale-105 transition-transform duration-300">
            <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Credit Management
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">Manage credit sales and process payments</p>
        </div>

        {/* Summary Stats */}
        {filteredSales.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl font-bold">{filteredSales.length}</div>
                  <div className="text-blue-100 text-xs sm:text-sm">Credit Sales</div>
                </div>
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl font-bold">
                    {formatCurrency(filteredSales.reduce((sum, sale) => sum + sale.totalAmountPaid, 0))}
                  </div>
                  <div className="text-green-100 text-xs sm:text-sm">Collected</div>
                </div>
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-pink-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl font-bold">
                    {formatCurrency(filteredSales.reduce((sum, sale) => sum + sale.totalRemainingBalance, 0))}
                  </div>
                  <div className="text-red-100 text-xs sm:text-sm">Outstanding</div>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl font-bold">
                    {filteredSales.filter(sale => sale.paymentStatus === 'credit').length}
                  </div>
                  <div className="text-purple-100 text-xs sm:text-sm">Pending</div>
                </div>
                <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-80" />
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden border border-white/20">
          {/* Filters Section */}
          <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-blue-50/80">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Customer Phone
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.customerPhone}
                      onChange={(e) => setFilters({...filters, customerPhone: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 sm:py-4 border border-gray-300/50 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 text-sm sm:text-base"
                      placeholder="Search by phone..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                    <Filter className="w-4 h-4 inline mr-2" />
                    Payment Status
                  </label>
                  <select
                    value={filters.paymentStatus}
                    onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                    className="w-full px-4 py-3 sm:py-4 border border-gray-300/50 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 text-sm sm:text-base"
                  >
                    <option value="">All Statuses</option>
                    <option value="credit">Credit</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fetchCreditSales}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-blue-500/30 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm sm:text-base"
                >
                  <History className="w-4 h-4 mr-2" />
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          {/* Credit Sales List */}
          <div className="p-4 sm:p-6 lg:p-8">
            {loading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4 sm:mb-6"></div>
                <p className="text-gray-600 text-sm sm:text-lg animate-pulse">Loading credit sales...</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <CreditCard className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mx-auto mb-4 sm:mb-6 opacity-50" />
                <p className="text-gray-600 text-sm sm:text-lg mb-2">No credit sales found</p>
                <p className="text-gray-500 text-xs sm:text-base">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {filteredSales.map((sale, index) => {
                  const isExpanded = expandedTransactions.has(sale.transactionId)
                  const daysUntilDue = getDaysUntilDue(sale.dueDate)
                  const dueDateColor = getDueDateColor(sale.dueDate)
                  const isProcessing = processingPayments[sale.transactionId]
                  const isUndoing = undoingTransactions[sale.transactionId]
                  const canUndo = canUndoTransaction(sale)
                  const theme = getCardTheme(index)
                  
                  return (
                    <div 
                      key={sale.transactionId} 
                      className={`${theme.bg} border ${theme.border} rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-lg sm:hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 animate-fade-in-up`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Success Messages */}
                      <div 
                        id={`success-${sale.transactionId}`}
                        className="hidden animate-fade-in bg-green-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 text-center font-semibold shadow-lg text-sm sm:text-base"
                      >
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2" />
                        Payment processed successfully!
                      </div>

                      <div 
                        id={`undo-success-${sale.transactionId}`}
                        className="hidden animate-fade-in bg-blue-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 text-center font-semibold shadow-lg text-sm sm:text-base"
                      >
                        <Undo2 className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2" />
                        Payment undone successfully!
                      </div>

                      {/* Header */}
                      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                              {sale.transactionId.slice(-8).toUpperCase()}
                            </span>
                            {getStatusBadge(sale.paymentStatus)}
                          </div>
                          
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${dueDateColor} backdrop-blur-sm w-fit`}>
                            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                            {daysUntilDue < 0 ? 'Overdue' : `${daysUntilDue} days left`}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {/* Undo Button - Only show for paid/partial transactions */}
                          {canUndo && (
                            <button
                              onClick={() => undoPayment(sale.transactionId)}
                              disabled={isUndoing}
                              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-2 rounded-lg hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-xs sm:text-sm"
                            >
                              {isUndoing ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                  Undoing...
                                </>
                              ) : (
                                <>
                                  <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                  Undo Payment
                                </>
                              )}
                            </button>
                          )}
                          
                          <button
                            onClick={() => toggleTransactionExpansion(sale.transactionId)}
                            className={`${theme.accent} hover:opacity-80 transition-all duration-300 flex items-center transform hover:scale-105 text-xs sm:text-sm`}
                          >
                            {isExpanded ? (
                              <>
                                <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                                View Details
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="grid grid-cols-1 gap-3 mb-4 sm:mb-6">
                        <div className="flex items-center text-sm bg-white/60 p-3 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-blue-600" />
                          <div>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">{sale.patientName}</div>
                            <div className="text-gray-500 text-xs sm:text-sm">Customer</div>
                          </div>
                        </div>
                        <div className="flex items-center text-sm bg-white/60 p-3 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-green-600" />
                          <div>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">{sale.customerPhone || 'N/A'}</div>
                            <div className="text-gray-500 text-xs sm:text-sm">Phone</div>
                          </div>
                        </div>
                        <div className="flex items-center text-sm bg-white/60 p-3 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-purple-600" />
                          <div>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{sale.customerAddress || 'N/A'}</div>
                            <div className="text-gray-500 text-xs sm:text-sm">Address</div>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 gap-3 mb-4 sm:mb-6">
                        <div className="text-center p-3 sm:p-4 bg-white/80 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                          <div className="text-lg sm:text-xl font-bold text-blue-700">
                            {formatCurrency(sale.totalSaleAmount)}
                          </div>
                          <div className="text-xs sm:text-sm text-blue-600 font-medium">Total</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-white/80 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                          <div className="text-lg sm:text-xl font-bold text-green-700">
                            {formatCurrency(sale.totalAmountPaid)}
                          </div>
                          <div className="text-xs sm:text-sm text-green-600 font-medium">Paid</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-white/80 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                          <div className="text-lg sm:text-xl font-bold text-red-700">
                            {formatCurrency(sale.totalRemainingBalance)}
                          </div>
                          <div className="text-xs sm:text-sm text-red-600 font-medium">Balance</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-white/80 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm">
                          <div className="text-lg sm:text-xl font-bold text-purple-700">
                            {sale.items?.length || 0}
                          </div>
                          <div className="text-xs sm:text-sm text-purple-600 font-medium">Items</div>
                        </div>
                      </div>

                      {/* Expandable Content */}
                      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                        isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="pt-4 sm:pt-6 space-y-4 sm:space-y-6 border-t border-gray-200/50">
                          {/* Items List */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-base sm:text-lg flex items-center">
                              <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-blue-600" />
                              Purchased Items
                            </h4>
                            <div className="space-y-3">
                              {sale.items?.map((item, index) => (
                                <div 
                                  key={index} 
                                  className="flex justify-between items-center p-3 sm:p-4 bg-white/60 rounded-xl border border-white/50 hover:bg-white/80 transition-all duration-300 backdrop-blur-sm"
                                >
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900 text-sm sm:text-base">{item.product?.name}</div>
                                    <div className="text-xs sm:text-sm text-gray-600">
                                      {item.product?.brand} • Qty: {item.quantity}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(item.saleAmount)}</div>
                                    <div className="text-xs sm:text-sm text-gray-600">
                                      Bal: {formatCurrency(item.remainingBalance)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payment Section - Only show if there's balance */}
                          {sale.totalRemainingBalance > 0 && (
                            <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 p-4 sm:p-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border border-green-200/50 shadow-lg backdrop-blur-sm">
                              <h4 className="font-semibold text-gray-900 mb-4 text-base sm:text-lg flex items-center">
                                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-green-600" />
                                Process Payment
                              </h4>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Payment Amount (ETB)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    max={sale.totalRemainingBalance}
                                    value={paymentForms[sale.transactionId]?.paymentAmount || ''}
                                    onChange={(e) => updatePaymentForm(sale.transactionId, 'paymentAmount', e.target.value)}
                                    className="w-full px-3 sm:px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/50 text-sm sm:text-base"
                                    placeholder="0.00"
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    Max: {formatCurrency(sale.totalRemainingBalance)}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Payment Method
                                  </label>
                                  <select
                                    value={paymentForms[sale.transactionId]?.paymentMethod || 'cash'}
                                    onChange={(e) => updatePaymentForm(sale.transactionId, 'paymentMethod', e.target.value)}
                                    className="w-full px-3 sm:px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/50 text-sm sm:text-base"
                                  >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="mobile">Mobile Money</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Notes (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={paymentForms[sale.transactionId]?.notes || ''}
                                    onChange={(e) => updatePaymentForm(sale.transactionId, 'notes', e.target.value)}
                                    className="w-full px-3 sm:px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white/50 text-sm sm:text-base"
                                    placeholder="Payment notes..."
                                  />
                                </div>

                                <button
                                  onClick={() => processPayment(sale.transactionId)}
                                  disabled={isProcessing}
                                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 sm:py-4 rounded-xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-green-500/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm sm:text-base"
                                >
                                  {isProcessing ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                      Process Payment
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Transaction Meta */}
                          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
                            <div>
                              <strong>Due Date:</strong> {formatDate(sale.dueDate)}
                            </div>
                            <div>
                              <strong>Approved By:</strong> {sale.creditApprovedBy?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}