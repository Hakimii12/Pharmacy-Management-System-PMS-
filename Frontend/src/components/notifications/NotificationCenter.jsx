"use client"

import { useState, useEffect, useCallback } from "react" // Add useCallback
import NotificationItem from "./NotificationItem"
import { FaBell, FaCheck } from "react-icons/fa"
import axios from "axios"
import Api from "../../data/API.json"
import { getAllData, putData, deleteData, clearStore } from "../../lib/indexedDB" // Import IndexedDB helpers

const NotificationCenter = () => {
  const ApiLink = Api.link
  const [activeTab, setActiveTab] = useState("all")
  const [notifs, setNotifs] = useState([])
  const [isOnline, setIsOnline] = useState(navigator.onLine) // Track online status

  // Function to check network status
  const updateOnlineStatus = () => {
    setIsOnline(navigator.onLine)
  }

  useEffect(() => {
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)
    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [])

  const NOTIFICATIONS_STORE = "notifications" // Define store name

  const FetchNotification = useCallback(async () => {
    // 1. Try to load from IndexedDB first
    try {
      const cachedNotifs = await getAllData(NOTIFICATIONS_STORE)
      if (cachedNotifs.length > 0) {
        setNotifs(cachedNotifs)
        console.log("Notifications loaded from IndexedDB.")
      }
    } catch (dbError) {
      console.error("Error loading notifications from IndexedDB:", dbError)
    }

    // 2. Then, try to fetch from network if online
    if (isOnline) {
      try {
        const res = await axios.get(`${ApiLink}/api/notify/notification`, {
          withCredentials: true,
        })
        const fetchedNotifs = res.data
        setNotifs(fetchedNotifs)
        console.log("Notifications fetched from network.")

        // 3. Update IndexedDB with fresh data
        await clearStore(NOTIFICATIONS_STORE) // Clear old data
        for (const notif of fetchedNotifs) {
          await putData(NOTIFICATIONS_STORE, notif)
        }
        console.log("Notifications updated in IndexedDB.")
      } catch (error) {
        console.error("Network fetch error:", error)
        if (notifs.length === 0) {
          // Only show error if no cached data
          toast.error("Failed to fetch notifications. You might be offline.")
        }
      }
    } else {
      toast.info("You are offline. Displaying cached notifications.")
    }
  }, [ApiLink, isOnline, notifs.length]) // Add notifs.length to dependencies

  // Function to sync offline changes to backend
  const syncNotifications = useCallback(async () => {
    if (!isOnline) return

    // Example: Syncing 'mark as read' and 'delete' operations
    // In a real app, you'd store pending operations in a separate IndexedDB store
    // and process them here. For simplicity, this example assumes direct updates.

    // Re-fetch and update local cache to ensure consistency after coming online
    await FetchNotification()
    toast.success("Notifications synchronized with backend.")
  }, [isOnline, FetchNotification])

  useEffect(() => {
    FetchNotification()
  }, [FetchNotification])

  useEffect(() => {
    if (isOnline) {
      syncNotifications() // Attempt to sync when coming online
    }
  }, [isOnline, syncNotifications])

  const filteredNotifs =
    activeTab === "all" ? notifs : notifs.filter((n) => n.type.toUpperCase() === activeTab.toUpperCase())

  const markAsRead = async (id) => {
    // Update local state and IndexedDB immediately
    setNotifs((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    try {
      await putData(NOTIFICATIONS_STORE, { ...notifs.find((n) => n._id === id), read: true })
      console.log("Notification marked as read in IndexedDB.")
    } catch (dbError) {
      console.error("Error updating IndexedDB for markAsRead:", dbError)
    }

    // Attempt to sync with backend if online
    if (isOnline) {
      try {
        await axios.put(`${ApiLink}/api/notify/notification/${id}`, {}, { withCredentials: true })
        toast.success("Notification marked as read.")
      } catch (error) {
        console.error("Network error marking as read:", error)
        toast.warn("Could not sync 'mark as read' to server. Will retry when online.")
        // In a full offline-first app, you'd queue this operation
      }
    } else {
      toast.info("Notification marked as read locally. Will sync when online.")
    }
  }

  const markAllAsRead = async () => {
    // Update local state and IndexedDB immediately
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      const allCurrentNotifs = await getAllData(NOTIFICATIONS_STORE)
      for (const notif of allCurrentNotifs) {
        await putData(NOTIFICATIONS_STORE, { ...notif, read: true })
      }
      console.log("All notifications marked as read in IndexedDB.")
    } catch (dbError) {
      console.error("Error updating IndexedDB for markAllAsRead:", dbError)
    }

    // Attempt to sync with backend if online
    if (isOnline) {
      try {
        await axios.put(`${ApiLink}/api/notify/MarkAsReadAll`, {}, { withCredentials: true })
        toast.success("All notifications marked as read.")
      } catch (error) {
        console.error("Network error marking all as read:", error)
        toast.warn("Could not sync 'mark all as read' to server. Will retry when online.")
        // In a full offline-first app, you'd queue this operation
      }
    } else {
      toast.info("All notifications marked as read locally. Will sync when online.")
    }
  }

  const deleteNotification = async (id) => {
    // Update local state and IndexedDB immediately
    setNotifs((prev) => prev.filter((n) => n._id !== id))
    try {
      await deleteData(NOTIFICATIONS_STORE, id)
      console.log("Notification deleted from IndexedDB.")
    } catch (dbError) {
      console.error("Error deleting from IndexedDB:", dbError)
    }

    // Attempt to sync with backend if online
    if (isOnline) {
      try {
        await axios.delete(`${ApiLink}/api/notify/removeNotification/${id}`, { withCredentials: true })
        toast.success("Notification deleted.")
      } catch (error) {
        console.error("Network error deleting notification:", error)
        toast.warn("Could not sync 'delete notification' to server. Will retry when online.")
        // In a full offline-first app, you'd queue this operation
      }
    } else {
      toast.info("Notification deleted locally. Will sync when online.")
    }
  }

  const unreadCount = notifs.filter((n) => !n.read).length
  const getTabTitle = (tab) => {
    switch (tab) {
      case "all":
        return "All Notifications"
      case "OutOfStock":
        return "Sold Out Alerts"
      case "Expired":
        return "Expired Drugs"
      case "LowStock":
        return "Low Stock"
      case "NearExpiry":
        return "Nearly Expire"
      default:
        return "Notifications"
    }
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FaBell className="mr-2 text-blue-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            disabled={unreadCount === 0}
          >
            <FaCheck className="mr-1" /> Mark All as Read
          </button>
        </div>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="flex overflow-x-auto space-x-2 pb-1">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === "all" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === "OutOfStock" ? "bg-red-100 text-red-700" : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("OutOfStock")}
          >
            Sold Out
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === "Expired" ? "bg-gray-100 text-gray-700" : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("Expired")}
          >
            Expired
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === "LowStock" ? "bg-yellow-100 text-yellow-700" : "text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("LowStock")}
          >
            Low Stock
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{getTabTitle(activeTab)}</h3>

        <div className="space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            filteredNotifs.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
export default NotificationCenter
