"use server"

import { revalidatePath } from "next/cache"
import { dbOps } from "@/lib/database-operations"
import { taskGenerator } from "@/lib/task-generator"
import { dependencyManager } from "@/lib/dependency-manager"
import { validateInput, TaskSchema } from "@/lib/validation"
import { errorHandler } from "@/lib/error-handler"
import { getDefaultUserId } from "@/lib/default-user"

export interface TaskCreationState {
  success?: boolean
  error?: string
  taskId?: string
  message?: string
  validationErrors?: string[]
  generatedTasks?: any[]
}

export async function createTask(
  prevState: TaskCreationState | undefined,
  formData: FormData,
): Promise<TaskCreationState> {
  try {
    // Get user ID
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return {
        success: false,
        error: "Authentication required to create task",
      }
    }

    // Extract form data
    const rawData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as string,
      dueDate: formData.get("dueDate") as string,
      estimatedHours: formData.get("estimatedHours") as string,
      assignedTo: formData.get("assignedTo") as string,
      tags: formData.getAll("tags") as string[],
      workspaceId: formData.get("workspaceId") as string,
      dependencies: formData.getAll("dependencies") as string[],
    }

    // Validate and clean data
    const taskData = {
      title: rawData.title?.trim(),
      description: rawData.description?.trim(),
      priority: rawData.priority || "medium",
      dueDate: rawData.dueDate ? new Date(rawData.dueDate) : undefined,
      estimatedHours: rawData.estimatedHours ? Number.parseFloat(rawData.estimatedHours) : undefined,
      assignedTo: rawData.assignedTo || undefined,
      tags: rawData.tags.filter((tag) => tag.trim().length > 0),
      workspaceId: rawData.workspaceId || userId,
    }

    // Validate using schema
    const validation = validateInput(TaskSchema, taskData)
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid task data",
        validationErrors: validation.errors,
      }
    }

    // Create task in database
    const taskResult = await dbOps.createTask(validation.data, userId)
    if (!taskResult.success) {
      return {
        success: false,
        error: taskResult.error,
      }
    }

    const taskId = taskResult.task.id

    // Create dependencies if specified
    if (rawData.dependencies && rawData.dependencies.length > 0) {
      for (const dependencyId of rawData.dependencies) {
        if (dependencyId.trim()) {
          const depResult = await dependencyManager.addDependency(
            dependencyId.trim(),
            taskId,
            "finish_to_start",
            userId,
          )

          if (!depResult.success) {
            // Log warning but don't fail task creation
            await dbOps.logAgentEvent(taskId, `Failed to create dependency: ${depResult.error}`, "warning", userId)
          }
        }
      }
    }

    // Revalidate paths
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/tasks")
    revalidatePath("/dashboard/dependencies")

    return {
      success: true,
      taskId,
      message: `Task "${validation.data.title}" created successfully`,
    }
  } catch (error) {
    const errorId = errorHandler.captureError(error as Error, {
      action: "create_task",
      component: "task_creation",
      severity: "medium",
    })

    return {
      success: false,
      error: `Failed to create task. Error ID: ${errorId}`,
    }
  }
}

export async function generateTasksFromDescription(
  prevState: TaskCreationState | undefined,
  formData: FormData,
): Promise<TaskCreationState> {
  try {
    // Get user ID
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return {
        success: false,
        error: "Authentication required to generate tasks",
      }
    }

    // Extract form data
    const description = formData.get("description") as string
    const industry = formData.get("industry") as string
    const teamSize = Number.parseInt(formData.get("teamSize") as string) || undefined
    const timeline = formData.get("timeline") as string
    const workspaceId = (formData.get("workspaceId") as string) || userId

    if (!description || description.length < 10) {
      return {
        success: false,
        error: "Description must be at least 10 characters long",
      }
    }

    // Generate tasks using AI
    const result = await taskGenerator.generateTasks({
      description,
      context: {
        industry,
        teamSize,
        timeline,
        workspaceId,
      },
      userId,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to generate tasks",
      }
    }

    return {
      success: true,
      generatedTasks: result.tasks,
      message: `Generated ${result.tasks?.length || 0} tasks${result.usedFallback ? " (using fallback method)" : ""}`,
    }
  } catch (error) {
    const errorId = errorHandler.captureError(error as Error, {
      action: "generate_tasks_from_description",
      component: "task_creation",
      severity: "medium",
    })

    return {
      success: false,
      error: `Failed to generate tasks. Error ID: ${errorId}`,
    }
  }
}

export async function createMultipleTasks(tasks: any[], workspaceId: string): Promise<TaskCreationState> {
  try {
    // Get user ID
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return {
        success: false,
        error: "Authentication required to create tasks",
      }
    }

    if (!tasks || tasks.length === 0) {
      return {
        success: false,
        error: "No tasks provided",
      }
    }

    const createdTasks: string[] = []
    const errors: string[] = []

    // Create tasks one by one
    for (const task of tasks) {
      try {
        const taskData = {
          ...task,
          workspaceId: workspaceId || userId,
        }

        const validation = validateInput(TaskSchema, taskData)
        if (!validation.success) {
          errors.push(`Task "${task.title}": ${validation.errors.join(", ")}`)
          continue
        }

        const result = await dbOps.createTask(validation.data, userId)
        if (result.success) {
          createdTasks.push(result.task.id)
        } else {
          errors.push(`Task "${task.title}": ${result.error}`)
        }
      } catch (error) {
        errors.push(`Task "${task.title}": ${(error as Error).message}`)
      }
    }

    // Create dependencies between tasks
    const taskMap = new Map<string, string>()
    tasks.forEach((task, index) => {
      if (createdTasks[index]) {
        taskMap.set(task.title, createdTasks[index])
      }
    })

    // Process dependencies
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const taskId = createdTasks[i]

      if (taskId && task.dependencies) {
        for (const depTitle of task.dependencies) {
          const depId = taskMap.get(depTitle)
          if (depId) {
            const depResult = await dependencyManager.addDependency(depId, taskId, "finish_to_start", userId)

            if (!depResult.success) {
              errors.push(`Dependency "${depTitle}" -> "${task.title}": ${depResult.error}`)
            }
          }
        }
      }
    }

    // Revalidate paths
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/tasks")
    revalidatePath("/dashboard/dependencies")

    if (createdTasks.length === 0) {
      return {
        success: false,
        error: "No tasks were created successfully",
        validationErrors: errors,
      }
    }

    const message = `Created ${createdTasks.length} out of ${tasks.length} tasks${errors.length > 0 ? ` (${errors.length} errors)` : ""}`

    return {
      success: true,
      message,
      validationErrors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    const errorId = errorHandler.captureError(error as Error, {
      action: "create_multiple_tasks",
      component: "task_creation",
      severity: "medium",
    })

    return {
      success: false,
      error: `Failed to create tasks. Error ID: ${errorId}`,
    }
  }
}
