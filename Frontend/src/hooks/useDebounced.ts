import { useEffect, useState } from "react"

/**
 * Debounces a value before it reaches a query hook.
 *
 * Search inputs feed RTK Query arguments directly, so without this every
 * keystroke would be a new cache entry and a new request.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
