"use server"

import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendSlackNotification } from "@/lib/slack-notifications"

export interface MarkCompleteState {
  success?: boolean
  message?: string
  error?: string
  taskId?: string
}

// Move dependency to tasks (change status to in_progress and remove from dependencies view)
export async function moveToTasks(
  prevState: MarkCompleteState | undefined,
  formData: FormData,
): Promise<MarkCompleteState> {
  const taskId = formData.get("taskId") as string
  if (!taskId) {
    console.error("[Action: moveToTasks] Error: Task ID is required.")
    return { success: false, error: "Task ID is required" }
  }

  console.log(`[Action: moveToTasks] Attempting to move task ID: ${taskId} to user's active tasks.`)

  try {
    const supabase = getSupabaseFromServer()
    const adminSupabase = getSupabaseAdmin()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("[Action: moveToTasks] Error: Authentication required.", userError?.message)
      return { success: false, error: "Authentication required" }
    }

    console.log(`[Action: moveToTasks] User ID: ${user.id} initiated action for task ${taskId}.`)

    // Get the task with agent information
    const { data: task, error: fetchError } = await adminSupabase // Use admin client for reliable fetch
      .from("tasks")
      .select(`
        id, title, agent_id, status, is_dependency, blocked_reason, metadata,
        agents (owner_id, name)
      `)
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      console.error(`[Action: moveToTasks] Error fetching task ${taskId}:`, fetchError?.message)
      return { success: false, error: `Task not found (ID: ${taskId})`, taskId }
    }

    // Verify ownership
    // @ts-ignore
    if (task.agents?.owner_id !== user.id) {
      console.error(
        `[Action: moveToTasks] Error: User ${user.id} unauthorized for task ${taskId} owned by ${task.agents?.owner_id}.`,
      )
      return { success: false, error: "Unauthorized to modify this task", taskId }
    }

    console.log(
      `[Action: moveToTasks] Task "${task.title}" (ID: ${taskId}) fetched. Current state: is_dependency=${task.is_dependency}, status=${task.status}.`,
    )

    const updatedMetadata = {
      ...task.metadata,
      moved_to_tasks: true, // CRITICAL: User is taking this task
      moved_at: new Date().toISOString(),
      moved_by: user.id,
      workflow_status: "user_working", // CRITICAL: User is actively working on it
      original_dependency: true, // Good to keep track of its origin
      in_history: false, // Explicitly not in history yet
    }

    // Update task to move it to active tasks
    const { error: updateError } = await adminSupabase
      .from("tasks")
      .update({
        status: "in_progress", // CRITICAL: Task is now in progress
        is_dependency: false, // CRITICAL: No longer a PENDING dependency for the AGENT
        blocked_reason: null, // Clear any previous blocked reason
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    if (updateError) {
      console.error(`[Action: moveToTasks] Error updating task ${taskId} in database:`, updateError.message)
      return { success: false, error: "Failed to move task to your tasks", taskId }
    }

    console.log(
      `[Action: moveToTasks] Task ${taskId} successfully updated in DB. New state: status=in_progress, is_dependency=false. Metadata:`,
      updatedMetadata,
    )

    // Log the action
    await adminSupabase.from("agent_logs").insert({
      agent_id: task.agent_id,
      log_type: "action",
      message: `📋 User took ownership of dependency: "${task.title}" and moved it to their active tasks.`,
      metadata: { task_id: taskId, action: "move_to_tasks", user_id: user.id },
    })

    // Send notification
    // @ts-ignore
    await sendSlackNotification(`📋 User took ownership of dependency "${task.title}" for ${task.agents?.name}`)

    // Revalidate all relevant paths to ensure UI consistency
    console.log(`[Action: moveToTasks] Revalidating paths for task ${taskId}...`)
    revalidatePath("/dashboard", "layout") // Home dashboard
    revalidatePath("/dashboard/dependencies", "layout") // Dependencies page
    if (task.agent_id) {
      revalidatePath(`/dashboard/agents/${task.agent_id}`, "layout") // Specific agent page
    }

    console.log(`[Action: moveToTasks] Successfully moved dependency "${task.title}" (ID: ${taskId}) to active tasks.`)
    return {
      success: true,
      message: `"${task.title}" is now in "Your Workspace" on the Home Dashboard.`,
      taskId,
    }
  } catch (error: any) {
    console.error(`[Action: moveToTasks] Unexpected error for task ID ${taskId}:`, error.message, error.stack)
    return { success: false, error: "An unexpected error occurred while moving the task." }
  }
}

export async function completeTaskAndMoveToHistory(
  prevState: MarkCompleteState | undefined,
  formData: FormData,
): Promise<MarkCompleteState> {
  const taskId = formData.get("taskId") as string
  const completionNotes = (formData.get("completionNotes") as string) || ""

  if (!taskId) {
    console.error("[Action: completeTaskAndMoveToHistory] Error: Task ID is required.")
    return { success: false, error: "Task ID is required" }
  }
  console.log(
    `[Action: completeTaskAndMoveToHistory] Attempting to complete task ID: ${taskId}. Notes: "${completionNotes}"`,
  )

  try {
    const supabase = getSupabaseFromServer()
    const adminSupabase = getSupabaseAdmin()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("[Action: completeTaskAndMoveToHistory] Error: Authentication required.", userError?.message)
      return { success: false, error: "Authentication required" }
    }
    console.log(`[Action: completeTaskAndMoveToHistory] User ID: ${user.id} initiated action for task ${taskId}.`)

    const { data: task, error: fetchError } = await adminSupabase
      .from("tasks")
      .select(`id, title, agent_id, metadata, agents (owner_id, name)`)
      .eq("id", taskId)
      .single()

    if (fetchError || !task) {
      console.error(`[Action: completeTaskAndMoveToHistory] Error fetching task ${taskId}:`, fetchError?.message)
      return { success: false, error: `Task not found (ID: ${taskId})`, taskId }
    }

    // @ts-ignore
    if (task.agents?.owner_id !== user.id) {
      console.error(
        `[Action: completeTaskAndMoveToHistory] Error: User ${user.id} unauthorized for task ${taskId} owned by ${task.agents?.owner_id}.`,
      )
      return { success: false, error: "Unauthorized to modify this task", taskId }
    }

    console.log(
      `[Action: completeTaskAndMoveToHistory] Task "${task.title}" (ID: ${taskId}) fetched. Current metadata:`,
      task.metadata,
    )

    const updatedMetadata = {
      ...task.metadata,
      completion_notes: completionNotes || "Task completed by user.",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      workflow_status: "completed", // CRITICAL: Mark workflow as completed
      in_history: true, // CRITICAL: Explicitly mark as in history
      moved_to_tasks: false, // CRITICAL: No longer in active workspace
    }

    const { error: updateError } = await adminSupabase
      .from("tasks")
      .update({
        status: "done", // CRITICAL: Mark as completed
        is_dependency: true, // CRITICAL: It's now a completed dependency (for history view)
        blocked_reason: null, // Clear any blocked reason
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    if (updateError) {
      console.error(
        `[Action: completeTaskAndMoveToHistory] Error updating task ${taskId} in database:`,
        updateError.message,
      )
      return { success: false, error: "Failed to complete task", taskId }
    }

    console.log(
      `[Action: completeTaskAndMoveToHistory] Task ${taskId} successfully updated in DB. New state: status=done, is_dependency=true. Metadata:`,
      updatedMetadata,
    )

    await adminSupabase.from("agent_logs").insert({
      agent_id: task.agent_id,
      log_type: "success",
      message: `✅ User completed task: "${task.title}" (formerly a dependency).`,
      metadata: {
        task_id: taskId,
        action: "complete_task_from_workspace",
        user_id: user.id,
        completion_notes: completionNotes,
      },
    })
    // @ts-ignore
    const agentName = task.agents?.name || "Agent"
    await sendSlackNotification(`✅ Task "${task.title}" completed by user! ${agentName} may now proceed if unblocked.`)

    if (task.agent_id) {
      try {
        await triggerAgentRestart(task.agent_id)
      } catch (restartError: any) {
        console.warn(
          `[Action: completeTaskAndMoveToHistory] Failed to trigger agent restart for ${task.agent_id} (non-critical):`,
          restartError.message,
        )
      }
    }

    console.log(`[Action: completeTaskAndMoveToHistory] Revalidating paths for task ${taskId}...`)
    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard/dependencies", "layout")
    if (task.agent_id) {
      revalidatePath(`/dashboard/agents/${task.agent_id}`, "layout")
    }
    revalidatePath("/", "layout")

    console.log(`[Action: completeTaskAndMoveToHistory] Task "${task.title}" (ID: ${taskId}) processed successfully.`)
    return {
      success: true,
      message: `"${task.title}" completed! It has been moved to your completed history.`,
      taskId,
    }
  } catch (error: any) {
    console.error(
      `[Action: completeTaskAndMoveToHistory] Unexpected error for task ID ${taskId}:`,
      error.message,
      error.stack,
    )
    return { success: false, error: "An unexpected error occurred while completing the task." }
  }
}

export async function updateTaskMetadata(
  prevState: MarkCompleteState | undefined,
  formData: FormData,
): Promise<MarkCompleteState> {
  const taskId = formData.get("taskId") as string
  if (!taskId) return { success: false, error: "Task ID is required" }

  try {
    const supabase = getSupabaseFromServer()
    const adminSupabase = getSupabaseAdmin()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return { success: false, error: "Authentication required" }

    const { data: task, error: fetchError } = await adminSupabase
      .from("tasks")
      .select(`id, metadata, agents (owner_id)`)
      .eq("id", taskId)
      .single()

    if (fetchError || !task) return { success: false, error: "Task not found" }
    // @ts-ignore
    if (task.agents?.owner_id !== user.id) return { success: false, error: "Unauthorized" }

    const currentMetadata = task.metadata || {}
    const updates: Record<string, any> = {}
    formData.forEach((value, key) => {
      if (key !== "taskId") {
        if (key === "estimated_hours" && value) updates[key] = Number(value)
        else if (value) updates[key] = value
      }
    })

    const newMetadata = { ...currentMetadata, ...updates }
    const { error: updateError } = await adminSupabase
      .from("tasks")
      .update({ metadata: newMetadata, updated_at: new Date().toISOString() })
      .eq("id", taskId)

    if (updateError) return { success: false, error: "Failed to update task settings" }

    revalidatePath("/dashboard/dependencies", "layout")
    return { success: true, message: "Task settings updated successfully.", taskId }
  } catch (error: any) {
    console.error("[Action: updateTaskMetadata] Error:", error.message)
    return { success: false, error: "An unexpected error occurred." }
  }
}

async function triggerAgentRestart(agentId: string): Promise<void> {
  if (!agentId) {
    console.warn("[Helper: triggerAgentRestart] agentId is undefined, skipping restart.")
    return
  }
  console.log(`[Helper: triggerAgentRestart] Checking if agent ${agentId} needs restart.`)
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { data: remainingDeps, error: depsError } = await supabaseAdmin
      .from("tasks")
      .select("id")
      .eq("agent_id", agentId)
      .eq("is_dependency", true)
      .in("status", ["blocked", "todo"]) // Only truly blocking statuses

    if (depsError) {
      console.error(
        `[Helper: triggerAgentRestart] Error fetching remaining dependencies for agent ${agentId}:`,
        depsError.message,
      )
      return
    }

    if (!remainingDeps || remainingDeps.length === 0) {
      console.log(
        `[Helper: triggerAgentRestart] No remaining blocking dependencies for agent ${agentId}. Triggering restart.`,
      )
      const { data: agentData, error: agentFetchError } = await supabaseAdmin
        .from("agents")
        .select("metadata")
        .eq("id", agentId)
        .single()
      if (agentFetchError) {
        console.error(
          `[Helper: triggerAgentRestart] Error fetching agent ${agentId} metadata:`,
          agentFetchError.message,
        )
        // Continue, but metadata might not be preserved perfectly
      }

      const { error: updateAgentError } = await supabaseAdmin
        .from("agents")
        .update({
          status: "active",
          metadata: {
            ...(agentData?.metadata || {}), // Preserve existing metadata
            auto_restarted: true,
            restart_reason: "All dependencies completed by user or task completion unblocked agent.",
            restarted_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId)

      if (updateAgentError) {
        console.error(`[Helper: triggerAgentRestart] Error updating agent ${agentId} status:`, updateAgentError.message)
      } else {
        await supabaseAdmin.from("agent_logs").insert({
          agent_id: agentId,
          log_type: "milestone",
          message: "🚀 Agent automatically restarted - all dependencies resolved or task completion unblocked.",
          metadata: { auto_restart: true, trigger: "dependency_resolution_or_task_completion" },
        })
        console.log(`[Helper: triggerAgentRestart] Agent ${agentId} restarted successfully.`)
      }
    } else {
      console.log(
        `[Helper: triggerAgentRestart] Agent ${agentId} still has ${remainingDeps.length} pending dependencies. No restart triggered.`,
      )
    }
  } catch (error: any) {
    console.error(`[Helper: triggerAgentRestart] Unexpected error for agent ${agentId}:`, error.message)
  }
}
