"use server"

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type Notification,
} from "@/lib/notifications"
import { revalidatePath } from "next/cache"

export interface NotificationActionResult {
  success?: boolean
  error?: string
  notifications?: Notification[]
  count?: number
}

export async function fetchNotifications(includeRead = true): Promise<NotificationActionResult> {
  const result = await getNotifications(undefined, 50, includeRead)

  if (result.error) {
    return { error: result.error }
  }

  return { success: true, notifications: result.notifications || [] }
}

export async function markAsRead(notificationId: string): Promise<NotificationActionResult> {
  const result = await markNotificationAsRead(notificationId)

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function markAllAsRead(): Promise<NotificationActionResult> {
  const result = await markAllNotificationsAsRead()

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath("/dashboard")
  return { success: true, count: result.count }
}

export async function deleteNotificationAction(notificationId: string): Promise<NotificationActionResult> {
  const result = await deleteNotification(notificationId)

  if (result.error) {
    return { error: result.error }
  }

  revalidatePath("/dashboard")
  return { success: true }
}
