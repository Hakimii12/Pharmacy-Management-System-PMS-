import { useCallback } from "react"
import { useAppDispatch } from "@/app/hooks"
import { pushToast, type ToastTone } from "@/features/ui/uiSlice"

export function useToast() {
  const dispatch = useAppDispatch()

  return useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      dispatch(pushToast({ tone, title, description }))
    },
    [dispatch],
  )
}

/** Pulls a readable message out of an RTK Query error of unknown shape. */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!error) return fallback
  if (typeof error === "string") return error

  const candidate = error as {
    status?: string | number
    data?: { error?: string; message?: string } | string
    error?: string
    message?: string
  }

  if (candidate.status === "FETCH_ERROR") {
    return "Cannot connect to the backend server. Please check your internet connection or verify the server status."
  }
  if (candidate.status === "TIMEOUT_ERROR") {
    return "The server took too long to respond. It may be waking up from sleep, please try again."
  }
  if (candidate.status === "PARSING_ERROR") {
    return "Invalid response from server. Please verify the backend API URL."
  }

  if (typeof candidate.data === "object" && candidate.data !== null) {
    if (candidate.data.message) return candidate.data.message
    if (candidate.data.error) return candidate.data.error
  }
  if (typeof candidate.data === "string" && !candidate.data.trim().startsWith("<")) {
    return candidate.data
  }

  return candidate.error || candidate.message || fallback
}
