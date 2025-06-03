import { getSupabaseAdmin } from "@/lib/supabase/server"
import { errorHandler } from "@/lib/error-handler"
import { validateUUID } from "@/lib/validation"

export class DatabaseOperations {
  private static instance: DatabaseOperations
  private supabase = getSupabaseAdmin()

  static getInstance(): DatabaseOperations {
    if (!DatabaseOperations.instance) {
      DatabaseOperations.instance = new DatabaseOperations()
    }
    return DatabaseOperations.instance
  }

  async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3, context = "database_operation"): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries) {
          errorHandler.captureError(lastError, {
            action: context,
            component: "database",
            severity: "high",
            metadata: { attempt, maxRetries },
          })
          throw lastError
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw lastError!
  }

  async createTask(taskData: any, userId: string): Promise<{ success: boolean; task?: any; error?: string }> {
    try {
      if (!validateUUID(userId)) {
        throw new Error("Invalid user ID format")
      }

      const result = await this.executeWithRetry(
        async () => {
          const { data, error } = await this.supabase
            .from("tasks")
            .insert({
              ...taskData,
              created_by: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (error) throw error
          return data
        },
        3,
        "create_task",
      )

      return { success: true, task: result }
    } catch (error) {
      const errorId = errorHandler.captureError(error as Error, {
        action: "create_task",
        component: "database",
        userId,
        severity: "medium",
      })

      return {
        success: false,
        error: `Failed to create task. Error ID: ${errorId}`,
      }
    }
  }

  async createAgent(agentData: any, userId: string): Promise<{ success: boolean; agent?: any; error?: string }> {
    try {
      if (!validateUUID(userId)) {
        throw new Error("Invalid user ID format")
      }

      // Check for name uniqueness within workspace
      const existingAgent = await this.executeWithRetry(
        async () => {
          const { data } = await this.supabase
            .from("agents")
            .select("id")
            .eq("name", agentData.name)
            .eq("owner_id", userId)
            .single()
          return data
        },
        2,
        "check_agent_uniqueness",
      )

      if (existingAgent) {
        return {
          success: false,
          error: "An agent with this name already exists in your workspace",
        }
      }

      const result = await this.executeWithRetry(
        async () => {
          const { data, error } = await this.supabase
            .from("agents")
            .insert({
              ...agentData,
              owner_id: userId,
              status: "initializing",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (error) throw error
          return data
        },
        3,
        "create_agent",
      )

      // Store metadata in agent_custom_data table
      if (agentData.metadata) {
        const { error: customDataError } = await this.supabase.from("agent_custom_data").insert({
          agent_id: result.id,
          custom_data: agentData.metadata,
          configuration_method: "database_operations",
        })

        if (customDataError) {
          console.error("Error storing agent metadata:", customDataError)
          // Non-critical error, continue
        }
      }

      // Initialize agent asynchronously
      this.initializeAgentAsync(result.id, userId)

      return { success: true, agent: result }
    } catch (error) {
      const errorId = errorHandler.captureError(error as Error, {
        action: "create_agent",
        component: "database",
        userId,
        severity: "medium",
      })

      return {
        success: false,
        error: `Failed to create agent. Error ID: ${errorId}`,
      }
    }
  }

  private async initializeAgentAsync(agentId: string, userId: string): Promise<void> {
    try {
      // Simulate agent initialization process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update agent status to active
      await this.executeWithRetry(
        async () => {
          const { error } = await this.supabase
            .from("agents")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", agentId)

          if (error) throw error
        },
        3,
        "activate_agent",
      )

      // Log successful initialization
      await this.logAgentEvent(agentId, "Agent successfully initialized and activated", "info", userId)
    } catch (error) {
      // Update agent status to error
      await this.supabase
        .from("agents")
        .update({
          status: "error",
          error_details: (error as Error).message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId)

      errorHandler.captureError(error as Error, {
        action: "initialize_agent",
        component: "database",
        userId,
        severity: "high",
        metadata: { agentId },
      })
    }
  }

  async createDependency(
    dependencyData: any,
    userId: string,
  ): Promise<{ success: boolean; dependency?: any; error?: string }> {
    try {
      // Validate that both tasks exist and belong to user
      const [sourceTask, targetTask] = await Promise.all([
        this.getTaskByIdAndUser(dependencyData.sourceTaskId, userId),
        this.getTaskByIdAndUser(dependencyData.targetTaskId, userId),
      ])

      if (!sourceTask || !targetTask) {
        return {
          success: false,
          error: "One or both tasks not found or access denied",
        }
      }

      // Check for circular dependencies
      const wouldCreateCycle = await this.checkForCircularDependency(
        dependencyData.sourceTaskId,
        dependencyData.targetTaskId,
      )

      if (wouldCreateCycle) {
        return {
          success: false,
          error: "Cannot create dependency: would create a circular reference",
        }
      }

      const result = await this.executeWithRetry(
        async () => {
          const { data, error } = await this.supabase
            .from("dependencies")
            .insert({
              ...dependencyData,
              created_by: userId,
              created_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (error) throw error
          return data
        },
        3,
        "create_dependency",
      )

      // Update target task status if needed
      await this.updateTaskAvailability(dependencyData.targetTaskId)

      return { success: true, dependency: result }
    } catch (error) {
      const errorId = errorHandler.captureError(error as Error, {
        action: "create_dependency",
        component: "database",
        userId,
        severity: "medium",
      })

      return {
        success: false,
        error: `Failed to create dependency. Error ID: ${errorId}`,
      }
    }
  }

  private async getTaskByIdAndUser(taskId: string, userId: string): Promise<any> {
    try {
      const { data } = await this.supabase
        .from("tasks")
        .select("*, agents!inner(owner_id)")
        .eq("id", taskId)
        .eq("agents.owner_id", userId)
        .single()

      return data
    } catch {
      return null
    }
  }

  private async checkForCircularDependency(sourceId: string, targetId: string): Promise<boolean> {
    try {
      // Get all dependencies
      const { data: dependencies } = await this.supabase.from("dependencies").select("source_task_id, target_task_id")

      if (!dependencies) return false

      // Build dependency graph
      const graph = new Map<string, string[]>()
      dependencies.forEach((dep) => {
        if (!graph.has(dep.source_task_id)) {
          graph.set(dep.source_task_id, [])
        }
        graph.get(dep.source_task_id)!.push(dep.target_task_id)
      })

      // Check if adding this dependency would create a cycle
      const visited = new Set<string>()
      const checkCycle = (currentId: string): boolean => {
        if (currentId === sourceId) return true
        if (visited.has(currentId)) return false

        visited.add(currentId)
        const dependencies = graph.get(currentId) || []

        for (const depId of dependencies) {
          if (checkCycle(depId)) return true
        }

        return false
      }

      return checkCycle(targetId)
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "check_circular_dependency",
        component: "database",
        severity: "medium",
      })
      return true // Fail safe - assume it would create a cycle
    }
  }

  private async updateTaskAvailability(taskId: string): Promise<void> {
    try {
      // Get all dependencies for this task
      const { data: dependencies } = await this.supabase
        .from("dependencies")
        .select("source_task_id, tasks!dependencies_source_task_id_fkey(status)")
        .eq("target_task_id", taskId)

      if (!dependencies) return

      // Check if all blocking tasks are completed
      const allCompleted = dependencies.every((dep) => dep.tasks && dep.tasks.status === "done")

      if (allCompleted) {
        await this.supabase
          .from("tasks")
          .update({
            status: "ready",
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .eq("status", "blocked")
      } else {
        await this.supabase
          .from("tasks")
          .update({
            status: "blocked",
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)
      }
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "update_task_availability",
        component: "database",
        severity: "low",
        metadata: { taskId },
      })
    }
  }

  async logAgentEvent(
    agentId: string,
    message: string,
    type: "info" | "warning" | "error" | "success" = "info",
    userId?: string,
  ): Promise<void> {
    try {
      await this.executeWithRetry(
        async () => {
          const { error } = await this.supabase.from("agent_logs").insert({
            agent_id: agentId,
            user_id: userId,
            log_type: type,
            message,
            timestamp: new Date().toISOString(),
          })

          if (error) throw error
        },
        2,
        "log_agent_event",
      )
    } catch (error) {
      // Don't throw for logging errors, just capture them
      errorHandler.captureError(error as Error, {
        action: "log_agent_event",
        component: "database",
        severity: "low",
        metadata: { agentId, message, type },
      })
    }
  }

  async getUserMetrics(userId: string): Promise<any> {
    try {
      const [tasksData, agentsData, dependenciesData] = await Promise.all([
        this.supabase.from("tasks").select("status, created_at, agents!inner(owner_id)").eq("agents.owner_id", userId),

        this.supabase.from("agents").select("status, created_at").eq("owner_id", userId),

        this.supabase.from("dependencies").select("status, created_at, risk_level").eq("created_by", userId),
      ])

      return {
        tasks: this.processTaskMetrics(tasksData.data || []),
        agents: this.processAgentMetrics(agentsData.data || []),
        dependencies: this.processDependencyMetrics(dependenciesData.data || []),
      }
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "get_user_metrics",
        component: "database",
        userId,
        severity: "medium",
      })

      return {
        tasks: { total: 0, completed: 0, pending: 0, blocked: 0 },
        agents: { total: 0, active: 0, error: 0 },
        dependencies: { total: 0, completed: 0, at_risk: 0 },
      }
    }
  }

  private processTaskMetrics(tasks: any[]): any {
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "done").length,
      pending: tasks.filter((t) => ["todo", "ready"].includes(t.status)).length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
    }
  }

  private processAgentMetrics(agents: any[]): any {
    return {
      total: agents.length,
      active: agents.filter((a) => a.status === "active").length,
      error: agents.filter((a) => a.status === "error").length,
      initializing: agents.filter((a) => a.status === "initializing").length,
    }
  }

  private processDependencyMetrics(dependencies: any[]): any {
    return {
      total: dependencies.length,
      completed: dependencies.filter((d) => d.status === "completed").length,
      at_risk: dependencies.filter((d) => ["high", "critical"].includes(d.risk_level)).length,
      pending: dependencies.filter((d) => d.status === "pending").length,
    }
  }
}

export const dbOps = DatabaseOperations.getInstance()
