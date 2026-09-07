import { baseApi } from "./baseApi"
import type {
  Paginated,
  PurchaseOrder,
  PurchaseOrderStatus,
  ReorderSuggestion,
  Supplier,
} from "@/types"

export interface SupplierInput {
  name: string
  contact?: string
  email?: string
  address?: string
  notes?: string
}

export interface PurchaseLineInput {
  name: string
  brand?: string
  category?: string
  DosageForms?: string
  quantityOrdered: number
  unitCost: number
  markup?: number
  batchNo?: string
  expiryDate?: string
  notes?: string
}

export interface CreatePurchaseOrderBody {
  supplier: string
  lines: PurchaseLineInput[]
  notes?: string
  expectedDate?: string
  place?: boolean
}

export interface ReceiveLineInput {
  lineId: string
  receiveQty: number
  batchNo?: string
  expiryDate: string
  unitCost?: number
  markup?: number
}

export const purchaseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<
      Paginated<Supplier>,
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (params) => ({ url: "/purchase/suppliers", params: params || undefined }),
      providesTags: (result) => [
        { type: "Supplier" as const, id: "LIST" },
        ...(result?.data ?? []).map((row) => ({ type: "Supplier" as const, id: row._id })),
      ],
    }),

    createSupplier: builder.mutation<{ message: string; supplier: Supplier }, SupplierInput>({
      query: (body) => ({ url: "/purchase/suppliers", method: "POST", body }),
      invalidatesTags: [{ type: "Supplier", id: "LIST" }],
    }),

    updateSupplier: builder.mutation<
      { message: string; supplier: Supplier },
      { id: string; body: SupplierInput }
    >({
      query: ({ id, body }) => ({ url: `/purchase/suppliers/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Supplier", id: "LIST" },
        { type: "Supplier", id },
      ],
    }),

    deleteSupplier: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/purchase/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Supplier", id: "LIST" }],
    }),

    getPurchaseOrders: builder.query<
      Paginated<PurchaseOrder>,
      {
        page?: number
        limit?: number
        search?: string
        status?: PurchaseOrderStatus | ""
        supplier?: string
      }
    >({
      query: (params) => ({ url: "/purchase/orders", params }),
      providesTags: (result) => [
        { type: "PurchaseOrder" as const, id: "LIST" },
        ...(result?.data ?? []).map((row) => ({ type: "PurchaseOrder" as const, id: row._id })),
      ],
    }),

    getPurchaseOrder: builder.query<{ order: PurchaseOrder }, string>({
      query: (id) => `/purchase/orders/${id}`,
      providesTags: (_r, _e, id) => [{ type: "PurchaseOrder", id }],
    }),

    createPurchaseOrder: builder.mutation<
      { message: string; order: PurchaseOrder },
      CreatePurchaseOrderBody
    >({
      query: (body) => ({ url: "/purchase/orders", method: "POST", body }),
      invalidatesTags: [
        { type: "PurchaseOrder", id: "LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    updatePurchaseOrder: builder.mutation<
      { message: string; order: PurchaseOrder },
      { id: string; body: Partial<CreatePurchaseOrderBody> }
    >({
      query: ({ id, body }) => ({ url: `/purchase/orders/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PurchaseOrder", id: "LIST" },
        { type: "PurchaseOrder", id },
      ],
    }),

    placePurchaseOrder: builder.mutation<{ message: string; order: PurchaseOrder }, string>({
      query: (id) => ({ url: `/purchase/orders/${id}/place`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "PurchaseOrder", id: "LIST" },
        { type: "PurchaseOrder", id },
      ],
    }),

    cancelPurchaseOrder: builder.mutation<{ message: string; order: PurchaseOrder }, string>({
      query: (id) => ({ url: `/purchase/orders/${id}/cancel`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "PurchaseOrder", id: "LIST" },
        { type: "PurchaseOrder", id },
      ],
    }),

    receivePurchaseOrder: builder.mutation<
      { message: string; order: PurchaseOrder },
      { id: string; lines: ReceiveLineInput[] }
    >({
      query: ({ id, lines }) => ({
        url: `/purchase/orders/${id}/receive`,
        method: "POST",
        body: { lines },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PurchaseOrder", id: "LIST" },
        { type: "PurchaseOrder", id },
        { type: "Product", id: "LIST" },
        { type: "Transfer", id: "LIST" },
        { type: "Notification", id: "LIST" },
      ],
    }),

    getReorderSuggestions: builder.query<
      Paginated<ReorderSuggestion>,
      { page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: "/purchase/suggestions", params: params || undefined }),
      providesTags: [{ type: "PurchaseOrder", id: "SUGGESTIONS" }],
    }),
  }),
})

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  usePlacePurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
  useGetReorderSuggestionsQuery,
} = purchaseApi
