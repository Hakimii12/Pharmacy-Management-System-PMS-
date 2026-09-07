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

  const candidate = error as { data?: { error?: string; message?: string }; error?: string; message?: string }
  return (
    candidate.data?.error ||
    candidate.data?.message ||
    candidate.error ||
    candidate.message ||
    fallback
  )
}
