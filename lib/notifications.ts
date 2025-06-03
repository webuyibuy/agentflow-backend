"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error" | "agent_update" | "task_complete" | "dependency_ready"
  is_read: boolean
  action_url?: string
  metadata?: Record<string, any>
  created_at: string
  expires_at?: string
}

export interface CreateNotificationParams {
  title: string
  message: string
  type: Notification["type"]
  actionUrl?: string
  metadata?: Record<string, any>
  expiresInHours?: number
  userId?: string
}

export async function createNotification({
  title,
  message,
  type,
  actionUrl,
  metadata,
  expiresInHours = 168, // 7 days default
  userId,
}: CreateNotificationParams): Promise<{ success: boolean; error?: string; notificationId?: string }> {
  const supabaseAdmin = getSupabaseAdmin()

  let effectiveUserId = userId
  if (!effectiveUserId) {
    try {
      effectiveUserId = await getDefaultUserId()
    } catch (error) {
      return { success: false, error: "User context required for notification creation." }
    }
  }

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiresInHours)

  try {
    const { data: notification, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: effectiveUserId,
        title: title.trim(),
        message: message.trim(),
        type,
        action_url: actionUrl || null,
        metadata: metadata || null,
        expires_at: expiresAt.toISOString(),
        is_read: false,
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error: `Failed to create notification: ${error.message}` }
    }

    return { success: true, notificationId: notification.id }
  } catch (error) {
    console.error("Unexpected error creating notification:", error)
    return { success: false, error: "An unexpected error occurred while creating the notification." }
  }
}

export async function getNotifications(
  userId?: string,
  limit = 50,
  includeRead = true,
): Promise<{ notifications?: Notification[]; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin()

  let effectiveUserId = userId
  if (!effectiveUserId) {
    try {
      effectiveUserId = await getDefaultUserId()
    } catch (error) {
      return { error: "User context required for fetching notifications." }
    }
  }

  try {
    let query = supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (!includeRead) {
      query = query.eq("is_read", false)
    }

    // Filter out expired notifications
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    const { data: notifications, error } = await query

    if (error) {
      console.error("Error fetching notifications:", error)
      return { error: `Failed to fetch notifications: ${error.message}` }
    }

    return { notifications: notifications as Notification[] }
  } catch (error) {
    // This catch block is already designed to handle unexpected errors like SyntaxError
    console.error("Unexpected error fetching notifications:", error)
    return {
      error: `An unexpected error occurred while fetching notifications: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function markNotificationAsRead(
  notificationId: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin()

  let effectiveUserId = userId
  if (!effectiveUserId) {
    try {
      effectiveUserId = await getDefaultUserId()
    } catch (error) {
      return { success: false, error: "User context required." }
    }
  }

  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", effectiveUserId)

    if (error) {
      console.error("Error marking notification as read:", error)
      return { success: false, error: `Failed to mark notification as read: ${error.message}` }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error marking notification as read:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function markAllNotificationsAsRead(
  userId?: string,
): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabaseAdmin = getSupabaseAdmin()

  let effectiveUserId = userId
  if (!effectiveUserId) {
    try {
      effectiveUserId = await getDefaultUserId()
    } catch (error) {
      return { success: false, error: "User context required." }
    }
  }

  try {
    const { error, count } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("user_id", effectiveUserId)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return { success: false, error: `Failed to mark notifications as read: ${error.message}` }
    }

    return { success: true, count: count || 0 }
  } catch (error) {
    console.error("Unexpected error marking all notifications as read:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

export async function deleteNotification(
  notificationId: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin()

  let effectiveUserId = userId
  if (!effectiveUserId) {
    try {
      effectiveUserId = await getDefaultUserId()
    } catch (error) {
      return { success: false, error: "User context required." }
    }
  }

  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", effectiveUserId)

    if (error) {
      console.error("Error deleting notification:", error)
      return { success: false, error: `Failed to delete notification: ${error.message}` }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting notification:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

// Helper functions for common notification types
export async function notifyTaskCompleted(taskTitle: string, agentName: string, userId?: string) {
  return createNotification({
    title: "Task Completed",
    message: `"${taskTitle}" has been completed by ${agentName}`,
    type: "task_complete",
    actionUrl: "/dashboard",
    metadata: { taskTitle, agentName },
    userId,
  })
}

export async function notifyDependencyReady(taskTitle: string, agentName: string, userId?: string) {
  return createNotification({
    title: "Action Required",
    message: `"${taskTitle}" needs your approval for ${agentName} to continue`,
    type: "dependency_ready",
    actionUrl: "/dashboard/dependencies",
    metadata: { taskTitle, agentName },
    userId,
  })
}

export async function notifyAgentStatusChange(agentName: string, newStatus: string, userId?: string) {
  return createNotification({
    title: "Agent Status Changed",
    message: `${agentName} is now ${newStatus}`,
    type: "agent_update",
    actionUrl: "/dashboard",
    metadata: { agentName, newStatus },
    userId,
  })
}

export async function notifySystemUpdate(title: string, message: string, userId?: string) {
  return createNotification({
    title,
    message,
    type: "info",
    actionUrl: "/dashboard",
    expiresInHours: 72, // 3 days for system updates
    userId,
  })
}
