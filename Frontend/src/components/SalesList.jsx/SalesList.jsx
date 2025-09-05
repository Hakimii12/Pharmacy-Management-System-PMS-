"use client"

import { useState } from "react"
import PurchaseOrder from "./PurchaseOrder"
import ReceiveOrder from "./ReceiveOrder"
import SalesHistory from "./SalesHistory"
import CloseDailyBalance from "./CloseDailyBalance/CloseDailyBalance"

const SalesList = () => {
  const [activeTab, setActiveTab] = useState("purchase")

  const tabs = [
    { id: "purchase", label: "Purchase Order", component: PurchaseOrder },
    { id: "receive", label: "Receive Order", component: ReceiveOrder },
    { id: "history", label: "Sales History", component: SalesHistory },
    { id: "balance", label: "Daily Balance", component: CloseDailyBalance },
  ]

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || PurchaseOrder

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}

export default SalesList
