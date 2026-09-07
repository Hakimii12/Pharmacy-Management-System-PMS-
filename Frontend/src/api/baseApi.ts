import { createApi, fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react"
import type { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query"
import { db, paginateLocal, readCachedProducts } from "@/offline/db"

/**
 * In dev, requests go to `/api/...` and Vite proxies them, keeping the session
 * cookie same-origin. In production the app is served from the same origin as
 * the API, so the relative path is correct there too.
 */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include",
})

/** Marks a result as having come from the local cache rather than the network. */
export interface OfflineMeta {
  fromCache?: boolean
}

function isOfflineError(error: FetchBaseQueryError | undefined): boolean {
  if (!error) return false
  return error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR"
}

function urlOf(args: string | FetchArgs): string {
  return typeof args === "string" ? args : args.url
}

function paramsOf(args: string | FetchArgs): Record<string, unknown> {
  if (typeof args === "string") return {}
  return (args.params as Record<string, unknown>) || {}
}

/**
 * Serves a GET from IndexedDB when the network is unavailable.
 *
 * Only read paths that the counter genuinely needs offline are mapped. Anything
 * unmapped falls through and surfaces a normal error, which is better than
 * pretending an empty list is real data.
 */
async function readFromCache(
  args: string | FetchArgs,
): Promise<{ data: unknown } | null> {
  const url = urlOf(args)
  const params = paramsOf(args)
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 25

  if (
    url.startsWith("/product/allProducts") ||
    url.startsWith("/product/storeProducts") ||
    url.startsWith("/product/dispensaryProducts")
  ) {
    const rows = await readCachedProducts({
      search: params.search as string | undefined,
      category: params.category as string | undefined,
      inDispensaryOnly: url.includes("dispensaryProducts"),
    })
    return { data: paginateLocal(rows, page, limit) }
  }

  if (url.startsWith("/product/dispensaryProductsToSell")) {
    const rows = await readCachedProducts({
      search: params.search as string | undefined,
      category: params.category as string | undefined,
      inDispensaryOnly: true,
    })
    return { data: paginateLocal(rows, page, limit) }
  }

  if (url.startsWith("/sales/allTransactionHistory")) {
    const rows = await db.transactions.orderBy("timestamp").reverse().toArray()
    return { data: paginateLocal(rows, page, limit) }
  }

  if (url.startsWith("/notify/notification")) {
    const rows = await db.notifications.orderBy("createdAt").reverse().toArray()
    const unreadCount = rows.filter((row) => !row.read).length
    return { data: { ...paginateLocal(rows, page, limit), unreadCount } }
  }

  if (url.startsWith("/form/categories")) {
    const rows = await db.categories.orderBy("name").toArray()
    return { data: paginateLocal(rows, page, rows.length || 1) }
  }

  if (url.startsWith("/form/dosage-forms")) {
    const rows = await db.dosageForms.orderBy("name").toArray()
    return { data: paginateLocal(rows, page, rows.length || 1) }
  }

  return null
}

/**
 * Base query with offline read fallback.
 *
 * Reads are attempted over the network first; on a transport failure (or when
 * `navigator.onLine` is already false) we serve the Dexie mirror. Writes are not
 * handled here — each mutation decides for itself whether to queue, because only
 * the endpoint knows how to build a meaningful optimistic record.
 */
const offlineAwareBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, OfflineMeta> = async (
  args,
  api,
  extraOptions,
) => {
  const method = typeof args === "string" ? "GET" : (args.method || "GET").toUpperCase()

  if (method === "GET" && !navigator.onLine) {
    const cached = await readFromCache(args)
    if (cached) return { data: cached.data, meta: { fromCache: true } }
  }

  const result = await rawBaseQuery(args, api, extraOptions)

  if (method === "GET" && isOfflineError(result.error)) {
    const cached = await readFromCache(args)
    if (cached) return { data: cached.data, meta: { fromCache: true } }
  }

  return result
}

export const TAG_TYPES = [
  "Product",
  "Sale",
  "PendingSale",
  "Credit",
  "Notification",
  "Category",
  "DosageForm",
  "User",
  "Report",
  "Transfer",
  "Supplier",
  "PurchaseOrder",
] as const

export type TagType = (typeof TAG_TYPES)[number]

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: offlineAwareBaseQuery,
  tagTypes: TAG_TYPES,
  // Keep a page of data around long enough to make back-navigation instant
  // without holding a stale catalogue forever.
  keepUnusedDataFor: 120,
  refetchOnReconnect: true,
  endpoints: () => ({}),
})

/**
 * `providesTags` helper: one tag per row plus a LIST sentinel.
 *
 * Mutations can then invalidate a single row without discarding every cached page.
 */
export function providesList<T extends { _id?: string; id?: string }>(
  result: { data: T[] } | undefined,
  type: TagType,
) {
  const listTag = { type, id: "LIST" }
  if (!result?.data) return [listTag]
  return [listTag, ...result.data.map((item) => ({ type, id: item._id ?? item.id ?? "UNKNOWN" }))]
}
