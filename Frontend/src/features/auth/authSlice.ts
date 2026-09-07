import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { AuthUser, Role } from "@/types"

export interface AuthState {
  user: AuthUser | null
}

/**
 * The session itself is an httpOnly-ish JWT cookie owned by the server. This
 * slice only mirrors *who* is signed in so the shell can render the right nav
 * without a round-trip; it is persisted by redux-persist.
 */
const initialState: AuthState = { user: null }

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
    },
    clearUser(state) {
      state.user = null
    },
  },
})

export const { setUser, clearUser } = authSlice.actions
export default authSlice.reducer

export const MANAGER_ROLES: Role[] = ["superAdmin", "admin"]
export const SELLER_ROLES: Role[] = ["superAdmin", "admin", "pharmacist"]
export const CASHIER_ROLES: Role[] = ["superAdmin", "admin", "cashier"]
export const SUPER_ADMIN_ROLES: Role[] = ["superAdmin"]
