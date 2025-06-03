"use server"

import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { addAgentLog } from "./actions"
import { sendSlackNotification } from "@/lib/slack-notifications"
import { getDefaultUserId } from "@/lib/default-user"
import { triggerAgentExecution } from "./actions"

interface CreateTaskParams {
  agentId: string
  title: string
  description?: string
  priority?: number
  dueDate?: string
}

export async function createTask(params: CreateTaskParams) {
  try {
    const { agentId, title, description = "", priority = 1, dueDate = null } = params

    const supabase = getSupabaseFromServer()
    const userId = await getDefaultUserId()

    // Verify agent ownership
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("owner_id", userId)
      .single()

    if (agentError || !agent) {
      console.error("Agent access error:", agentError)
      return {
        success: false,
        error: "You don't have access to this agent or it doesn't exist",
      }
    }

    // Create the task
    const now = new Date().toISOString()
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        agent_id: agentId,
        title,
        description,
        status: "pending",
        priority,
        due_date: dueDate,
        created_at: now,
        updated_at: now,
        completion_percentage: 0,
      })
      .select()
      .single()

    if (taskError) {
      console.error("Task creation error:", taskError)
      return { success: false, error: "Failed to create task" }
    }

    revalidatePath(`/dashboard/agents/${agentId}`)

    return {
      success: true,
      task,
    }
  } catch (error) {
    console.error("Task creation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating task",
    }
  }
}

export async function updateTaskStatus(taskId: string, status: string) {
  try {
    const supabase = getSupabaseFromServer()
    const userId = await getDefaultUserId()

    // Get the task and verify ownership through agent
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*, agents!inner(*)")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      console.error("Task fetch error:", taskError)
      return { success: false, error: "Task not found" }
    }

    // @ts-ignore - We know agents exists from the join
    if (task.agents.owner_id !== userId) {
      return { success: false, error: "You don't have access to this task" }
    }

    // Update the task status
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status,
        updated_at: new Date().toISOString(),
        completion_percentage: status === "completed" ? 100 : task.completion_percentage,
      })
      .eq("id", taskId)

    if (updateError) {
      console.error("Task update error:", updateError)
      return { success: false, error: "Failed to update task status" }
    }

    // @ts-ignore - We know agent_id exists
    revalidatePath(`/dashboard/agents/${task.agent_id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Task update error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error updating task",
    }
  }
}

const TaskCreationSchema = z.object({
  title: z
    .string()
    .min(5, "Task title must be at least 5 characters.")
    .max(100, "Task title must be 100 characters or less."),
  description: z.string().max(500, "Description must be 500 characters or less.").optional(),
  isDependency: z.boolean(),
  blockedReason: z.string().max(200, "Blocked reason must be 200 characters or less.").optional(),
  // New fields for inter-agent task dependencies
  dependsOnTaskId: z.string().uuid().optional().nullable(),
  dependsOnAgentId: z.string().uuid().optional().nullable(),
})

const TaskEditSchema = z.object({
  title: z
    .string()
    .min(5, "Task title must be at least 5 characters.")
    .max(100, "Task title must be 100 characters or less."),
  description: z.string().max(500, "Description must be 500 characters or less.").optional(),
  status: z.enum(["todo", "in_progress", "blocked", "done"]),
  blockedReason: z.string().max(200, "Blocked reason must be 200 characters or less.").optional(),
  // New fields for inter-agent task dependencies
  dependsOnTaskId: z.string().uuid().optional().nullable(),
  dependsOnAgentId: z.string().uuid().optional().nullable(),
  output_summary: z.string().max(1000, "Output summary must be 1000 characters or less.").optional(),
})

export interface TaskCreationState {
  message?: string
  errors?: {
    title?: string[]
    description?: string[]
    blockedReason?: string[]
    dependsOnTaskId?: string[]
    dependsOnAgentId?: string[]
    _form?: string[]
  }
  success?: boolean
  taskId?: string
}

export interface TaskEditState {
  message?: string
  errors?: {
    title?: string[]
    description?: string[]
    status?: string[]
    blockedReason?: string[]
    dependsOnTaskId?: string[]
    dependsOnAgentId?: string[]
    _form?: string[]
  }
  success?: boolean
}

export interface BulkTaskActionResult {
  success?: boolean
  error?: string
  message?: string
  affectedCount?: number
}

export interface TaskActionResult {
  success: boolean
  error?: string
  message?: string
}

export async function createTaskLegacy(
  agentId: string,
  prevState: TaskCreationState | undefined,
  formData: FormData,
): Promise<TaskCreationState> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { errors: { _form: ["Authentication required."] } }
  }

  // Verify agent ownership
  const { data: agentData, error: agentFetchError } = await supabaseServer
    .from("agents")
    .select("id, owner_id, name")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { errors: { _form: ["Agent not found."] } }
  }

  if (agentData.owner_id !== userId) {
    return { errors: { _form: ["You do not have permission to create tasks for this agent."] } }
  }

  const validatedFields = TaskCreationSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isDependency: formData.get("isDependency") === "on",
    blockedReason: formData.get("blockedReason"),
    dependsOnTaskId: formData.get("dependsOnTaskId") || null, // New field
    dependsOnAgentId: formData.get("dependsOnAgentId") || null, // New field
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields.",
    }
  }

  const { title, description, isDependency, blockedReason, dependsOnTaskId, dependsOnAgentId } = validatedFields.data

  // If dependsOnTaskId is set, force isDependency to true and status to blocked
  const finalIsDependency = isDependency || dependsOnTaskId !== null
  const taskStatus = finalIsDependency ? "blocked" : "todo"
  const finalBlockedReason =
    finalIsDependency && !blockedReason && dependsOnTaskId
      ? "Awaiting completion of a dependent task"
      : blockedReason?.trim() || null

  try {
    const { data: newTask, error: insertError } = await supabaseAdmin
      .from("tasks")
      .insert({
        agent_id: agentId,
        title: title.trim(),
        description: description?.trim() || null,
        is_dependency: finalIsDependency,
        status: taskStatus,
        blocked_reason: finalBlockedReason,
        depends_on_task_id: dependsOnTaskId, // Store new dependency
        depends_on_agent_id: dependsOnAgentId, // Store new dependency
      })
      .select("id")
      .single()

    if (insertError || !newTask) {
      console.error("Error creating task:", insertError)
      return { errors: { _form: [`Failed to create task: ${insertError?.message || "Unknown error"}`] } }
    }

    // Log the task creation
    await addAgentLog(
      agentId,
      "milestone",
      `New task created: "${title}"${finalIsDependency ? " (requires human approval or dependent task completion)" : ""}`,
      newTask.id,
      {
        taskTitle: title,
        isDependency: finalIsDependency,
        createdBy: userId,
        status: taskStatus,
        dependsOnTaskId,
        dependsOnAgentId,
      },
      userId,
    )

    // Send Slack notification if it's a dependency task (either human or inter-task)
    if (finalIsDependency) {
      let notificationMessage = `🔔 New dependency task created for agent "${agentData.name}": "${title}".`
      if (dependsOnTaskId) {
        notificationMessage += ` It is blocked by another task.`
      } else {
        notificationMessage += ` Check your Dependency Basket to review.`
      }
      await sendSlackNotification(notificationMessage)
    }

    revalidatePath(`/dashboard/agents/${agentId}`)
    revalidatePath("/dashboard/dependencies")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Task "${title}" created successfully!${finalIsDependency ? " It will appear in your Dependency Basket or remain blocked until its dependency is met." : ""}`,
      taskId: newTask.id,
    }
  } catch (error) {
    console.error("Unexpected error creating task:", error)
    return { errors: { _form: ["An unexpected error occurred. Please try again."] } }
  }
}

export async function updateTaskLegacy(
  taskId: string,
  prevState: TaskEditState | undefined,
  formData: FormData,
): Promise<TaskEditState> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { errors: { _form: ["Authentication required."] } }
  }

  // Verify task exists and user owns the agent
  const { data: taskData, error: taskFetchError } = await supabaseServer
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      status,
      blocked_reason,
      is_dependency,
      agent_id,
      depends_on_task_id, // Fetch existing dependency
      depends_on_agent_id, // Fetch existing dependency
      agents (owner_id, name),
      output_summary
    `,
    )
    .eq("id", taskId)
    .single()

  if (taskFetchError || !taskData) {
    return { errors: { _form: ["Task not found."] } }
  }

  // @ts-ignore - Supabase JS SDK typing for related tables
  if (taskData.agents?.owner_id !== userId) {
    return { errors: { _form: ["You do not have permission to edit this task."] } }
  }

  const validatedFields = TaskEditSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    blockedReason: formData.get("blockedReason"),
    dependsOnTaskId: formData.get("dependsOnTaskId") || null, // New field
    dependsOnAgentId: formData.get("dependsOnAgentId") || null, // New field
    output_summary: formData.get("output_summary"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields.",
    }
  }

  const { title, description, status, blockedReason, dependsOnTaskId, dependsOnAgentId, output_summary } =
    validatedFields.data

  // Determine if the task is a dependency (either human or inter-task)
  const newIsDependency = (status === "blocked" && !dependsOnTaskId) || dependsOnTaskId !== null

  // If status is changing to blocked and it's due to a dependency, set a default reason
  const finalBlockedReason =
    status === "blocked" && !blockedReason && dependsOnTaskId
      ? "Awaiting completion of a dependent task"
      : blockedReason?.trim() || null

  try {
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        status,
        blocked_reason: finalBlockedReason,
        is_dependency: newIsDependency, // Update is_dependency based on new logic
        depends_on_task_id: dependsOnTaskId, // Store new dependency
        depends_on_agent_id: dependsOnAgentId, // Store new dependency
        updated_at: new Date().toISOString(),
        output_summary: status === "done" ? output_summary?.trim() || null : null, // Only allow setting if status is 'done', otherwise clear
      })
      .eq("id", taskId)

    if (updateError) {
      console.error("Error updating task:", updateError)
      return { errors: { _form: [`Failed to update task: ${updateError.message}`] } }
    }

    // Log the task update
    await addAgentLog(
      taskData.agent_id,
      "task_update",
      `Task updated: "${title}" status changed to ${status}`,
      taskId,
      {
        previousTitle: taskData.title,
        newTitle: title,
        previousStatus: taskData.status,
        newStatus: status,
        previousDependsOnTaskId: taskData.depends_on_task_id,
        newDependsOnTaskId: dependsOnTaskId,
        previousDependsOnAgentId: taskData.depends_on_agent_id,
        newDependsOnAgentId: dependsOnAgentId,
        previousOutputSummary: taskData.output_summary,
        newOutputSummary: status === "done" ? output_summary?.trim() || null : null,
        updatedBy: userId,
      },
      userId,
    )

    revalidatePath(`/dashboard/agents/${taskData.agent_id}`)
    revalidatePath("/dashboard/dependencies")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Task "${title}" updated successfully!`,
    }
  } catch (error) {
    console.error("Unexpected error updating task:", error)
    return { errors: { _form: ["An unexpected error occurred. Please try again."] } }
  }
}

export async function deleteTask(taskId: string): Promise<{ success?: boolean; error?: string }> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required." }
  }

  // Verify task exists and user owns the agent
  const { data: taskData, error: taskFetchError } = await supabaseServer
    .from("tasks")
    .select(
      `
      id,
      title,
      agent_id,
      agents (owner_id, name)
    `,
    )
    .eq("id", taskId)
    .single()

  if (taskFetchError || !taskData) {
    return { error: "Task not found." }
  }

  // @ts-ignore - Supabase JS SDK typing for related tables
  if (taskData.agents?.owner_id !== userId) {
    return { error: "You do not have permission to delete this task." }
  }

  try {
    // Check if any other tasks depend on this task
    const { data: dependentTasks, error: dependentTasksError } = await supabaseServer
      .from("tasks")
      .select("id, title, agent_id")
      .eq("depends_on_task_id", taskId)

    if (dependentTasksError) {
      console.error("Error checking for dependent tasks:", dependentTasksError)
      return { error: `Failed to check for dependent tasks: ${dependentTasksError.message}` }
    }

    if (dependentTasks && dependentTasks.length > 0) {
      const dependentTaskTitles = dependentTasks.map((t) => `"${t.title}"`).join(", ")
      return {
        error: `Cannot delete task "${taskData.title}" because it is a dependency for other tasks: ${dependentTaskTitles}. Please remove these dependencies first.`,
      }
    }

    const { error: deleteError } = await supabaseAdmin.from("tasks").delete().eq("id", taskId)

    if (deleteError) {
      console.error("Error deleting task:", deleteError)
      return { error: `Failed to delete task: ${deleteError.message}` }
    }

    // Log the task deletion
    await addAgentLog(
      taskData.agent_id,
      "info",
      `Task deleted: "${taskData.title}"`,
      undefined,
      {
        deletedTaskId: taskId,
        deletedTaskTitle: taskData.title,
        deletedBy: userId,
      },
      userId,
    )

    revalidatePath(`/dashboard/agents/${taskData.agent_id}`)
    revalidatePath("/dashboard/dependencies")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting task:", error)
    return { error: "An unexpected error occurred while deleting the task." }
  }
}

export async function bulkUpdateTaskStatus(
  agentId: string,
  taskIds: string[],
  newStatus: "todo" | "in_progress" | "blocked" | "done",
): Promise<BulkTaskActionResult> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required." }
  }

  // Verify agent ownership
  const { data: agentData, error: agentFetchError } = await supabaseServer
    .from("agents")
    .select("id, owner_id, name")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { error: "Agent not found." }
  }

  if (agentData.owner_id !== userId) {
    return { error: "You do not have permission to modify tasks for this agent." }
  }

  if (taskIds.length === 0) {
    return { error: "No tasks selected." }
  }

  try {
    const { error: updateError, count } = await supabaseAdmin
      .from("tasks")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        // If status is changed to anything other than blocked, clear blocked_reason
        blocked_reason: newStatus !== "blocked" ? null : undefined,
        // If status is changed to anything other than blocked, clear inter-task dependencies
        depends_on_task_id: newStatus !== "blocked" ? null : undefined,
        depends_on_agent_id: newStatus !== "blocked" ? null : undefined,
      })
      .eq("agent_id", agentId)
      .in("id", taskIds)

    if (updateError) {
      console.error("Error bulk updating tasks:", updateError)
      return { error: `Failed to update tasks: ${updateError.message}` }
    }

    // Log the bulk update
    await addAgentLog(
      agentId,
      "milestone",
      `Bulk update: ${count || 0} tasks changed to ${newStatus}`,
      undefined,
      {
        bulkUpdate: true,
        taskIds,
        newStatus,
        affectedCount: count || 0,
        updatedBy: userId,
      },
      userId,
    )

    revalidatePath(`/dashboard/agents/${agentId}`)
    revalidatePath("/dashboard/dependencies")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Successfully updated ${count || 0} tasks to ${newStatus}`,
      affectedCount: count || 0,
    }
  } catch (error) {
    console.error("Unexpected error in bulk update:", error)
    return { error: "An unexpected error occurred during bulk update." }
  }
}

export async function bulkDeleteTasks(agentId: string, taskIds: string[]): Promise<BulkTaskActionResult> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required." }
  }

  // Verify agent ownership
  const { data: agentData, error: agentFetchError } = await supabaseServer
    .from("agents")
    .select("id, owner_id, name")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { error: "Agent not found." }
  }

  if (agentData.owner_id !== userId) {
    return { error: "You do not have permission to delete tasks for this agent." }
  }

  if (taskIds.length === 0) {
    return { error: "No tasks selected." }
  }

  try {
    // Check if any other tasks depend on any of the tasks being deleted
    const { data: dependentTasks, error: dependentTasksError } = await supabaseServer
      .from("tasks")
      .select("id, title, agent_id")
      .in("depends_on_task_id", taskIds)

    if (dependentTasksError) {
      console.error("Error checking for dependent tasks during bulk delete:", dependentTasksError)
      return { error: `Failed to check for dependent tasks: ${dependentTasksError.message}` }
    }

    if (dependentTasks && dependentTasks.length > 0) {
      const dependentTaskTitles = dependentTasks.map((t) => `"${t.title}"`).join(", ")
      return {
        error: `Cannot delete selected tasks because some are dependencies for other tasks: ${dependentTaskTitles}. Please remove these dependencies first.`,
      }
    }

    const { error: deleteError, count } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("agent_id", agentId)
      .in("id", taskIds)

    if (deleteError) {
      console.error("Error bulk deleting tasks:", deleteError)
      return { error: `Failed to delete tasks: ${deleteError.message}` }
    }

    // Log the bulk deletion
    await addAgentLog(
      agentId,
      "info",
      `Bulk deletion: ${count || 0} tasks removed`,
      undefined,
      {
        bulkDelete: true,
        taskIds,
        affectedCount: count || 0,
        deletedBy: userId,
      },
      userId,
    )

    revalidatePath(`/dashboard/agents/${agentId}`)
    revalidatePath("/dashboard/dependencies")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Successfully deleted ${count || 0} tasks`,
      affectedCount: count || 0,
    }
  } catch (error) {
    console.error("Unexpected error in bulk deletion:", error)
    return { error: "An unexpected error occurred during bulk deletion." }
  }
}

export async function markTaskComplete(
  taskId: string,
  agentId: string,
  completionNotes?: string,
): Promise<TaskActionResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Update the task status to "done"
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: "done",
        updated_at: new Date().toISOString(),
        metadata: {
          completion_notes: completionNotes || "Task completed",
          completed_at: new Date().toISOString(),
        },
      })
      .eq("id", taskId)

    if (updateError) {
      console.error("Error marking task as complete:", updateError)
      return { success: false, error: "Failed to update task status" }
    }

    // Check if this was a dependency task
    const { data: task } = await supabase.from("tasks").select("is_dependency").eq("id", taskId).single()

    // If this was a dependency task, restart the agent
    if (task?.is_dependency) {
      try {
        // Log that dependency is resolved
        await supabase.from("agent_logs").insert({
          agent_id: agentId,
          log_type: "milestone",
          message: "Dependency resolved. Agent can continue working.",
          task_id: taskId,
          created_at: new Date().toISOString(),
        })

        // Restart agent execution
        await triggerAgentExecution(agentId)
      } catch (execError) {
        console.error("Error restarting agent after dependency resolved:", execError)
        // We don't return an error here as the task was successfully marked complete
      }
    }

    // Revalidate the agent page
    revalidatePath(`/dashboard/agents/${agentId}`)

    return {
      success: true,
      message: task?.is_dependency ? "Dependency resolved. Agent has resumed working." : "Task marked as complete.",
    }
  } catch (error) {
    console.error("Error in markTaskComplete:", error)
    return {
      success: false,
      error: "An unexpected error occurred while completing the task.",
    }
  }
}
