"use server"

import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { LogEntry } from "@/components/agent-log-display"
import { getDefaultUserId } from "@/lib/default-user"
import { jsonToCsv } from "@/lib/csv" // Import the CSV utility

export interface FetchLogsResult {
  logs?: LogEntry[]
  error?: string
}

export async function fetchAgentLogs(agentId: string, limit = 50): Promise<FetchLogsResult> {
  const supabase = getSupabaseFromServer()
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required to fetch logs." }
  }

  const { data: agentOwner, error: agentOwnerError } = await supabase
    .from("agents")
    .select("owner_id")
    .eq("id", agentId)
    .single()

  if (agentOwnerError || !agentOwner) {
    return { error: "Agent not found or access denied." }
  }
  if (agentOwner.owner_id !== userId) {
    return { error: "Access denied to this agent's logs." }
  }

  const { data, error } = await supabase
    .from("agent_logs")
    .select("id, timestamp, message, log_type, task_id, metadata")
    .eq("agent_id", agentId)
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching agent logs:", error)
    return { error: "Failed to fetch agent logs." }
  }

  const logs: LogEntry[] = data.map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp,
    message: log.message,
    type: log.log_type as LogEntry["type"],
    taskId: log.task_id,
  }))

  return { logs }
}

export async function addAgentLog(
  agentId: string,
  logType: LogEntry["type"],
  message: string,
  taskId?: string,
  metadata?: Record<string, any>,
  userIdForLog?: string,
): Promise<{ success?: boolean; error?: string; logId?: string }> {
  const supabaseAdmin = getSupabaseAdmin()
  let effectiveUserId = userIdForLog

  if (!effectiveUserId) {
    try {
      effectiveUserId = await getDefaultUserId()
    } catch (error) {
      console.error("User context required to add log if user_id not provided explicitly.")
      return { error: "User context required or user_id must be provided for logging." }
    }
  }

  const { data: agentData, error: agentFetchError } = await supabaseAdmin
    .from("agents")
    .select("owner_id")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { error: "Agent not found, cannot add log." }
  }
  if (agentData.owner_id !== effectiveUserId) {
    console.error(
      `Attempt to log for agent ${agentId} with mismatched owner ${agentData.owner_id} and log user ${effectiveUserId}`,
    )
    return { error: "User ID for log does not match agent owner." }
  }

  try {
    const { data: newLog, error } = await supabaseAdmin
      .from("agent_logs")
      .insert({
        agent_id: agentId,
        user_id: effectiveUserId,
        log_type: logType,
        message: message,
        task_id: taskId || null,
        metadata: metadata || null,
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error adding agent log:", error)
      return { error: "Failed to add agent log." }
    }
    if (newLog) {
      revalidatePath(`/dashboard/agents/${agentId}`)
      return { success: true, logId: newLog.id }
    }
    return { error: "Failed to add log, no ID returned." }
  } catch (insertError) {
    console.error("Exception adding agent log:", insertError)
    return { error: "Exception occurred while adding log." }
  }
}

export interface ToggleAgentStatusResult {
  success?: boolean
  error?: string
  newStatus?: "active" | "paused"
}

export async function toggleAgentStatus(
  agentId: string,
  currentStatus: "active" | "paused" | string,
): Promise<ToggleAgentStatusResult> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required." }
  }

  const { data: agentData, error: agentFetchError } = await supabaseServer
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

  const newStatus = currentStatus === "active" ? "paused" : "active"
  const agentName = agentData.name || "Unnamed Agent"

  const { error: updateError } = await supabaseAdmin
    .from("agents")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", agentId)

  if (updateError) {
    console.error(`Error updating agent ${agentId} status to ${newStatus}:`, updateError)
    return { error: `Failed to update agent status: ${updateError.message}` }
  }

  const logMessage = `Agent status changed to ${newStatus} by user.`
  await addAgentLog(
    agentId,
    "milestone",
    logMessage,
    undefined,
    { statusChange: { from: currentStatus, to: newStatus } },
    userId,
  )

  revalidatePath(`/dashboard/agents/${agentId}`)
  revalidatePath("/dashboard")

  return { success: true, newStatus: newStatus as "active" | "paused" }
}

// New action for manual log creation (testing purposes)
export interface CreateTestLogResult {
  success?: boolean
  error?: string
  logId?: string
}

export async function createTestLog(
  agentId: string,
  logType: LogEntry["type"],
  message: string,
): Promise<CreateTestLogResult> {
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required." }
  }

  const result = await addAgentLog(
    agentId,
    logType,
    message,
    undefined,
    { source: "manual_test", createdAt: new Date().toISOString() },
    userId,
  )

  if (result.success) {
    return { success: true, logId: result.logId }
  } else {
    return { error: result.error || "Failed to create test log." }
  }
}

export interface ExportTasksResult {
  success?: boolean
  error?: string
  csvData?: string
}

export async function exportAgentTasksToCsv(agentId: string): Promise<ExportTasksResult> {
  const supabase = getSupabaseFromServer()
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required to export tasks." }
  }

  // Verify agent ownership
  const { data: agentOwner, error: agentOwnerError } = await supabase
    .from("agents")
    .select("owner_id, name")
    .eq("id", agentId)
    .single()

  if (agentOwnerError || !agentOwner) {
    return { error: "Agent not found or access denied." }
  }
  if (agentOwner.owner_id !== userId) {
    return { error: "Access denied to this agent's tasks." }
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, is_dependency, status, blocked_reason, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true })

  if (tasksError) {
    console.error("Error fetching tasks for export:", tasksError)
    return { error: "Failed to fetch tasks for export." }
  }

  if (!tasks || tasks.length === 0) {
    return { success: true, csvData: "", error: "No tasks found to export." }
  }

  const columns = [
    { key: "id", header: "Task ID" },
    { key: "title", header: "Title" },
    { key: "description", header: "Description" },
    { key: "status", header: "Status" },
    { key: "is_dependency", header: "Is Dependency" },
    { key: "blocked_reason", header: "Blocked Reason" },
    { key: "created_at", header: "Created At" },
  ]

  try {
    const csv = jsonToCsv(tasks, columns)
    return { success: true, csvData: csv }
  } catch (csvError: any) {
    console.error("Error converting tasks to CSV:", csvError)
    return { error: `Failed to convert tasks to CSV: ${csvError.message}` }
  }
}

export async function triggerAgentExecution(
  agentId: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { startAgentExecution } = await import("./execution-actions")
    return await startAgentExecution(agentId)
  } catch (error) {
    console.error("Error triggering agent execution:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start agent execution",
    }
  }
}
