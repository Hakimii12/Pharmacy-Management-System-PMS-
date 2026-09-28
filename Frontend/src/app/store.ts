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
