import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Download, RefreshCw } from "lucide-react"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { SyncTray } from "./SyncTray"
import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { setUpdateAvailable } from "@/features/ui/uiSlice"
import { reloadWithUpdate } from "@/service-worker/register"
import { useInstallPrompt } from "@/hooks/useInstallPrompt"
import { Button } from "@/components/ui/Button"

export function AppLayout() {
  const [syncOpen, setSyncOpen] = useState(false)
  const dispatch = useAppDispatch()
  const updateAvailable = useAppSelector((state) => state.ui.updateAvailable)
  const { canInstall, promptInstall } = useInstallPrompt()

  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />

      <div className="lg:pl-64">
        <Topbar onOpenSync={() => setSyncOpen(true)} />

        {updateAvailable && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist bg-ink px-4 py-2.5 text-paper lg:px-6 no-print">
            <p className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4" aria-hidden />
              A new version is ready.
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={reloadWithUpdate}>
                Reload
              </Button>
              <Button
                size="sm"
                variant="quiet"
                className="text-paper/70 hover:bg-white/10 hover:text-paper"
                onClick={() => dispatch(setUpdateAvailable(false))}
              >
                Later
              </Button>
            </div>
          </div>
        )}

        {canInstall && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist bg-rx-amber-soft px-4 py-2.5 lg:px-6 no-print">
            <p className="flex items-center gap-2 text-sm text-rx-amber-deep">
              <Download className="h-4 w-4" aria-hidden />
              Install the pharmacy app for full-screen, offline-ready use.
            </p>
            <Button size="sm" variant="secondary" onClick={promptInstall}>
              Install
            </Button>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>

      <SyncTray open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  )
}
