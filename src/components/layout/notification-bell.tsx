"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, X } from "lucide-react"
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher"
import { formatDate } from "@/utils/formatters"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  createdAt: string
}

const typeIcons: Record<string, string> = {
  approval: "✅",
  rejection: "❌",
  dispatch: "🚚",
  approval_request: "🔔",
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch { /* silent */ }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Handle real-time delete event
  const handleNotificationDeleted = useCallback((data: { userId: string; notificationId: string }) => {
    setNotifications((prev) => prev.filter((n) => n.id !== data.notificationId))
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  // Real-time updates via Pusher
  useEffect(() => {
    const client = getPusherClient()
    const channel = client.subscribe(CHANNELS.NOTIFICATIONS)
    channel.bind(EVENTS.NOTIFICATION_CREATED, fetchNotifications)
    channel.bind(EVENTS.NOTIFICATION_DELETED, handleNotificationDeleted)
    return () => {
      channel.unbind(EVENTS.NOTIFICATION_CREATED, fetchNotifications)
      channel.unbind(EVENTS.NOTIFICATION_DELETED, handleNotificationDeleted)
      client.unsubscribe(CHANNELS.NOTIFICATIONS)
    }
  }, [fetchNotifications, handleNotificationDeleted])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const handleClick = async (n: Notification) => {
    // Delete notification on click (Option 3: Delete on mark-read)
    await fetch(`/api/notifications/${n.id}`, { method: "DELETE" })
    setNotifications((prev) => prev.filter((x) => x.id !== n.id))
    if (!n.read) {
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (n.link) {
      router.push(n.link)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-4 w-4 text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full ring-2 ring-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-white px-0.5">{unreadCount > 9 ? "9+" : unreadCount}</span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${!n.read ? "bg-blue-50/50" : ""}`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{typeIcons[n.type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(new Date(n.createdAt))}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
