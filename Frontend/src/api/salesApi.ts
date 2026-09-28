import { baseApi } from "./baseApi"
import { cacheTransactions, db } from "@/offline/db"
import { enqueue, newMutationId, recordStockDeltas } from "@/offline/syncQueue"
import type {
  CartLine,
  Paginated,
  PaymentMethod,
  RecentSale,
  SalesTotals,
  Transaction,
  User,
} from "@/types"

export interface SaleItemInput {
  productId: string
  quantity: number
}

export interface PrepareSaleRequest {
  items: SaleItemInput[]
  patientName?: string
  /** Client-side only — used to build the optimistic record when queued offline. */
  lines?: CartLine[]
}

export interface CreditSaleRequest extends PrepareSaleRequest {
  customerPhone: string
  customerAddress?: string
  dueDate?: string
  amountPaid?: number
}

export interface SaleResponse {
  success: boolean
  transactionId: string
  grandTotal: number
  /** True when the sale is sitting in the offline queue rather than on the server. */
  queued?: boolean
}

export interface TransactionListQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  saleType?: string
  paymentStatus?: string
  customerPhone?: string
  pharmacist?: string
  cashier?: string
  startDate?: string
  endDate?: string
  overdue?: string
}

function optimisticTransaction(
  id: string,
  lines: CartLine[],
  overrides: Partial<Transaction>,
): Transaction {
  const totalAmount = lines.reduce((sum, line) => sum + line.sellingPrice * line.quantity, 0)
  return {
    id,
    transactionId: id,
    saleType: "cash",
    status: "pending",
    paymentStatus: "pending",
    isOverdue: false,
    totalAmount,
    amountPaid: 0,
    remainingBalance: totalAmount,
    itemCount: lines.length,
    timestamp: new Date().toISOString(),
    items: lines.map((line) => ({
      saleId: `${id}:${line.productId}`,
      productId: line.productId,
      product: line.productId,
      name: line.name,
      brand: line.brand,
      dosageForm: line.dosageForm,
      batchNo: line.batchNo,
      quantity: line.quantity,
      sellingPrice: line.sellingPrice,
      saleAmount: line.sellingPrice * line.quantity,
      total: line.sellingPrice * line.quantity,
    })),
    pendingSync: true,
    ...overrides,
  }
}

async function queueSale(
  url: string,
  body: unknown,
  lines: CartLine[],
  overrides: Partial<Transaction>,
  label: string,
): Promise<{ data: SaleResponse }> {
  const id = newMutationId()

  await enqueue({
    id,
    kind: overrides.saleType === "credit" ? "credit-sale" : "sale",
    url: `/api${url}`,
    method: "POST",
    body,
    label,
  })
  await recordStockDeltas(id, lines)
  await cacheTransactions([optimisticTransaction(id, lines, overrides)])

  return {
    data: {
      success: true,
      transactionId: id,
      grandTotal: lines.reduce((sum, line) => sum + line.sellingPrice * line.quantity, 0),
      queued: true,
    },
  }
}

export const salesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    prepareSale: builder.mutation<SaleResponse, PrepareSaleRequest>({
      async queryFn({ items, patientName, lines = [] }, _api, _extra, fetchWithBQ) {
        const body = { items, patientName }

        if (!navigator.onLine) {
          return queueSale("/sales/prepareAndSaveSale", body, lines, { saleType: "cash" }, `Sale for ${patientName || "walk-in"}`)
        }

        const result = await fetchWithBQ({ url: "/sales/prepareAndSaveSale", method: "POST", body })

        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            return queueSale("/sales/prepareAndSaveSale", body, lines, { saleType: "cash" }, `Sale for ${patientName || "walk-in"}`)
          }
          return { error: result.error }
        }

        return { data: result.data as SaleResponse }
      },
      invalidatesTags: [
        { type: "PendingSale", id: "LIST" },
        { type: "Product", id: "LIST" },
        "Report",
      ],
    }),

    createCreditSale: builder.mutation<SaleResponse, CreditSaleRequest>({
      async queryFn({ lines = [], ...body }, _api, _extra, fetchWithBQ) {
        const label = `Credit sale for ${body.patientName || body.customerPhone}`

        if (!navigator.onLine) {
          return queueSale("/sales/create-credit-sale", body, lines, { saleType: "credit", status: "completed" }, label)
        }

        const result = await fetchWithBQ({ url: "/sales/create-credit-sale", method: "POST", body })

        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            return queueSale("/sales/create-credit-sale", body, lines, { saleType: "credit", status: "completed" }, label)
          }
          return { error: result.error }
        }

        return { data: result.data as SaleResponse }
      },
      invalidatesTags: [
        { type: "Credit", id: "LIST" },
        { type: "Sale", id: "LIST" },
        { type: "Product", id: "LIST" },
        "Report",
      ],
    }),

    getPendingSales: builder.query<Paginated<Transaction>, TransactionListQuery>({
      query: (params) => ({ url: "/sales/pendingStatusItems", params }),
      providesTags: (result) => [
        { type: "PendingSale" as const, id: "LIST" },
        ...(result?.data ?? []).map((tx) => ({ type: "PendingSale" as const, id: tx.transactionId })),
      ],
      // Cashiers need to see a prepared order appear without a manual refresh.
      keepUnusedDataFor: 30,
    }),

    getTransactions: builder.query<Paginated<Transaction>, TransactionListQuery>({
      query: (params) => ({ url: "/sales/allTransactionHistory", params }),
      providesTags: (result) => [
        { type: "Sale" as const, id: "LIST" },
        ...(result?.data ?? []).map((tx) => ({ type: "Sale" as const, id: tx.transactionId })),
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          await cacheTransactions(data.data)
        } catch {
          // Nothing to mirror.
        }
      },
    }),

    getCreditSales: builder.query<Paginated<Transaction>, TransactionListQuery>({
      query: (params) => ({ url: "/sales/credit-sales", params }),
      providesTags: (result) => [
        { type: "Credit" as const, id: "LIST" },
        ...(result?.data ?? []).map((tx) => ({ type: "Credit" as const, id: tx.transactionId })),
      ],
    }),

    confirmSale: builder.mutation<{ success: boolean; message: string }, string>({
      async queryFn(transactionId, _api, _extra, fetchWithBQ) {
        const url = `/sales/confirm/${transactionId}`

        if (!navigator.onLine) {
          await enqueue({
            id: newMutationId(),
            kind: "confirm-sale",
            url: `/api${url}`,
            method: "POST",
            body: {},
            label: `Confirm sale ${transactionId.slice(-6)}`,
          })
          await db.transactions.update(transactionId, { status: "completed", pendingSync: true })
          return { data: { success: true, message: "Queued — will confirm when back online" } }
        }

        const result = await fetchWithBQ({ url, method: "POST" })
        if (result.error) return { error: result.error }
        return { data: result.data as { success: boolean; message: string } }
      },
      invalidatesTags: (_result, _error, transactionId) => [
        { type: "PendingSale", id: transactionId },
        { type: "PendingSale", id: "LIST" },
        { type: "Sale", id: "LIST" },
        { type: "Product", id: "LIST" },
        "Report",
        "Notification",
      ],
    }),

    abortSale: builder.mutation<{ success: boolean; message: string }, string>({
      query: (transactionId) => ({ url: `/sales/abort/${transactionId}`, method: "POST" }),
      invalidatesTags: (_result, _error, transactionId) => [
        { type: "PendingSale", id: transactionId },
        { type: "PendingSale", id: "LIST" },
        { type: "Sale", id: "LIST" },
        "Report",
      ],
    }),

    processCreditPayment: builder.mutation<
      { success: boolean; message: string; newTotalBalance: number },
      { transactionId: string; paymentAmount: number; paymentMethod?: PaymentMethod; notes?: string }
    >({
      query: (body) => ({ url: "/sales/process-credit-payment", method: "POST", body }),
      invalidatesTags: (_result, _error, { transactionId }) => [
        { type: "Credit", id: transactionId },
        { type: "Credit", id: "LIST" },
        { type: "Sale", id: "LIST" },
        "Report",
      ],
    }),

    undoSale: builder.mutation<{ success: boolean; message: string }, { transactionId: string; reason?: string }>({
      query: (body) => ({ url: "/sales/undo", method: "POST", body }),
      invalidatesTags: [
        { type: "Sale", id: "LIST" },
        { type: "Credit", id: "LIST" },
        { type: "Product", id: "LIST" },
        "Report",
      ],
    }),

    getRecentSales: builder.query<{ success: boolean; count: number; sales: RecentSale[] }, { limit?: number }>({
      query: (params) => ({ url: "/sales/getRecentSales", params }),
      providesTags: [{ type: "Report", id: "RECENT_SALES" }],
    }),

    getTotalSales: builder.query<SalesTotals, { startDate?: string; endDate?: string }>({
      query: (params) => ({ url: "/sales/getTotalSales", params }),
      providesTags: [{ type: "Report", id: "TOTAL_SALES" }],
    }),

    getCashiers: builder.query<Paginated<User> | { cashiers: User[] }, void>({
      query: () => "/sales/cashiers",
      providesTags: [{ type: "User", id: "CASHIERS" }],
    }),

    getDailyTransactions: builder.query<
      Paginated<Transaction> & { totalExpected?: number },
      { cashierId: string; page?: number; limit?: number; date?: string }
    >({
      query: ({ cashierId, ...params }) => ({ url: `/sales/daily/${cashierId}`, params }),
      providesTags: [{ type: "Report", id: "DAILY" }],
    }),

    closeDailyBalance: builder.mutation<
      { success: boolean; message: string },
      { cashierId: string; actualAmount: number; notes?: string }
    >({
      query: (body) => ({ url: "/sales/close-daily-balance", method: "POST", body }),
      invalidatesTags: [
        { type: "Report", id: "DAILY" },
        { type: "Report", id: "BALANCE_HISTORY" },
      ],
    }),

    getDailyBalanceHistory: builder.query<Paginated<Record<string, unknown>>, { page?: number; limit?: number }>({
      query: (params) => ({ url: "/sales/daily-balance-history", params }),
      providesTags: [{ type: "Report", id: "BALANCE_HISTORY" }],
    }),
  }),
})

export const {
  usePrepareSaleMutation,
  useCreateCreditSaleMutation,
  useGetPendingSalesQuery,
  useGetTransactionsQuery,
  useGetCreditSalesQuery,
  useConfirmSaleMutation,
  useAbortSaleMutation,
  useProcessCreditPaymentMutation,
  useUndoSaleMutation,
  useGetRecentSalesQuery,
  useGetTotalSalesQuery,
  useGetCashiersQuery,
  useGetDailyTransactionsQuery,
  useCloseDailyBalanceMutation,
  useGetDailyBalanceHistoryQuery,
} = salesApi
