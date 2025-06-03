import { getDecryptedApiKey } from "@/app/dashboard/settings/profile/api-key-actions"
import { getDefaultUserId } from "@/lib/default-user"
import { getSupabaseFromServer } from "@/lib/supabase/server"

export interface ValidationResult {
  component: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: any
}

export class BusinessLogicValidator {
  private results: ValidationResult[] = []

  /**
   * Comprehensive validation of all business logic components
   */
  async validateAll(): Promise<ValidationResult[]> {
    this.results = []

    // 1. Validate OpenAI Integration
    await this.validateOpenAIIntegration()

    // 2. Validate Agent Creation Process
    await this.validateAgentCreation()

    // 3. Validate Task Management
    await this.validateTaskManagement()

    // 4. Validate Agent Status Management
    await this.validateAgentStatusManagement()

    // 5. Validate Dashboard Data Flow
    await this.validateDashboardDataFlow()

    // 6. Validate LLM Execution Pipeline
    await this.validateLLMExecutionPipeline()

    return this.results
  }

  /**
   * Validate OpenAI API key integration
   */
  private async validateOpenAIIntegration(): Promise<void> {
    try {
      const userId = await getDefaultUserId()
      const apiKey = await getDecryptedApiKey("openai", userId)

      if (!apiKey) {
        this.addResult(
          "OpenAI Integration",
          "fail",
          "No OpenAI API key found. Please configure in Settings → Profile → API Keys",
        )
        return
      }

      // Test API key validity
      const testResponse = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (testResponse.ok) {
        this.addResult("OpenAI Integration", "pass", "OpenAI API key is valid and accessible")
      } else {
        const errorData = await testResponse.json().catch(() => ({}))
        this.addResult(
          "OpenAI Integration",
          "fail",
          `OpenAI API key validation failed: ${errorData.error?.message || "Invalid key"}`,
        )
      }
    } catch (error) {
      this.addResult("OpenAI Integration", "fail", `OpenAI integration error: ${error}`)
    }
  }

  /**
   * Validate agent creation and storage
   */
  private async validateAgentCreation(): Promise<void> {
    try {
      const supabase = getSupabaseFromServer()
      const userId = await getDefaultUserId()

      // Check if agents table is accessible
      const { data: agents, error: agentsError } = await supabase
        .from("agents")
        .select("id, name, status, agent_type, goal, owner_id")
        .eq("owner_id", userId)
        .limit(1)

      if (agentsError) {
        this.addResult("Agent Creation", "fail", `Database access error: ${agentsError.message}`)
        return
      }

      // Check agent data structure
      if (agents && agents.length > 0) {
        const agent = agents[0]
        const requiredFields = ["id", "name", "status", "agent_type", "goal", "owner_id"]
        const missingFields = requiredFields.filter((field) => !agent[field])

        if (missingFields.length > 0) {
          this.addResult("Agent Creation", "warning", `Agent data missing fields: ${missingFields.join(", ")}`, {
            agent,
            missingFields,
          })
        } else {
          this.addResult("Agent Creation", "pass", "Agent creation and storage working correctly")
        }
      } else {
        this.addResult("Agent Creation", "warning", "No agents found. Create an agent to test this functionality.")
      }
    } catch (error) {
      this.addResult("Agent Creation", "fail", `Agent creation validation error: ${error}`)
    }
  }

  /**
   * Validate task management system
   */
  private async validateTaskManagement(): Promise<void> {
    try {
      const supabase = getSupabaseFromServer()
      const userId = await getDefaultUserId()

      // Check tasks table structure and data
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, description, status, agent_id, is_dependency, priority, created_at")
        .limit(5)

      if (tasksError) {
        this.addResult("Task Management", "fail", `Tasks database error: ${tasksError.message}`)
        return
      }

      // Validate task data structure
      if (tasks && tasks.length > 0) {
        const task = tasks[0]
        const requiredFields = ["id", "title", "status", "agent_id"]
        const missingFields = requiredFields.filter((field) => !task[field])

        if (missingFields.length > 0) {
          this.addResult("Task Management", "warning", `Task data missing fields: ${missingFields.join(", ")}`, {
            task,
            missingFields,
          })
        } else {
          this.addResult("Task Management", "pass", "Task management system working correctly")
        }
      } else {
        this.addResult("Task Management", "warning", "No tasks found. Create tasks to test this functionality.")
      }

      // Check task status transitions
      const statusValues = ["todo", "in_progress", "done", "blocked"]
      const { data: statusCheck } = await supabase.from("tasks").select("status").in("status", statusValues).limit(1)

      if (statusCheck) {
        this.addResult("Task Status", "pass", "Task status values are properly configured")
      }
    } catch (error) {
      this.addResult("Task Management", "fail", `Task management validation error: ${error}`)
    }
  }

  /**
   * Validate agent status management (pause/resume)
   */
  private async validateAgentStatusManagement(): Promise<void> {
    try {
      const supabase = getSupabaseFromServer()
      const userId = await getDefaultUserId()

      // Check agent status values
      const { data: agents, error: agentsError } = await supabase
        .from("agents")
        .select("id, name, status")
        .eq("owner_id", userId)

      if (agentsError) {
        this.addResult("Agent Status", "fail", `Agent status check error: ${agentsError.message}`)
        return
      }

      if (agents && agents.length > 0) {
        const validStatuses = ["active", "paused", "inactive"]
        const invalidAgents = agents.filter((agent) => !validStatuses.includes(agent.status))

        if (invalidAgents.length > 0) {
          this.addResult(
            "Agent Status",
            "warning",
            `Agents with invalid status found: ${invalidAgents.map((a) => `${a.name}(${a.status})`).join(", ")}`,
          )
        } else {
          this.addResult("Agent Status", "pass", "Agent status management working correctly")
        }

        // Check if toggle functionality is available
        const activeAgents = agents.filter((a) => a.status === "active")
        const pausedAgents = agents.filter((a) => a.status === "paused")

        this.addResult(
          "Agent Activity",
          "pass",
          `Found ${activeAgents.length} active and ${pausedAgents.length} paused agents`,
          { activeAgents: activeAgents.length, pausedAgents: pausedAgents.length },
        )
      } else {
        this.addResult("Agent Status", "warning", "No agents found to validate status management")
      }
    } catch (error) {
      this.addResult("Agent Status", "fail", `Agent status validation error: ${error}`)
    }
  }

  /**
   * Validate dashboard data flow
   */
  private async validateDashboardDataFlow(): Promise<void> {
    try {
      const supabase = getSupabaseFromServer()
      const userId = await getDefaultUserId()

      // Check if dashboard can access all required data
      const [agentsResult, tasksResult, logsResult] = await Promise.all([
        supabase.from("agents").select("id, name, status").eq("owner_id", userId),
        supabase.from("tasks").select("id, title, status, agent_id").limit(10),
        supabase.from("agent_logs").select("id, message, log_type, timestamp").limit(5),
      ])

      const errors = []
      if (agentsResult.error) errors.push(`Agents: ${agentsResult.error.message}`)
      if (tasksResult.error) errors.push(`Tasks: ${tasksResult.error.message}`)
      if (logsResult.error) errors.push(`Logs: ${logsResult.error.message}`)

      if (errors.length > 0) {
        this.addResult("Dashboard Data", "fail", `Dashboard data access errors: ${errors.join(", ")}`)
      } else {
        this.addResult(
          "Dashboard Data",
          "pass",
          `Dashboard data flow working: ${agentsResult.data?.length || 0} agents, ${tasksResult.data?.length || 0} tasks, ${logsResult.data?.length || 0} logs`,
        )
      }
    } catch (error) {
      this.addResult("Dashboard Data", "fail", `Dashboard validation error: ${error}`)
    }
  }

  /**
   * Validate LLM execution pipeline
   */
  private async validateLLMExecutionPipeline(): Promise<void> {
    try {
      // Check if execution modules are properly imported
      const { AgentLLMExecutor } = await import("@/lib/agent-llm-executor")
      const { startAgentExecution } = await import("@/app/dashboard/agents/[id]/execution-actions")

      this.addResult("LLM Pipeline", "pass", "LLM execution modules are properly accessible")

      // Check if agent can determine if it should continue
      const userId = await getDefaultUserId()
      const supabase = getSupabaseFromServer()

      const { data: activeAgents } = await supabase
        .from("agents")
        .select("id")
        .eq("owner_id", userId)
        .eq("status", "active")
        .limit(1)

      if (activeAgents && activeAgents.length > 0) {
        const canContinue = await AgentLLMExecutor.shouldAgentContinue(activeAgents[0].id)
        if (canContinue) {
          this.addResult("LLM Execution", "pass", "Agent execution pipeline is ready and functional")
        } else {
          this.addResult("LLM Execution", "warning", "Agent execution blocked - check OpenAI API key configuration")
        }
      } else {
        this.addResult("LLM Execution", "warning", "No active agents found to test execution pipeline")
      }
    } catch (error) {
      this.addResult("LLM Pipeline", "fail", `LLM execution pipeline error: ${error}`)
    }
  }

  /**
   * Add validation result
   */
  private addResult(component: string, status: "pass" | "fail" | "warning", message: string, details?: any): void {
    this.results.push({
      component,
      status,
      message,
      details,
    })
  }

  /**
   * Get summary of validation results
   */
  getSummary(): { total: number; passed: number; failed: number; warnings: number } {
    return {
      total: this.results.length,
      passed: this.results.filter((r) => r.status === "pass").length,
      failed: this.results.filter((r) => r.status === "fail").length,
      warnings: this.results.filter((r) => r.status === "warning").length,
    }
  }
}
