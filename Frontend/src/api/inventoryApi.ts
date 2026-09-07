import { baseApi } from "./baseApi"
import type { DispensarySummaryRow, Paginated, StockStatus } from "@/types"

export interface InventorySnapshot {
  product: { _id: string; name: string; batchNo: string; expiryDate: string; quantity: number }
  inventory: {
    store: number
    dispensary: number
    total: number
    totalQuantityAdded: number
    totalQuantityDeducted: number
  }
  recentTransfers: unknown[]
  recentSales: unknown[]
  recentUpdates: unknown[]
  recentRefunds: unknown[]
}

export interface ReconciliationLedger {
  product: { id: string; name: string; batchNo: string; unitPrice: number; sellingPrice: number }
  calculations: {
    initialDispensaryQty: number
    totalIssuedInPeriod: number
    totalReturnedInPeriod: number
    totalSoldInPeriod: number
    totalNetUpdatesInPeriod: number
    totalQuantityAddedInPeriod: number
    expectedClosingQty?: number
    actualClosingQty?: number
    discrepancy?: number
  }
}

export interface HistoryEvent {
  type: string
  date: string
  quantity: number
  user?: { name: string }
  note?: string
}

type DispensarySummary = Paginated<DispensarySummaryRow> & {
  totals: { totalUnitPrice: number; totalSellingPrice: number; potentialProfit: number }
}

export interface ProfitResponse {
  data: { _id: string; daily: number; monthly: number; yearly: number; lastUpdated: string }[]
  current: { daily: number; monthly: number; yearly: number; lastUpdated: string | null }
}

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProductInventory: builder.query<InventorySnapshot, string>({
      query: (id) => `/inventory/product/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),

    getReconciliation: builder.query<
      ReconciliationLedger,
      { id: string; startDate?: string; endDate?: string }
    >({
      query: ({ id, ...params }) => ({ url: `/inventory/calculate/${id}`, params }),
      providesTags: (_result, _error, { id }) => [{ type: "Product", id }],
    }),

    getInventoryHistory: builder.query<
      { product: { _id: string; name: string; batchNo: string }; history: HistoryEvent[] },
      { id: string; limit?: number }
    >({
      query: ({ id, ...params }) => ({ url: `/inventory/history/${id}`, params }),
      providesTags: (_result, _error, { id }) => [{ type: "Transfer", id }],
    }),

    getDispensarySummary: builder.query<
      DispensarySummary,
      { page?: number; limit?: number; search?: string; status?: StockStatus | "" }
    >({
      query: (params) => ({ url: "/inventory/getDispensarySummary", params }),
      providesTags: [{ type: "Report", id: "DISPENSARY_SUMMARY" }],
    }),

    reconcileInventory: builder.mutation<
      { message: string },
      { id: string; adjustmentQty: number; reason: string; location: "store" | "dispensary" }
    >({
      query: ({ id, ...body }) => ({ url: `/inventory/reconcile/${id}`, method: "POST", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        { type: "Transfer", id: "LIST" },
        "Report",
      ],
    }),

    getProfit: builder.query<ProfitResponse, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/profit/profit", params: params || undefined }),
      providesTags: [{ type: "Report", id: "PROFIT" }],
    }),
  }),
})

export const {
  useGetProductInventoryQuery,
  useGetReconciliationQuery,
  useGetInventoryHistoryQuery,
  useGetDispensarySummaryQuery,
  useReconcileInventoryMutation,
  useGetProfitQuery,
} = inventoryApi
