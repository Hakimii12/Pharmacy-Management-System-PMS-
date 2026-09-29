import { createApi, fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react"
import type { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query"
import { db, paginateLocal, readCachedProducts } from "@/offline/db"

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;

  // In browser on a remote hostname (production deployment):
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    // If a valid remote backend URL is provided, use it:
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      const trimmed = envUrl.replace(/\/+$/, "");
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
    // Otherwise fallback to same-origin /api (proxied to backend by Render _redirects)
    return "/api";
  }

  // Local development: use relative /api which Vite dev server proxies to http://localhost:5000
  if (import.meta.env.DEV) {
    return "/api";
  }

  // Production fallback:
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    const trimmed = envUrl.replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }

  return "/api";
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as { auth?: { token?: string | null; user?: { token?: string } } };
    const token = state?.auth?.token || state?.auth?.user?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
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

async function readCachedGroupedProducts(
  params: Record<string, unknown>,
  locationFilter?: "store" | "dispensary" | "sellable",
) {
  const search = params.search as string | undefined
  const category = params.category as string | undefined
  const status = params.status as string | undefined

  const products = await readCachedProducts({
    search,
    category,
    inDispensaryOnly: locationFilter === "dispensary" || locationFilter === "sellable",
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const groupMap = new Map<string, any>()

  for (const p of products) {
    const key = [
      p.name.trim().toLowerCase(),
      (p.brand || "no_brand").trim().toLowerCase(),
    ].join("|")

    const stQty = p.inventory?.store ?? 0
    const dispQty = p.inventory?.dispensary ?? 0
    const isExpired = new Date(p.expiryDate) <= today
    const usableStQty = isExpired ? 0 : stQty
    const usableDispQty = isExpired ? 0 : dispQty

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        ...p,
        id: p._id,
        _id: p._id,
        productId: p._id,
        batchCount: 0,
        totalQuantity: 0,
        nearestExpiry: p.expiryDate,
        inventory: {
          store: 0,
          usableStore: 0,
          dispensary: 0,
          usableDispensary: 0,
          storeThreshold: p.inventory?.storeThreshold ?? 10,
          dispensaryThreshold: p.inventory?.dispensaryThreshold ?? 10,
          storeStatus: "In Stock",
          dispensaryStatus: "In Stock",
          storeIsExpired: isExpired,
          dispensaryIsExpired: isExpired,
        },
        batches: [],
      })
    }

    const group = groupMap.get(key)
    group.inventory.store += stQty
    group.inventory.usableStore += usableStQty
    group.inventory.dispensary += dispQty
    group.inventory.usableDispensary += usableDispQty
    group.inventory.storeThreshold = Math.max(group.inventory.storeThreshold, p.inventory?.storeThreshold ?? 10)
    group.inventory.dispensaryThreshold = Math.max(group.inventory.dispensaryThreshold, p.inventory?.dispensaryThreshold ?? 10)
    group.totalQuantity += (stQty + dispQty)
    group.batchCount += 1

    if (!group.nearestExpiry || new Date(p.expiryDate) < new Date(group.nearestExpiry)) {
      group.nearestExpiry = p.expiryDate
    }

    group.batches.push(p)
  }

  let groupedList = Array.from(groupMap.values()).map((g) => {
    const inv = g.inventory
    inv.storeStatus = inv.store === 0 ? "Sold Out" : inv.usableStore <= inv.storeThreshold ? "Low Stock" : "In Stock"
    inv.dispensaryStatus = inv.dispensary === 0 ? "Sold Out" : inv.usableDispensary <= inv.dispensaryThreshold ? "Low Stock" : "In Stock"
    return g
  })

  if (locationFilter === "store") {
    groupedList = groupedList.filter((g) => g.inventory.store > 0)
  } else if (locationFilter === "dispensary" || locationFilter === "sellable") {
    groupedList = groupedList.filter((g) => g.inventory.dispensary > 0)
  }

  if (status) {
    groupedList = groupedList.filter(
      (g) => g.inventory.storeStatus === status || g.inventory.dispensaryStatus === status,
    )
  }

  return groupedList
}

async function readCachedStoreCounts() {
  const products = await db.products.toArray()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalInStore = 0
  let expiredInStore = 0
  let totalInventoryValue = 0
  let potentialProfit = 0

  const groupMap = new Map<string, { usableQty: number; threshold: number }>()

  for (const p of products) {
    const stQty = p.inventory?.store ?? 0
    totalInStore += stQty
    const expired = new Date(p.expiryDate) <= today
    if (expired && stQty > 0) expiredInStore += stQty
    totalInventoryValue += stQty * p.unitPrice
    potentialProfit += stQty * (p.sellingPrice - p.unitPrice)

    const key = [p.name.trim().toLowerCase(), (p.brand || "no_brand").trim().toLowerCase()].join("|")
    if (!groupMap.has(key)) {
      groupMap.set(key, { usableQty: 0, threshold: p.inventory?.storeThreshold ?? 10 })
    }
    const g = groupMap.get(key)!
    if (!expired) g.usableQty += stQty
    g.threshold = Math.max(g.threshold, p.inventory?.storeThreshold ?? 10)
  }

  let lowInStore = 0
  for (const g of groupMap.values()) {
    if (g.usableQty <= g.threshold) lowInStore++
  }

  return {
    totalInventoryValue,
    totalSellingValue: totalInventoryValue + potentialProfit,
    potentialProfit,
    totalInStore,
    lowInStore,
    expiredInStore,
  }
}

async function readCachedDispensaryCounts() {
  const products = await readCachedProducts()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalInDispensary = 0
  let expiredInDispensary = 0
  let totalSellingValue = 0
  let potentialProfit = 0

  const groupMap = new Map<string, { usableQty: number; threshold: number }>()

  for (const p of products) {
    const dispQty = p.inventory?.dispensary ?? 0
    totalInDispensary += dispQty
    const expired = new Date(p.expiryDate) <= today
    if (expired && dispQty > 0) expiredInDispensary += dispQty
    totalSellingValue += dispQty * p.sellingPrice
    potentialProfit += dispQty * (p.sellingPrice - p.unitPrice)

    const key = [p.name.trim().toLowerCase(), (p.brand || "no_brand").trim().toLowerCase()].join("|")
    if (!groupMap.has(key)) {
      groupMap.set(key, { usableQty: 0, threshold: p.inventory?.dispensaryThreshold ?? 10 })
    }
    const g = groupMap.get(key)!
    if (!expired) g.usableQty += dispQty
    g.threshold = Math.max(g.threshold, p.inventory?.dispensaryThreshold ?? 10)
  }

  let lowInDispensary = 0
  for (const g of groupMap.values()) {
    if (g.usableQty <= g.threshold) lowInDispensary++
  }

  return {
    totalInventoryValue: totalSellingValue - potentialProfit,
    totalSellingValue,
    potentialProfit,
    totalInDispensary,
    lowInDispensary,
    expiredInDispensary,
  }
}

async function readCachedProductCounts() {
  const products = await db.products.toArray()
  let totalProducts = products.length
  let totalQuantity = 0
  let totalValue = 0
  let totalSellingValue = 0
  let nearExpiry = 0
  let expiredCount = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setMonth(cutoff.getMonth() + 3)

  for (const p of products) {
    const qty = p.quantity ?? 0
    totalQuantity += qty
    totalValue += qty * p.unitPrice
    totalSellingValue += qty * p.sellingPrice
    const exp = new Date(p.expiryDate)
    if (exp <= today) expiredCount++
    else if (exp <= cutoff) nearExpiry++
  }

  return {
    totalProducts,
    totalQuantity,
    totalValue,
    totalSellingValue,
    potentialProfit: totalSellingValue - totalValue,
    nearExpiry,
    expiredCount,
    byCategory: [],
  }
}

async function readFromCache(
  args: string | FetchArgs,
): Promise<{ data: unknown } | null> {
  const url = urlOf(args)
  const params = paramsOf(args)
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 25

  if (url.startsWith("/product/groupedProducts")) {
    const rows = await readCachedGroupedProducts(params)
    return { data: paginateLocal(rows, page, limit) }
  }

  if (url.startsWith("/product/groupedStoreProducts")) {
    const rows = await readCachedGroupedProducts(params, "store")
    return { data: paginateLocal(rows, page, limit) }
  }

  if (url.startsWith("/product/groupedDispensaryProducts")) {
    const rows = await readCachedGroupedProducts(params, "dispensary")
    return { data: paginateLocal(rows, page, limit) }
  }

  if (url.startsWith("/product/groupedSellableProducts")) {
    const rows = await readCachedGroupedProducts(params, "sellable")
    return { data: paginateLocal(rows, page, limit) }
  }

  if (url.startsWith("/product/getCountedStore")) {
    const data = await readCachedStoreCounts()
    return { data }
  }

  if (url.startsWith("/product/getCountedDispensary")) {
    const data = await readCachedDispensaryCounts()
    return { data }
  }

  if (url.startsWith("/product/getCountAllProduct")) {
    const data = await readCachedProductCounts()
    return { data }
  }

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
  keepUnusedDataFor: 120,
  refetchOnReconnect: true,
  endpoints: () => ({}),
})

export function providesList<T extends { _id?: string; id?: string }>(
  result: { data: T[] } | undefined,
  type: TagType,
) {
  const listTag = { type, id: "LIST" }
  if (!result?.data) return [listTag]
  return [listTag, ...result.data.map((item) => ({ type, id: item._id ?? item.id ?? "UNKNOWN" }))]
}
