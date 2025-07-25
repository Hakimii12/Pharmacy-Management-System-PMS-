import { useState, useEffect } from "react"
import { CalendarDays, DollarSign, Users, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import Api from "../../../data/API.json"
export default function DailyBalanceSystem() {
  const ApiLink=Api.link
  const [cashiers, setCashiers] = useState([])
  const [dailyTransactions, setDailyTransactions] = useState({})
  const [countedAmounts, setCountedAmounts] = useState({})
  const [balanceRecords, setBalanceRecords] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Fetch all cashiers
  useEffect(() => {
    fetchCashiers()
  }, [])

  // Fetch daily transactions when date changes
  useEffect(() => {
    if (cashiers.length > 0) {
      fetchDailyTransactions()
    }
  }, [selectedDate, cashiers])

  const fetchCashiers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${ApiLink}/api/sales/cashiers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch cashiers: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setCashiers(data.cashiers)
      } else {
        throw new Error("Failed to load cashiers")
      }
    } catch (err) {
      setError(`Failed to load cashiers: ${err.message}`)
      console.error("Error fetching cashiers:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyTransactions = async () => {
    try {
      const transactions = {}

      for (const cashier of cashiers) {
        try {
          const response = await fetch(`${ApiLink}/api/sales/daily/${cashier._id}?date=${selectedDate}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              transactions[cashier._id] = {
                cashierId: cashier._id,
                expectedAmount: data.expectedAmount,
                transactionCount: data.transactionCount,
                transactions: data.transactions,
              }
            }
          } else {
            // If no transactions found, set empty data
            transactions[cashier._id] = {
              cashierId: cashier._id,
              expectedAmount: 0,
              transactionCount: 0,
              transactions: [],
            }
          }
        } catch (fetchError) {
          console.error(`Error fetching transactions for cashier ${cashier._id}:`, fetchError)
          // Set empty data on error
          transactions[cashier._id] = {
            cashierId: cashier._id,
            expectedAmount: 0,
            transactionCount: 0,
            transactions: [],
          }
        }
      }

      setDailyTransactions(transactions)
    } catch (err) {
      setError(`Failed to load daily transactions: ${err.message}`)
      console.error("Error fetching daily transactions:", err)
    }
  }

  const handleCountedAmountChange = (cashierId, value) => {
    setCountedAmounts((prev) => ({
      ...prev,
      [cashierId]: value,
    }))

    // Calculate difference in real-time
    const expectedAmount = dailyTransactions[cashierId]?.expectedAmount || 0
    const countedAmount = Number.parseFloat(value) || 0
    const difference = countedAmount - expectedAmount

    setBalanceRecords((prev) => ({
      ...prev,
      [cashierId]: {
        cashierId,
        countedAmount,
        expectedAmount,
        difference,
        status: difference === 0 ? "verified" : "discrepancy",
      },
    }))
  }

  const closeDailyBalance = async (cashierId) => {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const record = balanceRecords[cashierId]
      if (!record) {
        setError("Please enter counted amount first")
        return
      }

      // Close daily balance
      const response = await fetch(`${ApiLink}/api/sales/close-daily-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cashierId,
          countedAmount: record.countedAmount,
          date: selectedDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to close daily balance")
      }

      if (data.success) {
        // If there's a discrepancy, suspend the cashier
        if (record.status === "discrepancy") {
          const suspendResponse = await fetch(`${ApiLink}/api/users/suspend/${cashierId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              reason: `Daily balance discrepancy: Expected $${record.expectedAmount}, Counted $${record.countedAmount}, Difference: $${record.difference}`,
            }),
          })

          if (suspendResponse.ok) {
            const suspendData = await suspendResponse.json()
            if (suspendData.success) {
              // Update cashier status locally
              setCashiers((prev) =>
                prev.map((cashier) => (cashier._id === cashierId ? { ...cashier, status: "suspended" } : cashier)),
              )
              setSuccess(
                `Daily balance closed. Cashier suspended due to discrepancy of $${Math.abs(record.difference).toFixed(2)}`,
              )
            } else {
              setSuccess("Daily balance closed, but failed to suspend cashier")
            }
          } else {
            setSuccess("Daily balance closed, but failed to suspend cashier")
          }
        } else {
          setSuccess("Daily balance closed successfully - no discrepancy found")
        }
      } else {
        throw new Error(data.error || "Failed to close daily balance")
      }
    } catch (err) {
      setError(`Failed to close daily balance: ${err.message}`)
      console.error("Error closing daily balance:", err)
    } finally {
      setLoading(false)
    }
  }

  const closeAllBalances = async () => {
    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const cashiersWithAmounts = cashiers.filter(
        (cashier) => balanceRecords[cashier._id] && countedAmounts[cashier._id],
      )

      if (cashiersWithAmounts.length === 0) {
        setError("Please enter counted amounts for at least one cashier")
        return
      }

      let successCount = 0
      let errorCount = 0
      const results = []

      for (const cashier of cashiersWithAmounts) {
        try {
          await closeDailyBalance(cashier._id)
          successCount++
          results.push(`${cashier.name}: Success`)
        } catch (err) {
          errorCount++
          results.push(`${cashier.name}: Failed - ${err.message}`)
        }
      }

      if (errorCount === 0) {
        setSuccess(`All ${successCount} daily balances processed successfully`)
      } else {
        setSuccess(`${successCount} successful, ${errorCount} failed. Check individual results.`)
      }
    } catch (err) {
      setError(`Failed to process all daily balances: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getTotalExpected = () => {
    return Object.values(dailyTransactions).reduce((sum, transaction) => sum + transaction.expectedAmount, 0)
  }

  const getTotalCounted = () => {
    return Object.values(balanceRecords).reduce((sum, record) => sum + record.countedAmount, 0)
  }

  const getTotalDifference = () => {
    return getTotalCounted() - getTotalExpected()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Daily Balance Management</h1>
          <p className="text-muted-foreground">Compare physical counts with system transactions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2">
            <label htmlFor="date" className="block text-sm font-medium">
              Select Date
            </label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={closeAllBalances}
            disabled={loading || Object.keys(balanceRecords).length === 0}
            className="self-end px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Close All Balances"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center p-4 mb-4 text-red-800 border border-red-300 rounded-lg bg-red-50">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center p-4 mb-4 text-green-800 border border-green-300 rounded-lg bg-green-50">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span>{success}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cashiers</p>
              <p className="text-2xl font-bold">{cashiers.length}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expected Total</p>
              <p className="text-2xl font-bold">${getTotalExpected().toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Counted Total</p>
              <p className="text-2xl font-bold">${getTotalCounted().toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Difference</p>
              <p className={`text-2xl font-bold ${getTotalDifference() === 0 ? "text-green-600" : "text-red-600"}`}>
                ${getTotalDifference().toFixed(2)}
              </p>
            </div>
            <CalendarDays className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Cashier Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cashiers.map((cashier) => {
          const transaction = dailyTransactions[cashier._id]
          const record = balanceRecords[cashier._id]
          const countedAmount = countedAmounts[cashier._id] || ""

          return (
            <div key={cashier._id} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{cashier.name}</h3>
                  <p className="text-gray-600">{cashier.email}</p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      cashier.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {cashier.status}
                  </span>
                  {record && (
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        record.status === "verified" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {record.status === "verified" ? "Verified" : "Discrepancy"}
                    </span>
                  )}
                </div>
              </div>

              {transaction ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Transactions</p>
                      <p className="font-medium">{transaction.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Expected Amount</p>
                      <p className="font-medium">${transaction.expectedAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="space-y-3">
                    <div>
                      <label htmlFor={`counted-${cashier._id}`} className="block text-sm font-medium text-gray-700">
                        Physical Count
                      </label>
                      <input
                        id={`counted-${cashier._id}`}
                        type="number"
                        step="0.01"
                        placeholder="Enter counted amount"
                        value={countedAmount}
                        onChange={(e) => handleCountedAmountChange(cashier._id, e.target.value)}
                        disabled={cashier.status === "suspended"}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    {record && (
                      <div className="p-3 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Difference:</span>
                          <span className={`font-bold ${record.difference === 0 ? "text-green-600" : "text-red-600"}`}>
                            ${record.difference.toFixed(2)}
                          </span>
                        </div>
                        {record.difference !== 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {record.difference > 0 ? "Overage" : "Shortage"} detected
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => closeDailyBalance(cashier._id)}
                      disabled={loading || !countedAmount || cashier.status === "suspended"}
                      className={`w-full px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                        record?.status === "discrepancy"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {loading ? "Processing..." : "Close Daily Balance"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <XCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No transactions found for this date</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {cashiers.length === 0 && !loading && (
        <div className="bg-white p-8 rounded-lg shadow border text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No Cashiers Found</h3>
          <p className="text-gray-500">No cashiers are available for daily balance management.</p>
        </div>
      )}

      {loading && cashiers.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow border text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading cashiers...</p>
        </div>
      )}
    </div>
  )
}
