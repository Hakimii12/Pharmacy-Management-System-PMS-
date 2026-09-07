/** Standard envelope returned by every list endpoint (backend §2.4). */
export interface Paginated<T> {
  data: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PageQuery {
  page?: number
  limit?: number
}

export type Role = "superAdmin" | "admin" | "pharmacist" | "cashier"
export type UserStatus = "approved" | "pending" | "rejected" | "suspended"

export interface User {
  _id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  createdAt?: string
}

/** Shape returned by POST /api/user/login. */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

export type StockStatus = "In Stock" | "Low Stock" | "Sold Out" | "Expired"

/**
 * Stock lives in two physical locations. Every product row carries both, so a
 * screen can show the store position and the dispensary position side by side.
 */
export interface Inventory {
  store: number
  dispensary: number
  storeThreshold: number
  dispensaryThreshold: number
  storeActive: boolean
  dispensaryActive: boolean
  storeExists: boolean
  dispensaryExists: boolean
  storeStatus: StockStatus
  dispensaryStatus: StockStatus
  storeIsExpired: boolean
  dispensaryIsExpired: boolean
}

export interface Distributor {
  name: string
  contact: string | number
}

/**
 * One product document is one *batch*. Several batches can share a name, each
 * with its own batch number, expiry date and price.
 */
export interface Product {
  _id: string
  name: string
  brand?: string
  type?: string
  category?: string
  DosageForms?: string
  batchNo: string
  expiryDate: string
  quantity: number
  unitPrice: number
  sellingPrice: number
  markup: number
  totalPrice: number
  totalSellingPrice: number
  distributor?: Distributor
  visibility: "enable" | "disable" | "deleted"
  isDeleted?: boolean
  addedBy?: string
  createdAt?: string
  updatedAt?: string
  inventory: Inventory
}

/**
 * Batches that share name + brand + category + dosage form collapse into one
 * catalogue row. Individual batches stay nested for the detail panel.
 */
export interface ProductGroup {
  id: string
  name: string
  brand?: string
  type?: string
  category?: string
  DosageForms?: string
  unitPrice: number
  sellingPrice: number
  markup: number
  batchCount: number
  nearestExpiry?: string
  totalQuantity: number
  inventory: Inventory
  batches: Product[]
}

export type SaleStatus = "pending" | "completed" | "aborted" | "credit" | "partial" | "refunded"
export type PaymentStatus = "pending" | "paid" | "partial" | "credit" | "overdue"
export type SaleType = "cash" | "credit"
export type PaymentMethod = "cash" | "bank_transfer" | "mobile_money"

export interface TransactionItem {
  saleId: string
  productId: string
  product: string
  name: string
  brand?: string
  category?: string
  dosageForm?: string
  batchNo?: string
  quantity: number
  unitPrice?: number
  sellingPrice?: number
  saleAmount: number
  total: number
  amountPaid?: number
  remainingBalance?: number
  status?: SaleStatus
  refundedAt?: string | null
}

/** A transaction as returned by the grouped-sales aggregation. */
export interface Transaction {
  id: string
  transactionId: string
  patientName?: string
  customerPhone?: string
  customerAddress?: string
  saleType: SaleType
  status: SaleStatus
  paymentStatus: PaymentStatus
  isOverdue: boolean
  totalAmount: number
  totalProfit?: number
  amountPaid: number
  remainingBalance: number
  itemCount: number
  timestamp: string
  completedAt?: string | null
  abortedAt?: string | null
  refundedAt?: string | null
  dueDate?: string | null
  lastPaymentDate?: string | null
  creditApprovedAt?: string | null
  pharmacist?: Pick<User, "_id" | "name" | "email" | "role"> | null
  cashier?: Pick<User, "_id" | "name" | "email" | "role"> | null
  creditApprovedBy?: Pick<User, "_id" | "name" | "email"> | null
  items: TransactionItem[]
  /** Set by the offline layer when the transaction has not reached the server yet. */
  pendingSync?: boolean
}

export interface CartLine {
  productId: string
  name: string
  brand?: string
  batchNo: string
  dosageForm?: string
  sellingPrice: number
  available: number
  quantity: number
}

export interface TransferRecord {
  _id: string
  type: string
  quantity: number
  quantityLeft?: number
  totalQuantity?: number
  issuedPrice?: number
  unitPrice?: number
  totalIssuedPrice?: number
  totalUnitPrice?: number
  date: string
  user?: Pick<User, "_id" | "name" | "email" | "role">
  product?: Pick<Product, "_id" | "name" | "brand" | "batchNo" | "expiryDate" | "unitPrice" | "sellingPrice" | "category">
}

export type NotificationType = "Expired" | "OutOfStock" | "NearExpiry" | "LowStock"

export interface AppNotification {
  _id: string
  type: NotificationType
  message: string
  read: boolean
  location: "store" | "dispensary" | "both"
  createdAt: string
  product?: Pick<Product, "_id" | "name" | "brand" | "batchNo">
}

export interface ReferenceEntry {
  _id: string
  name: string
  productCount: number
}

export interface LowStockRow {
  productId: string
  name: string
  brand?: string
  expireDate: string
  quantity: number
  threshold: number
}

export interface NearExpiryRow {
  productId: string
  name: string
  brand?: string
  batchNo: string
  expiryDate: string
  daysLeft: number
  quantity: number
}

export interface ProductCounts {
  totalProducts: number
  totalQuantity: number
  totalValue: number
  totalSellingValue: number
  potentialProfit: number
  nearExpiry: number
  expiredCount: number
  byCategory: { category: string; count: number }[]
}

export interface LocationCounts {
  totalInventoryValue: number
  totalSellingValue: number
  potentialProfit: number
  totalInStore?: number
  lowInStore?: number
  expiredInStore?: number
  outOfStockInStore?: number
  totalInDispensary?: number
  lowInDispensary?: number
  expiredInDispensary?: number
  outOfStockInDispensary?: number
}

export interface SalesTotals {
  totalSales: number
  totalProfit: number
  transactionCount: number
}

export interface RecentSale {
  productName: string
  brand?: string
  dateSold: string
  saleAmount: number
  profit: number
}

export interface DispensarySummaryRow {
  productId: string
  name: string
  brand?: string
  status: StockStatus
  expiryDate: string
  type?: string
  dosageForm?: string
  quantity: number
  unitPrice: number
  sellingPrice: number
  productUnitPrice: number
  productSellingPrice: number
}

export type PurchaseOrderStatus = "draft" | "ordered" | "partial" | "received" | "cancelled"

export interface Supplier {
  _id: string
  name: string
  contact?: string
  email?: string
  address?: string
  notes?: string
  createdAt?: string
}

export interface PurchaseLine {
  _id: string
  name: string
  brand?: string
  category?: string
  DosageForms?: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  markup: number
  batchNo?: string
  expiryDate?: string
  receivedProduct?: string
  notes?: string
}

export interface PurchaseOrder {
  _id: string
  orderNumber: string
  supplier: Supplier | string
  status: PurchaseOrderStatus
  lines: PurchaseLine[]
  notes?: string
  expectedDate?: string
  orderedAt?: string
  receivedAt?: string
  createdBy?: { _id: string; name: string } | string
  receivedBy?: { _id: string; name: string } | string
  createdAt?: string
  updatedAt?: string
}

export interface ReorderSuggestion {
  productId: string
  name: string
  brand?: string
  category?: string
  DosageForms?: string
  onHand: number
  threshold: number
  suggestedQty: number
  unitCost: number
  markup: number
  lastDistributor?: Distributor
  reason: "low_stock" | "out_of_stock"
}
