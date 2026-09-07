import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit"

export type ToastTone = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

export interface UiState {
  sidebarOpen: boolean
  toasts: Toast[]
  /** Set by the PWA registration hook when a new build is waiting. */
  updateAvailable: boolean
}

const initialState: UiState = {
  sidebarOpen: false,
  toasts: [],
  updateAvailable: false,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state, action: PayloadAction<boolean | undefined>) {
      state.sidebarOpen = action.payload ?? !state.sidebarOpen
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload)
      },
      prepare(toast: Omit<Toast, "id">) {
        return { payload: { ...toast, id: nanoid() } }
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload)
    },
    setUpdateAvailable(state, action: PayloadAction<boolean>) {
      state.updateAvailable = action.payload
    },
  },
})

export const { toggleSidebar, pushToast, dismissToast, setUpdateAvailable } = uiSlice.actions
export default uiSlice.reducer
