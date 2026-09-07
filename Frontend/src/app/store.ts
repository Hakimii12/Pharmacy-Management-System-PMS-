import { combineReducers, configureStore } from "@reduxjs/toolkit"
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  type WebStorage,
} from "redux-persist"
import { setupListeners } from "@reduxjs/toolkit/query"

import { baseApi } from "@/api/baseApi"
import authReducer from "@/features/auth/authSlice"
import salesReducer from "@/features/sales/salesSlice"
import uiReducer from "@/features/ui/uiSlice"

/**
 * Explicit localStorage adapter.
 *
 * Vite's ESM interop often resolves `redux-persist/lib/storage` to a module
 * namespace instead of the engine itself, so `storage.getItem` is undefined at
 * runtime. Building the adapter here keeps the contract unambiguous.
 */
const storage: WebStorage = {
  getItem(key) {
    return Promise.resolve(localStorage.getItem(key))
  },
  setItem(key, value) {
    localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem(key) {
    localStorage.removeItem(key)
    return Promise.resolve()
  },
}

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authReducer,
  sales: salesReducer,
  ui: uiReducer,
})

/**
 * Only local UI state is persisted to localStorage.
 *
 * Server state deliberately stays out of redux-persist — RTK Query's cache is not
 * a durable store, and the offline mirror in IndexedDB (Dexie) is a much better
 * fit for data that has to survive a reload while disconnected.
 */
const persistedReducer = persistReducer(
  {
    key: "pharmacy",
    version: 1,
    storage,
    whitelist: ["auth", "sales"],
  },
  rootReducer,
)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
  devTools: import.meta.env.DEV,
})

export const persistor = persistStore(store)

// Enables refetchOnFocus / refetchOnReconnect behaviour.
setupListeners(store.dispatch)

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
