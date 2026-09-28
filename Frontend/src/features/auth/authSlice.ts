import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { AuthUser, Role } from "@/types"

export interface AuthState {
  user: AuthUser | null
  token: string | null
}

/**
 * Redux stores the user identity and JWT token so the app can authorize requests
 * via Bearer header as well as cookies. It is persisted by redux-persist.
 */
const initialState: AuthState = { user: null, token: null }

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.token = action.payload?.token ?? state.token ?? null
    },
    clearUser(state) {
      state.user = null
      state.token = null
    },
  },
})

export const { setUser, clearUser } = authSlice.actions
export default authSlice.reducer

export const MANAGER_ROLES: Role[] = ["superAdmin", "admin"]
export const SELLER_ROLES: Role[] = ["superAdmin", "admin", "pharmacist"]
export const CASHIER_ROLES: Role[] = ["superAdmin", "admin", "cashier"]
export const SUPER_ADMIN_ROLES: Role[] = ["superAdmin"]
