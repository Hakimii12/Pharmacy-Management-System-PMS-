import { useCallback, useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "pharmacy:install-dismissed"

/**
 * Captures the A2HS prompt so the app can offer installation at a sensible
 * moment rather than letting the browser decide.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    const capture = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    const installed = () => setDeferred(null)

    window.addEventListener("beforeinstallprompt", capture)
    window.addEventListener("appinstalled", installed)
    return () => {
      window.removeEventListener("beforeinstallprompt", capture)
      window.removeEventListener("appinstalled", installed)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === "dismissed") localStorage.setItem(DISMISSED_KEY, "1")
    setDeferred(null)
  }, [deferred])

  return { canInstall: Boolean(deferred), promptInstall }
}
