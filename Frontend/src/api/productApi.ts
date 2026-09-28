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
        const buildOptimistic = (id: string): Product => ({
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
        })

        if (!navigator.onLine) {
          const id = newMutationId()
          await enqueue({
            id,
            kind: "create-product",
            url: "/product/CreateProducts",
            method: "POST",
            body,
            label: `New product: ${body.name}`,
          })
          const newProd = buildOptimistic(id)
          await db.products.put(newProd)
          return { data: { message: "Product created offline (queued)", Product: newProd } }
        }

        const result = await fetchWithBQ({ url: "/product/CreateProducts", method: "POST", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const id = newMutationId()
            await enqueue({
              id,
              kind: "create-product",
              url: "/product/CreateProducts",
              method: "POST",
              body,
              label: `New product: ${body.name}`,
            })
            const newProd = buildOptimistic(id)
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
      async queryFn(body, _api, _extra, fetchWithBQ) {
        const buildOptimistic = (id: string): Product => ({
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
            store: 0,
            dispensary: body.quantity,
            storeThreshold: body.storeThreshold || 10,
            dispensaryThreshold: body.dispensaryThreshold || 10,
            storeActive: true,
            dispensaryActive: true,
            storeExists: true,
            dispensaryExists: true,
            storeStatus: "Sold Out",
            dispensaryStatus: body.quantity <= (body.dispensaryThreshold || 10) ? "Low Stock" : "In Stock",
            storeIsExpired: false,
            dispensaryIsExpired: false,
          },
        })

        if (!navigator.onLine) {
          const id = newMutationId()
          await enqueue({
            id,
            kind: "create-product",
            url: "/product/createProductInDispensary",
            method: "POST",
            body,
            label: `New dispensary batch: ${body.name}`,
          })
          const newProd = buildOptimistic(id)
          await db.products.put(newProd)
          return { data: { message: "Product created in dispensary (queued offline)", Product: newProd } }
        }

        const result = await fetchWithBQ({ url: "/product/createProductInDispensary", method: "POST", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const id = newMutationId()
            await enqueue({
              id,
              kind: "create-product",
              url: "/product/createProductInDispensary",
              method: "POST",
              body,
              label: `New dispensary batch: ${body.name}`,
            })
            const newProd = buildOptimistic(id)
            await db.products.put(newProd)
            return { data: { message: "Product created in dispensary (queued offline)", Product: newProd } }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string; Product: Product } }
      },
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Report", "Notification"],
    }),

    updateProduct: builder.mutation<{ message: string; product: Product }, { id: string } & Partial<ProductInput>>({
      async queryFn({ id, ...body }, _api, _extra, fetchWithBQ) {
        const applyOfflineUpdate = async () => {
          await enqueue({
            id: newMutationId(),
            kind: "update-product",
            url: `/product/update/${id}`,
            method: "PUT",
            body,
            label: `Update product: ${body.name || id}`,
          })
          const existing = await db.products.get(id)
          if (existing) {
            const updated: Product = {
              ...existing,
              ...body,
              distributor: body.distributor || existing.distributor,
              unitPrice: body.unitPrice ?? existing.unitPrice,
              sellingPrice: body.sellingPrice ?? existing.sellingPrice,
              inventory: {
                ...existing.inventory,
                storeThreshold: body.storeThreshold ?? existing.inventory.storeThreshold,
                dispensaryThreshold: body.dispensaryThreshold ?? existing.inventory.dispensaryThreshold,
              },
            }
            await db.products.put(updated)
            return updated
          }
          return null
        }

        if (!navigator.onLine) {
          const updated = await applyOfflineUpdate()
          return { data: { message: "Batch updated (queued offline)", product: updated as Product } }
        }

        const result = await fetchWithBQ({ url: `/product/update/${id}`, method: "PUT", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const updated = await applyOfflineUpdate()
            return { data: { message: "Batch updated (queued offline)", product: updated as Product } }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string; product: Product } }
      },
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
      async queryFn({ id, ...body }, _api, _extra, fetchWithBQ) {
        const applyOffline = async () => {
          await enqueue({
            id: newMutationId(),
            kind: "update-product",
            url: `/product/updateStoreQuantity/${id}`,
            method: "PUT",
            body,
            label: `Set store quantity: ${body.quantity}`,
          })
          const existing = await db.products.get(id)
          if (existing) {
            const threshold = body.threshold ?? existing.inventory.storeThreshold
            const updated: Product = {
              ...existing,
              inventory: {
                ...existing.inventory,
                store: body.quantity,
                storeThreshold: threshold,
                storeStatus: body.quantity === 0 ? "Sold Out" : body.quantity <= threshold ? "Low Stock" : "In Stock",
              },
            }
            await db.products.put(updated)
            return updated
          }
          return null
        }

        if (!navigator.onLine) {
          const updated = await applyOffline()
          return { data: { message: "Store quantity updated (queued offline)", product: updated as Product } }
        }

        const result = await fetchWithBQ({ url: `/product/updateStoreQuantity/${id}`, method: "PUT", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const updated = await applyOffline()
            return { data: { message: "Store quantity updated (queued offline)", product: updated as Product } }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string; product: Product } }
      },
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
      async queryFn({ id, ...body }, _api, _extra, fetchWithBQ) {
        const applyOffline = async () => {
          await enqueue({
            id: newMutationId(),
            kind: "update-product",
            url: `/product/updateDispensaryQuantity/${id}`,
            method: "PUT",
            body,
            label: `Set dispensary quantity: ${body.quantity}`,
          })
          const existing = await db.products.get(id)
          if (existing) {
            const threshold = body.threshold ?? existing.inventory.dispensaryThreshold
            const updated: Product = {
              ...existing,
              inventory: {
                ...existing.inventory,
                dispensary: body.quantity,
                dispensaryThreshold: threshold,
                dispensaryStatus: body.quantity === 0 ? "Sold Out" : body.quantity <= threshold ? "Low Stock" : "In Stock",
              },
            }
            await db.products.put(updated)
            return updated
          }
          return null
        }

        if (!navigator.onLine) {
          const updated = await applyOffline()
          return { data: { message: "Dispensary quantity updated (queued offline)", product: updated as Product } }
        }

        const result = await fetchWithBQ({ url: `/product/updateDispensaryQuantity/${id}`, method: "PUT", body })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const updated = await applyOffline()
            return { data: { message: "Dispensary quantity updated (queued offline)", product: updated as Product } }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string; product: Product } }
      },
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
            kind: "inventory-transfer",
            url: "/product/issueToDispensary",
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
              kind: "inventory-transfer",
              url: "/product/issueToDispensary",
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
            kind: "inventory-transfer",
            url: "/product/returnToStore",
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
              kind: "inventory-transfer",
              url: "/product/returnToStore",
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
      async queryFn(id, _api, _extra, fetchWithBQ) {
        const applyOffline = async () => {
          await enqueue({
            id: newMutationId(),
            kind: "delete-product",
            url: `/product/smartDelete/${id}`,
            method: "DELETE",
            body: {},
            label: `Delete product batch`,
          })
          await db.products.delete(id)
          return { message: "Product deleted (queued offline)", deleteType: "soft" as const, references: { sales: 0, transfers: 0 } }
        }

        if (!navigator.onLine) {
          const res = await applyOffline()
          return { data: res }
        }

        const result = await fetchWithBQ({ url: `/product/smartDelete/${id}`, method: "DELETE" })
        if (result.error) {
          if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
            const res = await applyOffline()
            return { data: res }
          }
          return { error: result.error }
        }
        return { data: result.data as { message: string; deleteType: "soft" | "hard"; references: { sales: number; transfers: number } } }
      },
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
