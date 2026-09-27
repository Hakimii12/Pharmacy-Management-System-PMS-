import { baseApi } from "./baseApi"
import type { DispensarySummaryRow, Paginated, StockStatus } from "@/types"

export interface DispensarySummary extends Paginated<DispensarySummaryRow> {
  totals: {
    totalUnitPrice: number
    totalSellingPrice: number
    potentialProfit: number
  }
}

export interface ProfitResponse {
  current: {
    daily: number
    monthly: number
    yearly: number
  }
}

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
  action: string
  quantity: number
  batchNo?: string
  user?: string
  details?: unknown
}

export interface DispensaryLedgerBatch {
  id: number
  batchNo: string
  expiryDate: string
  quantity: number
  unitPrice: number
  sellingPrice: number
}

export interface DispensaryLedgerRow {
  groupId: string
  productId: number
  productIds: number[]
  _id: number
  name: string
  brand: string
  batchNo?: string
  batchCount: number
  unitPrice: number
  sellingPrice: number
  expiryDate?: string
  openingStock: number
  issuedToDispensary: number
  returnedToStore: number
  sold: number
  refunded: number
  manualAdded: number
  manualDeducted: number
  adjusted: number
  closingStock: number
  currentStock: number
  calculatedExpected: number
  variance: number
  openingCostValue: number
  openingRetailValue: number
  closingCostValue: number
  closingRetailValue: number
  potentialProfit: number
  batches: DispensaryLedgerBatch[]
}

export interface DispensaryLedgerResponse extends Paginated<DispensaryLedgerRow> {
  summary: {
    openingStockQty: number
    totalIssuedQty: number
    totalReturnedQty: number
    totalSoldQty: number
    totalRefundedQty: number
    totalAddedQty: number
    totalDeductedQty: number
    closingStockQty: number
    openingCostValuation: number
    openingRetailValuation: number
    closingCostValuation: number
    closingRetailValuation: number
    potentialProfit: number
  }
  timePeriod: {
    startDate: string
    endDate: string
  }
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

    getDispensaryLedger: builder.query<
      DispensaryLedgerResponse,
      { page?: number; limit?: number; search?: string; startDate?: string; endDate?: string }
    >({
      query: (params) => ({ url: "/inventory/dispensary-ledger", params }),
      providesTags: [{ type: "Report", id: "DISPENSARY_LEDGER" }],
    }),

    getInventoryHistory: builder.query<
      {
        product: { id: number; name: string; brand?: string; batchNo?: string }
        allProducts?: { id: number; name: string; brand?: string; batchNo?: string }[]
        history: HistoryEvent[]
      },
      { id: string | number; productIds?: string; limit?: number }
    >({
      query: ({ id, ...params }) => ({ url: `/inventory/history/${id}`, params }),
      providesTags: (_result, _error, { id }) => [{ type: "Transfer", id: String(id) }],
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

    submitPhysicalReconciliation: builder.mutation<
      {
        success: boolean
        message: string
        summary: {
          totalProductsInspected: number
          balancedCount: number
          shortageCount: number
          overageCount: number
          netQtyVariance: number
          totalCostVariance: number
          totalRetailVariance: number
          adjustedProducts: number
        }
      },
      {
        location?: "dispensary" | "store"
        reconciliationNotes?: string
        adjustSystemStock?: boolean
        items: {
          productId: number
          productIds?: number[]
          expectedQty: number
          physicalCount: number
          unitPrice?: number
          sellingPrice?: number
          reason?: string
          notes?: string
        }[]
      }
    >({
      query: (body) => ({ url: "/inventory/submit-physical-reconciliation", method: "POST", body }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Transfer", id: "LIST" }, "Report"],
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
  useGetDispensaryLedgerQuery,
  useGetInventoryHistoryQuery,
  useGetDispensarySummaryQuery,
  useReconcileInventoryMutation,
  useSubmitPhysicalReconciliationMutation,
  useGetProfitQuery,
} = inventoryApi
