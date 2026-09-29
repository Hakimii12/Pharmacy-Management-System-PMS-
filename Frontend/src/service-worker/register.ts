import { registerSW } from "virtual:pwa-register"
import { store } from "@/app/store"
import { setUpdateAvailable } from "@/features/ui/uiSlice"
import { installSyncListeners } from "@/offline/syncQueue"
import { pushToast } from "@/features/ui/uiSlice"

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null

/** Applies a waiting service worker build. Wired to the update banner's button. */
export function reloadWithUpdate() {
  void applyUpdate?.(true)
}

export function registerServiceWorker() {
  applyUpdate = registerSW({
    // Never reload under the operator mid-sale; surface a banner instead.
    immediate: true,
    onNeedRefresh() {
      // If no operator is currently signed in (e.g. at the login screen),
      // reload automatically so they immediately get the latest client build & API endpoints!
      const user = store.getState().auth.user
      if (!user) {
        void applyUpdate?.(true)
        return
      }
      // If signed in mid-session, show banner so we never interrupt an in-progress transaction
      store.dispatch(setUpdateAvailable(true))
    },
    onOfflineReady() {
      store.dispatch(
        pushToast({
          tone: "info",
          title: "Ready to work offline",
          description: "The counter will keep running without a connection.",
        }),
      )
    },
  })

  installSyncListeners(({ synced, failed }) => {
    if (synced > 0) {
      store.dispatch(
        pushToast({
          tone: "success",
          title: `${synced} queued ${synced === 1 ? "item" : "items"} synced`,
        }),
      )
    }
    if (failed > 0) {
      store.dispatch(
        pushToast({
          tone: "error",
          title: `${failed} queued ${failed === 1 ? "item" : "items"} could not sync`,
          description: "Open the sync tray to review them.",
        }),
      )
    }
  })
}
