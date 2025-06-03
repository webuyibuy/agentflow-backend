import { LLMService } from "@/lib/llm-service"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"

export interface AgentExecutionContext {
  agentId: string
  agentName: string
  agentGoal: string
  agentType: string
  currentTasks: Array<{
    id: string
    title: string
    description: string
    status: string
    priority: string
  }>
  completedTasks: Array<{
    id: string
    title: string
    result?: string
  }>
  userId: string
}

export interface ExecutionResult {
  success: boolean
  result?: string
  nextAction?: "continue" | "pause" | "wait_for_dependency" | "complete"
  newTasks?: Array<{
    title: string
    description: string
    priority: "low" | "medium" | "high" | "urgent"
    isDependency: boolean
    blockedReason?: string
  }>
  dependencies?: Array<{
    title: string
    reason: string
    priority: "low" | "medium" | "high" | "urgent"
  }>
  error?: string
  tokensUsed?: number
  executionTime?: number
}

export class AgentExecutionEngine {
  private static instance: AgentExecutionEngine

  static getInstance(): AgentExecutionEngine {
    if (!AgentExecutionEngine.instance) {
      AgentExecutionEngine.instance = new AgentExecutionEngine()
    }
    return AgentExecutionEngine.instance
  }

  /**
   * Execute agent's current task using user's LLM providers
   */
  async executeAgentTask(context: AgentExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      console.log(`🚀 Starting execution for agent: ${context.agentName}`)

      // Log execution start
      await this.logAgentActivity(
        context.agentId,
        "action",
        `🧠 Starting intelligent task execution using your LLM providers`,
        {
          execution_started: true,
          context_summary: this.summarizeContext(context),
          user_id: context.userId,
        },
      )

      // Get next task to work on
      const currentTask = this.getNextTask(context)
      if (!currentTask) {
        return {
          success: true,
          nextAction: "complete",
          result: "All tasks completed successfully",
        }
      }

      // Execute task with user's LLM
      const executionResult = await this.executeTaskWithUserLLM(context, currentTask)

      // Process results and update database
      await this.processExecutionResults(context, currentTask, executionResult)

      const executionTime = Date.now() - startTime

      console.log(`✅ Execution completed in ${executionTime}ms`)

      return {
        ...executionResult,
        executionTime,
      }
    } catch (error) {
      console.error("❌ Agent execution failed:", error)

      await this.logAgentActivity(
        context.agentId,
        "error",
        `❌ Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error: error instanceof Error ? error.message : String(error) },
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown execution error",
        nextAction: "pause",
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Execute a specific task using user's configured LLM
   */
  private async executeTaskWithUserLLM(context: AgentExecutionContext, task: any): Promise<ExecutionResult> {
    const prompt = this.buildExecutionPrompt(context, task)

    try {
      // Log task start
      await this.logAgentActivity(context.agentId, "progress", `📋 Working on: ${task.title}`, {
        task_id: task.id,
        task_title: task.title,
        using_user_llm: true,
      })

      // Check if user has any LLM providers configured
      const availableProviders = await LLMService.getAvailableProviders(context.userId)

      if (availableProviders.length === 0) {
        await this.logAgentActivity(
          context.agentId,
          "warning",
          "⚠️ No LLM providers configured. Please add API keys in Settings.",
          { available_providers: 0 },
        )

        return {
          success: true,
          nextAction: "wait_for_dependency",
          dependencies: [
            {
              title: "Configure LLM Provider",
              reason:
                "No API keys found. Please add OpenAI, Anthropic, Groq, or xAI API keys in Settings to enable AI execution.",
              priority: "high" as const,
            },
          ],
        }
      }

      console.log(`🔑 Using user's LLM providers: ${availableProviders.join(", ")}`)

      // Generate response using user's LLM
      const response = await LLMService.generateJSON({
        prompt,
        systemPrompt: `You are an intelligent AI agent working on behalf of the user. Be helpful, thorough, and create actionable next steps.`,
        userId: context.userId,
      })

      if (!response.success) {
        throw new Error(`LLM execution failed: ${response.error}`)
      }

      // Parse and validate response
      const result = this.parseExecutionResponse(response.data)

      // Log successful execution
      await this.logAgentActivity(context.agentId, "success", `✅ Completed: ${task.title}`, {
        task_id: task.id,
        result_summary: result.result?.substring(0, 100),
        tokens_used: response.tokensUsed,
        providers_available: availableProviders.length,
      })

      return {
        success: true,
        ...result,
        tokensUsed: response.tokensUsed,
      }
    } catch (error) {
      console.error("LLM execution error:", error)

      // Create dependency if LLM execution fails
      return {
        success: true,
        nextAction: "wait_for_dependency",
        dependencies: [
          {
            title: `Review and resolve: ${task.title}`,
            reason: `AI execution encountered an issue: ${error instanceof Error ? error.message : "Unknown error"}. Please check your API keys in Settings or review this task manually.`,
            priority: "high" as const,
          },
        ],
      }
    }
  }

  /**
   * Build execution prompt for LLM
   */
  private buildExecutionPrompt(context: AgentExecutionContext, task: any): string {
    return `You are an AI agent named "${context.agentName}" with the goal: "${context.agentGoal}"

Current Task: ${task.title}
Task Description: ${task.description || "No description provided"}
Task Priority: ${task.priority || "medium"}

Context:
- Agent Type: ${context.agentType}
- Completed Tasks: ${context.completedTasks.map((t) => `• ${t.title}`).join("\n") || "None"}
- Remaining Tasks: ${
      context.currentTasks
        .filter((t) => t.id !== task.id)
        .map((t) => `• ${t.title} (${t.status})`)
        .join("\n") || "None"
    }

Your job is to work on the current task and provide a structured response. You can either:
1. Complete the task with results
2. Create new subtasks if the task is complex
3. Create dependencies if you need human input/approval
4. Request additional information

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "result": "Detailed description of what you accomplished or found",
  "nextAction": "continue|pause|wait_for_dependency|complete",
  "newTasks": [
    {
      "title": "New task title",
      "description": "Detailed task description",
      "priority": "low|medium|high|urgent",
      "isDependency": false
    }
  ],
  "dependencies": [
    {
      "title": "Dependency title",
      "reason": "Why human input is needed",
      "priority": "low|medium|high|urgent"
    }
  ]
}

Focus on being helpful, thorough, and creating clear next steps. If you need human input for decisions, approvals, or access to external resources, create dependencies.`
  }

  /**
   * Parse LLM execution response
   */
  private parseExecutionResponse(response: any): Partial<ExecutionResult> {
    try {
      // Handle both string and object responses
      const parsed = typeof response === "string" ? JSON.parse(response) : response

      return {
        result: parsed.result || "Task processing completed",
        nextAction: this.validateNextAction(parsed.nextAction),
        newTasks: Array.isArray(parsed.newTasks) ? parsed.newTasks : [],
        dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
      }
    } catch (error) {
      console.error("Failed to parse LLM response:", error)

      // Fallback response
      return {
        result: "Task processed (response parsing failed)",
        nextAction: "continue",
        newTasks: [],
        dependencies: [],
      }
    }
  }

  /**
   * Validate next action value
   */
  private validateNextAction(action: any): ExecutionResult["nextAction"] {
    const validActions = ["continue", "pause", "wait_for_dependency", "complete"]
    return validActions.includes(action) ? action : "continue"
  }

  /**
   * Process execution results and update database
   */
  private async processExecutionResults(
    context: AgentExecutionContext,
    task: any,
    result: ExecutionResult,
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    try {
      // Update current task status
      await supabase
        .from("tasks")
        .update({
          status: "done",
          result: result.result,
          completed_at: new Date().toISOString(),
          metadata: {
            ...task.metadata,
            ai_executed: true,
            tokens_used: result.tokensUsed,
            execution_time: result.executionTime,
            executed_by_user_llm: true,
          },
        })
        .eq("id", task.id)

      // Create new tasks if any
      if (result.newTasks && result.newTasks.length > 0) {
        const newTasksData = result.newTasks.map((newTask) => ({
          agent_id: context.agentId,
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          status: "todo",
          is_dependency: newTask.isDependency || false,
          blocked_reason: newTask.blockedReason || null,
          auto_generated: true,
          metadata: {
            generated_by_task: task.id,
            ai_generated: true,
            parent_execution: true,
            generated_by_user_llm: true,
          },
        }))

        await supabase.from("tasks").insert(newTasksData)

        await this.logAgentActivity(context.agentId, "info", `📝 Generated ${result.newTasks.length} new tasks`, {
          new_tasks_count: result.newTasks.length,
          parent_task: task.id,
        })
      }

      // Create dependencies if any
      if (result.dependencies && result.dependencies.length > 0) {
        const dependencyTasksData = result.dependencies.map((dep) => ({
          agent_id: context.agentId,
          title: dep.title,
          description: dep.reason,
          priority: dep.priority,
          status: "blocked",
          is_dependency: true,
          blocked_reason: dep.reason,
          auto_generated: true,
          metadata: {
            dependency_type: "human_input",
            generated_by_task: task.id,
            ai_generated: true,
            requires_approval: true,
            generated_by_user_llm: true,
          },
        }))

        await supabase.from("tasks").insert(dependencyTasksData)

        await this.logAgentActivity(
          context.agentId,
          "dependency",
          `🚨 Created ${result.dependencies.length} dependencies requiring attention`,
          {
            dependencies_count: result.dependencies.length,
            dependency_titles: result.dependencies.map((d) => d.title),
          },
        )
      }

      // Update agent status based on next action
      const agentStatus = this.getAgentStatusFromAction(result.nextAction)
      if (agentStatus) {
        await supabase
          .from("agents")
          .update({
            status: agentStatus,
            last_execution: new Date().toISOString(),
            metadata: {
              last_task_completed: task.id,
              last_execution_result: result.nextAction,
              tokens_used_total: (context as any).totalTokens + (result.tokensUsed || 0),
              using_user_llm: true,
            },
          })
          .eq("id", context.agentId)
      }
    } catch (error) {
      console.error("Error processing execution results:", error)
      throw error
    }
  }

  /**
   * Get agent status from next action
   */
  private getAgentStatusFromAction(nextAction?: string): string | null {
    switch (nextAction) {
      case "complete":
        return "completed"
      case "pause":
        return "paused"
      case "wait_for_dependency":
        return "blocked"
      case "continue":
        return "active"
      default:
        return null
    }
  }

  /**
   * Get next task to execute
   */
  private getNextTask(context: AgentExecutionContext): any {
    // Find highest priority todo task
    const todoTasks = context.currentTasks.filter((t) => t.status === "todo")
    if (todoTasks.length === 0) return null

    // Sort by priority (urgent > high > medium > low)
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    return todoTasks.sort(
      (a, b) =>
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 0),
    )[0]
  }

  /**
   * Summarize context for logging
   */
  private summarizeContext(context: AgentExecutionContext): any {
    return {
      agent_name: context.agentName,
      agent_goal: context.agentGoal.substring(0, 100),
      total_tasks: context.currentTasks.length,
      completed_tasks: context.completedTasks.length,
      todo_tasks: context.currentTasks.filter((t) => t.status === "todo").length,
    }
  }

  /**
   * Log agent activity
   */
  private async logAgentActivity(agentId: string, logType: string, message: string, metadata?: any): Promise<void> {
    try {
      const supabase = getSupabaseAdmin()
      const userId = await getDefaultUserId()

      await supabase.from("agent_logs").insert({
        agent_id: agentId,
        user_id: userId,
        log_type: logType,
        message,
        metadata,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to log agent activity:", error)
      // Don't throw - logging failures shouldn't break execution
    }
  }

  /**
   * Start continuous agent execution using user's LLM providers
   */
  async startAgentExecution(agentId: string): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      const context = await this.buildExecutionContext(agentId)
      if (!context) {
        return { success: false, error: "Failed to build execution context" }
      }

      // Check if user has LLM providers configured
      const availableProviders = await LLMService.getAvailableProviders(context.userId)

      if (availableProviders.length === 0) {
        await this.logAgentActivity(
          context.agentId,
          "warning",
          "⚠️ No LLM providers configured. Please add API keys in Settings to enable AI execution.",
          { available_providers: 0 },
        )

        return {
          success: false,
          error: "No LLM providers configured. Please add API keys in Settings.",
        }
      }

      console.log(`🔑 User has ${availableProviders.length} LLM providers configured: ${availableProviders.join(", ")}`)

      // Start execution in background
      this.executeAgentContinuously(context)

      return {
        success: true,
        message: `Agent ${context.agentName} execution started using your ${availableProviders.join(", ")} provider(s)`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Execute agent continuously until completion or blocking
   */
  private async executeAgentContinuously(context: AgentExecutionContext): Promise<void> {
    let iterations = 0
    const maxIterations = 10 // Prevent infinite loops

    while (iterations < maxIterations) {
      iterations++

      // Refresh context
      const refreshedContext = await this.buildExecutionContext(context.agentId)
      if (!refreshedContext) break

      // Execute next task
      const result = await this.executeAgentTask(refreshedContext)

      // Handle result
      if (!result.success || result.nextAction === "pause" || result.nextAction === "complete") {
        break
      }

      if (result.nextAction === "wait_for_dependency") {
        await this.logAgentActivity(context.agentId, "info", "⏳ Agent paused - waiting for dependency resolution", {
          iteration: iterations,
          reason: "dependencies_created",
        })
        break
      }

      // Small delay between iterations
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    if (iterations >= maxIterations) {
      await this.logAgentActivity(
        context.agentId,
        "warning",
        "⚠️ Agent execution stopped - maximum iterations reached",
        { max_iterations: maxIterations },
      )
    }
  }

  /**
   * Build execution context from database
   */
  private async buildExecutionContext(agentId: string): Promise<AgentExecutionContext | null> {
    try {
      const supabase = getSupabaseAdmin()
      const userId = await getDefaultUserId()

      // Get agent details
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .eq("owner_id", userId)
        .single()

      if (agentError || !agent) {
        console.error("Agent not found:", agentError)
        return null
      }

      // Get current tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("agent_id", agentId)
        .in("status", ["todo", "in_progress"])
        .order("priority", { ascending: false })

      if (tasksError) {
        console.error("Failed to fetch tasks:", tasksError)
        return null
      }

      // Get completed tasks
      const { data: completedTasks, error: completedError } = await supabase
        .from("tasks")
        .select("id, title, result")
        .eq("agent_id", agentId)
        .eq("status", "done")
        .order("completed_at", { ascending: false })
        .limit(10)

      return {
        agentId: agent.id,
        agentName: agent.name,
        agentGoal: agent.goal,
        agentType: agent.type || "general",
        currentTasks: tasks || [],
        completedTasks: completedTasks || [],
        userId,
      }
    } catch (error) {
      console.error("Failed to build execution context:", error)
      return null
    }
  }
}

export const agentExecutionEngine = AgentExecutionEngine.getInstance()
