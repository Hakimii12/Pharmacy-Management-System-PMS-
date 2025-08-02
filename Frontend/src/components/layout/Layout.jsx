import { useState, useEffect } from "react"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

const Layout = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user-threads"))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("overflow-hidden", "md:overflow-auto")
    } else {
      document.body.classList.remove("overflow-hidden")
    }

    return () => document.body.classList.remove("overflow-hidden")
  }, [sidebarOpen])

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden transition-all duration-300"
          onClick={closeSidebar}
        />
      )}

      {/* Responsive Sidebar - Fixed on mobile, static on desktop */}
      <div
        className={`fixed md:relative z-30 h-full ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-all duration-300 ease-in-out w-64 flex-shrink-0`}
      >
        <Sidebar closeSidebar={closeSidebar} />
      </div>

      {/* Main Content Area - Full width on mobile, with margin on desktop */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-gray-50/50 via-white/30 to-blue-50/50 md:ml-0">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default Layout
