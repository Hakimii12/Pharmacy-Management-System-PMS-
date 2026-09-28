import { baseApi, providesList } from "./baseApi"
import { cacheProducts, db } from "@/offline/db"
import { enqueue, newMutationId } from "@/offline/syncQueue"
import type {
  LocationCounts,
  Paginated,
  Product,
  ProductCounts,
  ProductGroup,
  StockStatus,
  TransferRecord,
} from "@/types"

export interface ProductListQuery {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: StockStatus | ""
}

export interface ProductInput {
  name: string
  brand?: string
  type?: string
  category?: string
  DosageForms?: string
  batchNo: string
  expiryDate: string
  quantity: number
  unitPrice: number
  sellingPrice?: number
  markup?: number
  distributor?: { name: string; contact: string }
  storeThreshold?: number
  dispensaryThreshold?: number
}

async function mirrorProducts(queryFulfilled: Promise<{ data: Paginated<Product> }>) {
  try {
    const { data } = await queryFulfilled
    await cacheProducts(data.data)
  } catch {
    // A failed fetch has nothing worth mirroring.
  }
}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllProducts: builder.query<Paginated<Product>, ProductListQuery>({
      query: (params) => ({ url: "/product/allProducts", params }),
      providesTags: (result) => providesList(result, "Product"),
      onQueryStarted: (_arg, { queryFulfilled }) => mirrorProducts(queryFulfilled),
    }),

    getGroupedProducts: builder.query<Paginated<ProductGroup>, ProductListQuery>({
      query: (params) => ({ url: "/product/groupedProducts", params }),
      providesTags: (result) => [
        { type: "Product" as const, id: "LIST" },
        ...(result?.data ?? []).flatMap((group) =>
          group.batches.map((batch) => ({ type: "Product" as const, id: batch._id })),
        ),
      ],
      onQueryStarted: async (_arg, { queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          await cacheProducts(data.data.flatMap((group) => group.batches))
        } catch {
          // Nothing to mirror on failure.
        }
      },
    }),

    getGroupedStoreProducts: builder.query<Paginated<ProductGroup>, ProductListQuery>({
      query: (params) => ({ url: "/product/groupedStoreProducts", params }),
      providesTags: (result) => [
        { type: "Product" as const, id: "LIST" },
        ...(result?.data ?? []).flatMap((group) =>
          group.batches.map((batch) => ({ type: "Product" as const, id: batch._id })),
        ),
      ],
      onQueryStarted: async (_arg, { queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          await cacheProducts(data.data.flatMap((group) => group.batches))
        } catch {
          // Nothing to mirror on failure.
        }
      },
    }),

    getGroupedDispensaryProducts: builder.query<Paginated<ProductGroup>, ProductListQuery>({
      query: (params) => ({ url: "/product/groupedDispensaryProducts", params }),
      providesTags: (result) => [
        { type: "Product" as const, id: "LIST" },
        ...(result?.data ?? []).flatMap((group) =>
          group.batches.map((batch) => ({ type: "Product" as const, id: batch._id })),
        ),
      ],
      onQueryStarted: async (_arg, { queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          await cacheProducts(data.data.flatMap((group) => group.batches))
        } catch {
          // Nothing to mirror on failure.
        }
      },
    }),

    getGroupedSellableProducts: builder.query<Paginated<ProductGroup>, ProductListQuery>({
      query: (params) => ({ url: "/product/groupedSellableProducts", params }),
      providesTags: (result) => [
        { type: "Product" as const, id: "LIST" },
        ...(result?.data ?? []).flatMap((group) =>
          group.batches.map((batch) => ({ type: "Product" as const, id: batch._id })),
        ),
      ],
      onQueryStarted: async (_arg, { queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          await cacheProducts(data.data.flatMap((group) => group.batches))
        } catch {
          // Nothing to mirror on failure.
        }
      },
    }),

    getStoreProducts: builder.query<Paginated<Product>, ProductListQuery>({
      query: (params) => ({ url: "/product/storeProducts", params }),
      providesTags: (result) => providesList(result, "Product"),
      onQueryStarted: (_arg, { queryFulfilled }) => mirrorProducts(queryFulfilled),
    }),

    getDispensaryProducts: builder.query<Paginated<Product>, ProductListQuery>({
      query: (params) => ({ url: "/product/dispensaryProducts", params }),
      providesTags: (result) => providesList(result, "Product"),
      onQueryStarted: (_arg, { queryFulfilled }) => mirrorProducts(queryFulfilled),
    }),

    /** POS picker: dispensary rows with stock on hand. */
    getSellableProducts: builder.query<Paginated<Product>, ProductListQuery>({
      query: (params) => ({ url: "/product/dispensaryProductsToSell", params }),
      providesTags: (result) => providesList(result, "Product"),
      onQueryStarted: (_arg, { queryFulfilled }) => mirrorProducts(queryFulfilled),
    }),

    getProductCounts: builder.query<ProductCounts, void>({
      query: () => "/product/getCountAllProduct",
      providesTags: [{ type: "Report", id: "PRODUCT_COUNTS" }],
    }),

    getStoreCounts: builder.query<LocationCounts, void>({
      query: () => "/product/getCountedStore",
      providesTags: [{ type: "Report", id: "STORE_COUNTS" }],
    }),

    getDispensaryCounts: builder.query<LocationCounts, void>({
      query: () => "/product/getCountedDispensary",
      providesTags: [{ type: "Report", id: "DISPENSARY_COUNTS" }],
    }),

    getIssuedToDispensary: builder.query<Paginated<TransferRecord>, { page?: number; limit?: number }>({
      query: (params) => ({ url: "/product/productToDispensary", params }),
      providesTags: (result) => providesList(result, "Transfer"),
    }),

    getReturnedToStore: builder.query<Paginated<TransferRecord>, { page?: number; limit?: number }>({
      query: (params) => ({ url: "/product/getRetrunToStore", params }),
      providesTags: (result) => providesList(result, "Transfer"),
    }),

    createProduct: builder.mutation<{ message: string; Product: Product }, ProductInput>({
      async queryFn(body, _api, _extra, fetchWithBQ) {
        if (!navigator.onLine) {
          const id = newMutationId()
          await enqueue({
            id,
            kind: "sale",
            url: "/api/product/CreateProducts",
            method: "POST",
            body,
            label: `New product: ${body.name}`,
          })
          const newProd: Product = {
            _id: id,
            name: body.name,
            brand: body.brand,
            type: body.type,
            category: body.category,
            DosageForms: body.DosageForms,
            batchNo: body.batchNo,
            expiryDate: body.expiryDate,
            quantity: body.quantity,
            unitPrice: body.unitPrice,
            sellingPrice: body.sellingPrice || body.unitPrice,
            markup: body.markup || 0,
            totalPrice: body.quantity * body.unitPrice,
            totalSellingPrice: body.quantity * (body.sellingPrice || body.unitPrice),
            visibility: "enable",
            inventory: {
              store: body.quantity,
              dispensary: 0,
              storeThreshold: body.storeThreshold || 10,
              dispensaryThreshold: body.dispensaryThreshold || 10,
              storeActive: true,
              dispensaryActive: true,
              storeExists: true,
              dispensaryExists: true,
              storeStatus: body.quantity <= (body.storeThreshold || 10) ? "Low Stock" : "In Stock",
              dispensaryStatus: "Sold Out",
              storeIsExpired: false,
              dispensaryIsExpired: false,
            },
          }
          await db.products.put(newProd)
          return { data: { message: "Product created offline (queued)", Product: newProd } }
        }

        const result = await fetchWithBQ({ url: "/product/CreateProducts", method: "POST", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const id = newMutationId()
            await enqueue({
              id,
              kind: "sale",
              url: "/api/product/CreateProducts",
              method: "POST",
              body,
              label: `New product: ${body.name}`,
            })
            const newProd: Product = {
              _id: id,
              name: body.name,
              brand: body.brand,
              type: body.type,
              category: body.category,
              DosageForms: body.DosageForms,
              batchNo: body.batchNo,
              expiryDate: body.expiryDate,
              quantity: body.quantity,
              unitPrice: body.unitPrice,
              sellingPrice: body.sellingPrice || body.unitPrice,
              markup: body.markup || 0,
              totalPrice: body.quantity * body.unitPrice,
              totalSellingPrice: body.quantity * (body.sellingPrice || body.unitPrice),
              visibility: "enable",
              inventory: {
                store: body.quantity,
                dispensary: 0,
                storeThreshold: body.storeThreshold || 10,
                dispensaryThreshold: body.dispensaryThreshold || 10,
                storeActive: true,
                dispensaryActive: true,
                storeExists: true,
                dispensaryExists: true,
                storeStatus: body.quantity <= (body.storeThreshold || 10) ? "Low Stock" : "In Stock",
                dispensaryStatus: "Sold Out",
                storeIsExpired: false,
                dispensaryIsExpired: false,
              },
            }
            await db.products.put(newProd)
            return { data: { message: "Product created offline (queued)", Product: newProd } }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string; Product: Product } }
      },
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Report", "Notification"],
    }),

    createProductInDispensary: builder.mutation<{ message: string; Product: Product }, ProductInput>({
      query: (body) => ({ url: "/product/createProductInDispensary", method: "POST", body }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Report", "Notification"],
    }),

    updateProduct: builder.mutation<{ message: string; product: Product }, { id: string } & Partial<ProductInput>>({
      query: ({ id, ...body }) => ({ url: `/product/update/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "Report",
        "Notification",
      ],
    }),

    updateStoreQuantity: builder.mutation<
      { message: string; product: Product },
      { id: string; quantity: number; threshold?: number }
    >({
      query: ({ id, ...body }) => ({ url: `/product/updateStoreQuantity/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "Report",
        "Notification",
      ],
    }),

    updateDispensaryQuantity: builder.mutation<
      { message: string; product: Product },
      { id: string; quantity: number; threshold?: number }
    >({
      query: ({ id, ...body }) => ({ url: `/product/updateDispensaryQuantity/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "Report",
        "Notification",
      ],
    }),

    issueToDispensary: builder.mutation<{ message: string }, { productId: string; quantity: number }>({
      async queryFn({ productId, quantity }, _api, _extra, fetchWithBQ) {
        const body = { productId, quantity }

        if (!navigator.onLine) {
          const id = newMutationId()
          await enqueue({
            id,
            kind: "sale",
            url: "/api/product/issueToDispensary",
            method: "POST",
            body,
            label: `Issue ${quantity} units to dispensary`,
          })
          const product = await db.products.get(productId)
          if (product) {
            await db.products.update(productId, {
              inventory: {
                ...product.inventory,
                store: Math.max(0, product.inventory.store - quantity),
                dispensary: product.inventory.dispensary + quantity,
              },
            })
          }
          return { data: { message: "Issued to dispensary (queued offline)" } }
        }

        const result = await fetchWithBQ({ url: "/product/issueToDispensary", method: "POST", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const id = newMutationId()
            await enqueue({
              id,
              kind: "sale",
              url: "/api/product/issueToDispensary",
              method: "POST",
              body,
              label: `Issue ${quantity} units to dispensary`,
            })
            const product = await db.products.get(productId)
            if (product) {
              await db.products.update(productId, {
                inventory: {
                  ...product.inventory,
                  store: Math.max(0, product.inventory.store - quantity),
                  dispensary: product.inventory.dispensary + quantity,
                },
              })
            }
            return { data: { message: "Issued to dispensary (queued offline)" } }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string } }
      },
      invalidatesTags: (_result, _error, { productId }) => [
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
        { type: "Transfer", id: "LIST" },
        "Report",
        "Notification",
      ],
    }),

    returnToStore: builder.mutation<{ message: string }, { productId: string; quantity: number }>({
      async queryFn({ productId, quantity }, _api, _extra, fetchWithBQ) {
        const body = { productId, quantity }

        if (!navigator.onLine) {
          const id = newMutationId()
          await enqueue({
            id,
            kind: "sale",
            url: "/api/product/returnToStore",
            method: "POST",
            body,
            label: `Return ${quantity} units to store`,
          })
          const product = await db.products.get(productId)
          if (product) {
            await db.products.update(productId, {
              inventory: {
                ...product.inventory,
                dispensary: Math.max(0, product.inventory.dispensary - quantity),
                store: product.inventory.store + quantity,
              },
            })
          }
          return { data: { message: "Returned to store (queued offline)" } }
        }

        const result = await fetchWithBQ({ url: "/product/returnToStore", method: "POST", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const id = newMutationId()
            await enqueue({
              id,
              kind: "sale",
              url: "/api/product/returnToStore",
              method: "POST",
              body,
              label: `Return ${quantity} units to store`,
            })
            const product = await db.products.get(productId)
            if (product) {
              await db.products.update(productId, {
                inventory: {
                  ...product.inventory,
                  dispensary: Math.max(0, product.inventory.dispensary - quantity),
                  store: product.inventory.store + quantity,
                },
              })
            }
            return { data: { message: "Returned to store (queued offline)" } }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string } }
      },
      invalidatesTags: (_result, _error, { productId }) => [
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
        { type: "Transfer", id: "LIST" },
        "Report",
        "Notification",
      ],
    }),

    /**
     * Soft-deletes when the batch is referenced by sales or transfers, hard-deletes
     * otherwise. The response says which happened so the UI can word it correctly.
     */
    deleteProduct: builder.mutation<
      { message: string; deleteType: "soft" | "hard"; references: { sales: number; transfers: number } },
      string
    >({
      query: (id) => ({ url: `/product/smartDelete/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "Report",
        "Notification",
      ],
    }),

    removeFromDispensary: builder.mutation<{ message: string; product: Product }, string>({
      query: (id) => ({ url: `/product/dispensary/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "Report",
      ],
    }),

    bulkImportProducts: builder.mutation<
      { message: string; imported: number; skipped: number; errors: { row: number; message: string }[] },
      { products: ProductInput[] }
    >({
      query: (body) => ({ url: "/product/bulkImport", method: "POST", body }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Report", "Notification"],
    }),
  }),
})

export const {
  useGetAllProductsQuery,
  useGetGroupedProductsQuery,
  useGetGroupedStoreProductsQuery,
  useGetGroupedDispensaryProductsQuery,
  useGetGroupedSellableProductsQuery,
  useGetStoreProductsQuery,
  useGetDispensaryProductsQuery,
  useGetSellableProductsQuery,
  useGetProductCountsQuery,
  useGetStoreCountsQuery,
  useGetDispensaryCountsQuery,
  useGetIssuedToDispensaryQuery,
  useGetReturnedToStoreQuery,
  useCreateProductMutation,
  useCreateProductInDispensaryMutation,
  useUpdateProductMutation,
  useUpdateStoreQuantityMutation,
  useUpdateDispensaryQuantityMutation,
  useIssueToDispensaryMutation,
  useReturnToStoreMutation,
  useDeleteProductMutation,
  useRemoveFromDispensaryMutation,
  useBulkImportProductsMutation,
} = productApi
