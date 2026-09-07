import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { CartLine, Product, SaleType } from "@/types"

export interface SalesState {
  /** The active POS basket. Persisted so a page reload at the counter is harmless. */
  cart: CartLine[]
  patientName: string
  saleType: SaleType
  amountPaid: number | null
  customerPhone: string
  customerAddress: string
  dueDate: string
  /** Set immediately after a sale so the receipt can animate in. */
  lastCompletedTransactionId: string | null
}

function defaultDueDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

const initialState: SalesState = {
  cart: [],
  patientName: "",
  saleType: "cash",
  amountPaid: null,
  customerPhone: "",
  customerAddress: "",
  dueDate: defaultDueDate(),
  lastCompletedTransactionId: null,
}

const salesSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<Product>) {
      const product = action.payload
      const available = product.inventory.dispensary
      const existing = state.cart.find((line) => line.productId === product._id)

      if (existing) {
        // Never let the basket exceed what the dispensary actually holds.
        existing.quantity = Math.min(existing.quantity + 1, available)
        existing.available = available
        return
      }

      if (available < 1) return

      state.cart.push({
        productId: product._id,
        name: product.name,
        brand: product.brand,
        batchNo: product.batchNo,
        dosageForm: product.DosageForms,
        sellingPrice: product.sellingPrice,
        available,
        quantity: 1,
      })
    },
    setLineQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const line = state.cart.find((item) => item.productId === action.payload.productId)
      if (!line) return
      line.quantity = Math.max(1, Math.min(action.payload.quantity, line.available))
    },
    removeLine(state, action: PayloadAction<string>) {
      state.cart = state.cart.filter((line) => line.productId !== action.payload)
    },
    clearCart(state) {
      state.cart = []
      state.patientName = ""
      state.amountPaid = null
      state.customerPhone = ""
      state.customerAddress = ""
      state.saleType = "cash"
      state.dueDate = defaultDueDate()
    },
    setPatientName(state, action: PayloadAction<string>) {
      state.patientName = action.payload
    },
    setSaleType(state, action: PayloadAction<SaleType>) {
      state.saleType = action.payload
      if (action.payload === "cash") {
        state.amountPaid = null
      }
    },
    setAmountPaid(state, action: PayloadAction<number | null>) {
      state.amountPaid = action.payload
    },
    setCustomerPhone(state, action: PayloadAction<string>) {
      state.customerPhone = action.payload
    },
    setCustomerAddress(state, action: PayloadAction<string>) {
      state.customerAddress = action.payload
    },
    setDueDate(state, action: PayloadAction<string>) {
      state.dueDate = action.payload
    },
    setLastCompleted(state, action: PayloadAction<string | null>) {
      state.lastCompletedTransactionId = action.payload
    },
  },
})

export const {
  addToCart,
  setLineQuantity,
  removeLine,
  clearCart,
  setPatientName,
  setSaleType,
  setAmountPaid,
  setCustomerPhone,
  setCustomerAddress,
  setDueDate,
  setLastCompleted,
} = salesSlice.actions

export default salesSlice.reducer

export const cartTotal = (cart: CartLine[]) =>
  cart.reduce((sum, line) => sum + line.sellingPrice * line.quantity, 0)

export const cartCount = (cart: CartLine[]) => cart.reduce((sum, line) => sum + line.quantity, 0)
