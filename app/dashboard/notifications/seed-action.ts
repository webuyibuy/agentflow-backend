"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { createNotification } from "@/lib/notifications" // Assuming createNotification is correctly set up

export async function seedSampleNotifications(): Promise<{
  success: boolean
  message: string
  seededCount?: number
  error?: string
}> {
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    console.error("Error getting default user ID for seeding:", error)
    return { success: false, message: "Failed to get user context for seeding.", error: (error as Error).message }
  }

  const notificationsToSeed = [
    {
      title: "Welcome to AgentFlow!",
      message: "We're excited to have you on board. Explore your dashboard and create your first agent.",
      type: "info" as const,
      actionUrl: "/dashboard",
    },
    {
      title: "Task 'Initial Research' Completed",
      message: "Your agent 'Market Analyst X' has completed the task: Initial Research.",
      type: "task_complete" as const,
      actionUrl: "/dashboard/agents/some-agent-id/tasks/some-task-id", // Replace with actual links if possible
      metadata: { agentName: "Market Analyst X", taskTitle: "Initial Research" },
    },
    {
      title: "Action Required: Approve Content Draft",
      message: "Agent 'Content Creator Bot' needs your approval for the blog post draft before publishing.",
      type: "dependency_ready" as const,
      actionUrl: "/dashboard/dependencies",
      metadata: { agentName: "Content Creator Bot", taskTitle: "Blog Post Draft" },
    },
    {
      title: "Agent 'Support Pro' Paused",
      message: "Your agent 'Support Pro' has been paused due to an external API issue.",
      type: "agent_update" as const,
      actionUrl: "/dashboard/agents/another-agent-id",
      metadata: { agentName: "Support Pro", newStatus: "paused" },
    },
    {
      title: "System Maintenance Scheduled",
      message: "We'll be undergoing scheduled maintenance on Sunday at 2 AM UTC. Expect brief downtime.",
      type: "warning" as const,
      expiresInHours: 48,
    },
    {
      title: "New Feature: Agent Templates!",
      message: "Quickly create powerful agents using our new pre-built templates. Check them out!",
      type: "success" as const,
      actionUrl: "/dashboard/agents/new",
      metadata: { feature: "Agent Templates" },
    },
  ]

  let seededCount = 0
  const supabaseAdmin = getSupabaseAdmin()

  // Optional: Clear existing notifications for the user before seeding to avoid duplicates on re-runs
  // This is for testing; be cautious in a production environment.
  /*
  const { error: deleteError } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .ilike("title", "%Welcome to AgentFlow!%") // Example: only delete specific seeded notifications
  
  if (deleteError) {
    console.warn("Could not clear some old seeded notifications:", deleteError.message)
  }
  */

  for (const notif of notificationsToSeed) {
    const result = await createNotification({ ...notif, userId })
    if (result.success) {
      seededCount++
    } else {
      console.error(`Failed to seed notification "${notif.title}": ${result.error}`)
    }
  }

  if (seededCount > 0) {
    return {
      success: true,
      message: `Successfully seeded ${seededCount} sample notifications for user ${userId}.`,
      seededCount,
    }
  } else {
    return {
      success: false,
      message: "No notifications were seeded. Check server logs for errors.",
      error: "Seeding failed for all notifications.",
    }
  }
}
