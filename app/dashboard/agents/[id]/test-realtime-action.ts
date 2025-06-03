"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { sendSlackNotification } from "@/lib/slack-notifications"
import { revalidatePath } from "next/cache"

export interface RealtimeTestResult {
  success?: boolean
  error?: string
  message?: string
  logsCreated?: number
  taskCreated?: boolean
}

export async function testRealtimeFeatures(agentId: string): Promise<RealtimeTestResult> {
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required." }
  }

  // Verify agent ownership
  const { data: agentData, error: agentFetchError } = await supabaseAdmin
    .from("agents")
    .select("id, owner_id, name")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { error: "Agent not found." }
  }

  if (agentData.owner_id !== userId) {
    return { error: "You do not own this agent." }
  }

  const agentName = agentData.name || "Test Agent"

  try {
    // Create a series of test logs with delays to demonstrate real-time updates
    const testLogs = [
      { type: "milestone", message: "🚀 Starting comprehensive real-time test..." },
      { type: "action", message: "📊 Analyzing system performance metrics" },
      { type: "info", message: "💾 Processing data batch #1 of 3" },
      { type: "success", message: "✅ Data batch #1 processed successfully" },
      { type: "info", message: "💾 Processing data batch #2 of 3" },
      { type: "error", message: "⚠️ Temporary connection timeout - retrying..." },
      { type: "success", message: "✅ Connection restored, continuing with batch #2" },
      { type: "success", message: "✅ Data batch #2 processed successfully" },
      { type: "info", message: "💾 Processing final data batch #3 of 3" },
      { type: "success", message: "✅ All data batches processed successfully" },
      { type: "milestone", message: "🎉 Real-time test completed successfully!" },
    ]

    // Insert all logs at once - they should appear in real-time
    const logsToInsert = testLogs.map((log, index) => ({
      agent_id: agentId,
      user_id: userId,
      log_type: log.type,
      message: log.message,
      metadata: {
        test: true,
        sequence: index + 1,
        timestamp: new Date().toISOString(),
      },
    }))

    const { error: logsError, count: logsCount } = await supabaseAdmin.from("agent_logs").insert(logsToInsert)

    if (logsError) {
      console.error("Error creating test logs:", logsError)
      return { error: `Failed to create test logs: ${logsError.message}` }
    }

    // Create a test dependency task
    const { data: newTask, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert({
        agent_id: agentId,
        title: `🧪 Test dependency: Review ${agentName}'s real-time test results`,
        is_dependency: true,
        status: "blocked",
        blocked_reason:
          "Please review the test logs above and confirm the real-time functionality is working correctly.",
      })
      .select("id")
      .single()

    let taskCreated = false
    if (taskError) {
      console.error("Error creating test task:", taskError)
    } else {
      taskCreated = true
      // Send Slack notification for the new dependency
      await sendSlackNotification(
        `🧪 Real-time test completed for agent "${agentName}"! A new dependency task has been created for your review. Check the Dependency Basket to verify real-time updates are working.`,
      )
    }

    revalidatePath(`/dashboard/agents/${agentId}`)
    revalidatePath("/dashboard/dependencies")

    return {
      success: true,
      message: `Real-time test completed! Created ${logsCount || 0} test logs${taskCreated ? " and 1 dependency task" : ""}. Check your Slack for notifications!`,
      logsCreated: logsCount || 0,
      taskCreated,
    }
  } catch (error) {
    console.error("Error in real-time test:", error)
    return { error: "An unexpected error occurred during the real-time test." }
  }
}
