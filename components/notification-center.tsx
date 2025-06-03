"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BellIcon, CheckIcon, Trash2Icon, XIcon } from "lucide-react"
import Link from "next/link"
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotificationAction,
} from "@/app/dashboard/notifications/actions"
import type { Notification } from "@/lib/notifications"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "success":
    case "task_complete":
      return <CheckIcon className="h-4 w-4 text-[#34c759]" />
    case "warning":
      return <BellIcon className="h-4 w-4 text-[#ff9f0a]" />
    case "error":
      return <XIcon className="h-4 w-4 text-[#ff3b30]" />
    case "agent_update":
      return <BellIcon className="h-4 w-4 text-[#5ac8fa]" />
    case "dependency_ready":
      return <BellIcon className="h-4 w-4 text-[#ff9f0a]" />
    case "info":
    default:
      return <BellIcon className="h-4 w-4 text-[#8e8e93]" />
  }
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  const loadNotifications = async (includeRead = true) => {
    setIsLoading(true)
    startTransition(async () => {
      const result = await fetchNotifications(includeRead)
      if (result.success && result.notifications) {
        setNotifications(result.notifications)
        setUnreadCount(result.notifications.filter((n) => !n.is_read).length)
      } else if (result.error) {
        toast({
          title: "Error fetching notifications",
          description: result.error,
          variant: "destructive",
        })
      }
      setIsLoading(false)
    })
  }

  useEffect(() => {
    loadNotifications()

    const channel = supabase
      .channel("realtime-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
        console.log("Realtime notification change:", payload)
        // Simple reload for now, can be optimized to update/add/remove specific notification
        loadNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      const result = await markAsRead(id)
      if (result.success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
        toast({ title: "Notification marked as read." })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      const result = await markAllAsRead()
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
        toast({ title: `${result.count || 0} notifications marked as read.` })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleDeleteNotification = (id: string) => {
    startTransition(async () => {
      const result = await deleteNotificationAction(id)
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        // Recalculate unread count, though the deleted one might have been read
        setUnreadCount((prev) => notifications.filter((n) => n.id !== id && !n.is_read).length)
        toast({ title: "Notification deleted." })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full h-10 w-10 flex items-center justify-center"
        >
          <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.2 }}>
            <BellIcon className="h-5 w-5" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -right-1"
                >
                  <Badge
                    variant="destructive"
                    className="h-5 w-5 min-w-5 flex items-center justify-center rounded-full p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <span className="sr-only">Open notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 md:w-96 rounded-xl border border-[#e5e5ea] bg-white/95 backdrop-blur-xl p-0 shadow-lg dark:border-[#3a3a3c] dark:bg-[#2c2c2e]/95"
      >
        <DropdownMenuLabel className="flex items-center justify-between p-4 border-b border-[#e5e5ea] dark:border-[#3a3a3c]">
          <span className="text-base font-medium">Notifications</span>
          {notifications.length > 0 && !isLoading && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[#0071e3] hover:text-[#0077ED] dark:text-[#0091ff]"
              onClick={handleMarkAllAsRead}
              disabled={isPending || unreadCount === 0}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>

        {isLoading && notifications.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[#0071e3] border-t-transparent rounded-full"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-[#f2f2f7] dark:bg-[#3a3a3c] flex items-center justify-center mb-4">
              <BellIcon className="h-8 w-8 text-[#8e8e93] dark:text-[#aeaeb2]" />
            </div>
            <p className="text-[#1c1c1e] dark:text-white font-medium">No notifications</p>
            <p className="text-sm text-[#8e8e93] dark:text-[#aeaeb2] mt-1">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] md:h-[500px]">
            <AnimatePresence initial={false}>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenuItem
                    className={cn(
                      "flex items-start gap-3 p-4 hover:bg-[#f2f2f7] data-[highlighted]:bg-[#f2f2f7] border-b border-[#e5e5ea] dark:border-[#3a3a3c] dark:hover:bg-[#3a3a3c] dark:data-[highlighted]:bg-[#3a3a3c]",
                      !notification.is_read && "bg-[#e1f0ff] dark:bg-[#0d253a]",
                    )}
                    onSelect={(e) => e.preventDefault()} // Prevent closing on item click
                  >
                    <div className="mt-1 shrink-0">
                      <div className="h-8 w-8 rounded-full bg-[#f2f2f7] dark:bg-[#3a3a3c] flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">{notification.title}</p>
                      <p className="text-xs text-[#8e8e93] dark:text-[#aeaeb2] mt-1">{notification.message}</p>
                      <p className="text-xs text-[#8e8e93] dark:text-[#aeaeb2] mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                      {notification.action_url && (
                        <Link href={notification.action_url} passHref legacyBehavior>
                          <a
                            className="text-xs text-[#0071e3] hover:underline mt-2 inline-block dark:text-[#0091ff]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Details
                          </a>
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2 shrink-0">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          disabled={isPending}
                          title="Mark as read"
                        >
                          <CheckIcon className="h-4 w-4 text-[#34c759]" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNotification(notification.id)
                        }}
                        disabled={isPending}
                        title="Delete notification"
                      >
                        <Trash2Icon className="h-4 w-4 text-[#ff3b30]" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}

        <div className="p-4 border-t border-[#e5e5ea] dark:border-[#3a3a3c] text-center">
          <Link
            href="/dashboard/notifications"
            className="text-sm text-[#0071e3] hover:text-[#0077ED] dark:text-[#0091ff]"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
