"use server"

import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { LogEntry } from "@/components/agent-log-display"

export interface SeedLogsResult {
  success?: boolean
  error?: string
  message?: string
  logsAdded?: number
}

const demoLogMessages: Array<Omit<LogEntry, "id" | "timestamp" | "agent_id" | "user_id">> = [
  { type: "milestone", message: "Agent initiated. System checks complete." },
  { type: "action", message: "Fetching initial data from API X.", taskId: "task_abc_123" },
  { type: "info", message: "Data processing started. 100 records found." },
  { type: "success", message: "Initial data fetch and processing successful.", taskId: "task_abc_123" },
  { type: "error", message: "Failed to connect to external service Y. Retrying in 5 minutes.", taskId: "task_def_456" },
  { type: "task_update", message: "Task 'Analyze Data' status changed to 'in_progress'.", taskId: "task_ghi_789" },
  { type: "action", message: "Generating report based on analyzed data." },
  { type: "milestone", message: "Report generation complete. Awaiting review." },
  { type: "info", message: "User notification sent for report review." },
  { type: "error", message: "Timeout while sending email notification. Will retry." },
  { type: "success", message: "Email notification successfully sent after retry." },
  {
    type: "task_update",
    message: "Task 'Submit Report' status changed to 'blocked', pending approval.",
    taskId: "task_jkl_012",
  },
  { type: "action", message: "Agent entering idle mode, monitoring for new triggers." },
]

export async function seedDemoAgentLogs(agentId: string): Promise<SeedLogsResult> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser()

  if (userError || !user) {
    return { error: "Authentication required." }
  }

  // Verify agent ownership
  const { data: agentData, error: agentFetchError } = await supabaseServer
    .from("agents")
    .select("id, owner_id")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { error: "Agent not found." }
  }

  if (agentData.owner_id !== user.id) {
    return { error: "You do not own this agent." }
  }

  const logsToInsert = demoLogMessages.map((log, index) => ({
    agent_id: agentId,
    user_id: user.id, // Associate log with the user who owns the agent
    log_type: log.type,
    message: log.message,
    task_id: log.taskId, // This will be null if undefined
    // Simulate slightly different timestamps for ordering
    timestamp: new Date(Date.now() - (demoLogMessages.length - index) * 5 * 60 * 1000).toISOString(),
    metadata: { seeded: true, source: "demo_action" },
  }))

  const { error: insertError, count } = await supabaseAdmin.from("agent_logs").insert(logsToInsert)

  if (insertError) {
    console.error("Error seeding demo logs:", insertError)
    return { error: `Failed to seed demo logs: ${insertError.message}` }
  }

  revalidatePath(`/dashboard/agents/${agentId}`)

  return {
    success: true,
    message: `${count || 0} demo log entries added successfully for agent ${agentId}.`,
    logsAdded: count || 0,
  }
}
