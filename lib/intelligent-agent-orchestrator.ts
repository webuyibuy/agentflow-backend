import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getUserLLMProvider } from "@/lib/user-llm-provider"

export interface AgentWorkflowContext {
  agentId: string
  agentName: string
  agentGoal: string
  userInputs: {
    goalPrimer?: string
    answers?: any[]
    planData?: any
    consultationHistory?: any[]
  }
  userId: string
}

export interface GeneratedWorkflow {
  immediateTasks: Array<{
    title: string
    priority: "high" | "medium" | "low"
    category: "analysis" | "planning" | "research" | "implementation"
    estimatedHours: number
  }>
  dependencies: Array<{
    title: string
    reason: string
    blockedBy: "user_input" | "approval" | "external_resource" | "prerequisite"
    priority: "urgent" | "high" | "medium"
  }>
  workingStatus: {
    currentFocus: string
    nextMilestone: string
    progressIndicator: string
  }
}

export class IntelligentAgentOrchestrator {
  /**
   * Automatically start agent work after creation
   */
  static async initiateAgentWorkflow(context: AgentWorkflowContext): Promise<{
    success: boolean
    workflow?: GeneratedWorkflow
    error?: string
  }> {
    try {
      console.log(`🚀 Initiating intelligent workflow for agent: ${context.agentName}`)

      // Get LLM provider for intelligent task generation
      const llmProvider = await getUserLLMProvider(context.userId)

      let workflow: GeneratedWorkflow

      if (llmProvider) {
        // Generate intelligent workflow using LLM
        workflow = await this.generateIntelligentWorkflow(context, llmProvider)
      } else {
        // Fallback to rule-based workflow generation
        workflow = await this.generateRuleBasedWorkflow(context)
      }

      // Create tasks and dependencies in database
      await this.createWorkflowInDatabase(context.agentId, workflow, context.userId)

      // Start the agent working immediately
      await this.startAgentExecution(context.agentId, workflow)

      console.log(`✅ Agent workflow initiated successfully`)
      return { success: true, workflow }
    } catch (error) {
      console.error("❌ Error initiating agent workflow:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Generate intelligent workflow using LLM
   */
  private static async generateIntelligentWorkflow(
    context: AgentWorkflowContext,
    llmProvider: any,
  ): Promise<GeneratedWorkflow> {
    const prompt = `You are an intelligent agent orchestrator. Based on the following context, create a comprehensive workflow for an AI agent to start working immediately.

Agent Context:
- Name: ${context.agentName}
- Goal: ${context.agentGoal}
- User Goal Primer: ${context.userInputs.goalPrimer || "Not provided"}
- User Answers: ${JSON.stringify(context.userInputs.answers || [])}
- Plan Data: ${JSON.stringify(context.userInputs.planData || {})}

Create a workflow that:
1. Starts the agent working immediately on valuable tasks
2. Identifies what the agent can do autonomously
3. Creates dependencies for things requiring human input
4. Shows clear progress and next steps

IMPORTANT: Return ONLY valid JSON, no markdown formatting.

Return exactly this structure:
{
  "immediateTasks": [
    {
      "title": "Task the agent can start immediately",
      "priority": "high",
      "category": "analysis",
      "estimatedHours": 2
    }
  ],
  "dependencies": [
    {
      "title": "Task requiring human input",
      "reason": "Why this needs human involvement",
      "blockedBy": "user_input",
      "priority": "high"
    }
  ],
  "workingStatus": {
    "currentFocus": "What the agent is actively working on",
    "nextMilestone": "Next major deliverable",
    "progressIndicator": "Current progress description"
  }
}`

    try {
      const response = await llmProvider.generateText({
        prompt,
        maxTokens: 2000,
        temperature: 0.7,
      })

      const workflow = this.parseJSONFromLLMResponse(response)
      return this.validateWorkflow(workflow)
    } catch (error) {
      console.error("Error generating intelligent workflow:", error)
      return this.generateRuleBasedWorkflow(context)
    }
  }

  /**
   * Generate rule-based workflow as fallback
   */
  private static async generateRuleBasedWorkflow(context: AgentWorkflowContext): Promise<GeneratedWorkflow> {
    const goalKeywords = context.agentGoal.toLowerCase()

    // Analyze goal to determine workflow type
    const isStrategy = goalKeywords.includes("strategy") || goalKeywords.includes("plan")
    const isAnalysis = goalKeywords.includes("analyz") || goalKeywords.includes("research")
    const isImplementation = goalKeywords.includes("implement") || goalKeywords.includes("build")

    const immediateTasks = []
    const dependencies = []

    if (isStrategy) {
      immediateTasks.push({
        title: "Analyze Current Situation",
        priority: "high" as const,
        category: "analysis" as const,
        estimatedHours: 3,
      })
      immediateTasks.push({
        title: "Research Best Practices",
        priority: "medium" as const,
        category: "research" as const,
        estimatedHours: 2,
      })
      dependencies.push({
        title: "Define Success Metrics",
        reason: "Need stakeholder input on what success looks like",
        blockedBy: "user_input" as const,
        priority: "high" as const,
      })
    }

    if (isAnalysis) {
      immediateTasks.push({
        title: "Data Collection and Review",
        priority: "high" as const,
        category: "analysis" as const,
        estimatedHours: 4,
      })
      dependencies.push({
        title: "Access to Data Sources",
        reason: "Need credentials or permissions for data access",
        blockedBy: "external_resource" as const,
        priority: "urgent" as const,
      })
    }

    if (isImplementation) {
      immediateTasks.push({
        title: "Technical Requirements Analysis",
        priority: "high" as const,
        category: "planning" as const,
        estimatedHours: 3,
      })
      dependencies.push({
        title: "Architecture Approval",
        reason: "Technical approach needs stakeholder approval",
        blockedBy: "approval" as const,
        priority: "high" as const,
      })
    }

    // Default tasks if no specific category detected
    if (immediateTasks.length === 0) {
      immediateTasks.push({
        title: "Goal Analysis and Breakdown",
        priority: "high" as const,
        category: "analysis" as const,
        estimatedHours: 2,
      })
      immediateTasks.push({
        title: "Create Action Plan",
        priority: "medium" as const,
        category: "planning" as const,
        estimatedHours: 3,
      })
    }

    // Always add some dependencies to show the system working
    dependencies.push({
      title: "Review and Approve Initial Analysis",
      reason: "Human review needed before proceeding to next phase",
      blockedBy: "approval" as const,
      priority: "high" as const,
    })

    dependencies.push({
      title: "Provide Additional Context",
      reason: "Agent needs more specific information about requirements",
      blockedBy: "user_input" as const,
      priority: "medium" as const,
    })

    return {
      immediateTasks,
      dependencies,
      workingStatus: {
        currentFocus: immediateTasks[0]?.title || "Analyzing requirements",
        nextMilestone: "Complete initial analysis and planning phase",
        progressIndicator: "🔄 Agent is actively working on initial tasks",
      },
    }
  }

  /**
   * Create workflow tasks in database with proper dependency marking
   */
  private static async createWorkflowInDatabase(
    agentId: string,
    workflow: GeneratedWorkflow,
    userId: string,
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    console.log(
      `📝 Creating ${workflow.immediateTasks.length} immediate tasks and ${workflow.dependencies.length} dependencies`,
    )

    // First, ensure the agent exists and is owned by the user
    const { data: agent } = await supabase.from("agents").select("id, owner_id").eq("id", agentId).single()

    if (!agent) {
      console.error(`Agent ${agentId} not found`)
      return
    }

    // If agent doesn't have owner_id, update it
    if (!agent.owner_id) {
      await supabase.from("agents").update({ owner_id: userId }).eq("id", agentId)

      console.log(`Updated agent ${agentId} with owner_id ${userId}`)
    }

    // Create immediate tasks (agent can work on these)
    const immediateTasks = workflow.immediateTasks.map((task) => ({
      agent_id: agentId,
      title: task.title,
      status: "todo",
      priority: task.priority,
      is_dependency: false, // These are NOT dependencies
      auto_generated: true,
      estimated_hours: task.estimatedHours,
      metadata: {
        category: task.category,
        workflow_type: "immediate",
        ai_generated: true,
        can_auto_execute: true,
      },
      created_at: new Date().toISOString(),
    }))

    // Create dependency tasks (need human input) - THESE ARE THE DEPENDENCIES
    const dependencyTasks = workflow.dependencies.map((dep) => ({
      agent_id: agentId,
      title: dep.title,
      status: "blocked", // IMPORTANT: Mark as blocked
      priority: dep.priority,
      is_dependency: true, // MARK AS DEPENDENCY
      blocked_reason: dep.reason, // IMPORTANT: Include blocked reason
      auto_generated: true,
      metadata: {
        blocked_by: dep.blockedBy,
        workflow_type: "dependency",
        ai_generated: true,
        requires_human_input: true,
        dependency_type: dep.blockedBy,
        priority: dep.priority, // Duplicate in metadata for easier querying
      },
      created_at: new Date().toISOString(),
    }))

    // Insert immediate tasks
    if (immediateTasks.length > 0) {
      const { error: immTaskError } = await supabase.from("tasks").insert(immediateTasks)
      if (immTaskError) {
        console.error("Error creating immediate tasks:", immTaskError)
      } else {
        console.log(`✅ Created ${immediateTasks.length} immediate tasks`)
      }
    }

    // Insert dependency tasks SEPARATELY to ensure they're properly created
    if (dependencyTasks.length > 0) {
      const { error: depTaskError } = await supabase.from("tasks").insert(dependencyTasks)
      if (depTaskError) {
        console.error("Error creating dependency tasks:", depTaskError)
      } else {
        console.log(`✅ Created ${dependencyTasks.length} dependency tasks`)
      }
    }

    // Update agent status to show it's working
    await supabase
      .from("agents")
      .update({
        status: "active",
        metadata: {
          workflow_status: workflow.workingStatus,
          last_activity: new Date().toISOString(),
          auto_working: true,
          dependencies_created: dependencyTasks.length,
          immediate_tasks_created: immediateTasks.length,
        },
      })
      .eq("id", agentId)

    // Create a special agent log entry about dependencies
    await supabase.from("agent_logs").insert({
      agent_id: agentId,
      log_type: "dependency",
      message: `🚨 Created ${dependencyTasks.length} dependencies that need your attention`,
      metadata: {
        dependency_count: dependencyTasks.length,
        dependency_titles: dependencyTasks.map((d) => d.title),
        dependency_reasons: dependencyTasks.map((d) => d.blocked_reason),
      },
      created_at: new Date().toISOString(),
    })
  }

  /**
   * Start agent execution on immediate tasks
   */
  private static async startAgentExecution(agentId: string, workflow: GeneratedWorkflow): Promise<void> {
    const supabase = getSupabaseAdmin()

    // Log that agent is starting work
    await supabase.from("agent_logs").insert({
      agent_id: agentId,
      log_type: "info",
      message: `🚀 Agent started working automatically. Current focus: ${workflow.workingStatus.currentFocus}`,
      metadata: {
        workflow_initiated: true,
        immediate_tasks_count: workflow.immediateTasks.length,
        dependencies_count: workflow.dependencies.length,
      },
      created_at: new Date().toISOString(),
    })

    // Start working on the first immediate task
    if (workflow.immediateTasks.length > 0) {
      const firstTask = workflow.immediateTasks[0]

      await supabase.from("agent_logs").insert({
        agent_id: agentId,
        log_type: "action",
        message: `📋 Starting work on: ${firstTask.title}`,
        metadata: {
          task_category: firstTask.category,
          estimated_hours: firstTask.estimatedHours,
          priority: firstTask.priority,
        },
        created_at: new Date().toISOString(),
      })

      // Simulate agent working (in real implementation, this would trigger actual AI execution)
      setTimeout(async () => {
        await this.simulateTaskProgress(agentId, firstTask.title)
      }, 5000) // Start showing progress after 5 seconds
    }
  }

  /**
   * Simulate agent making progress on tasks
   */
  private static async simulateTaskProgress(agentId: string, taskTitle: string): Promise<void> {
    const supabase = getSupabaseAdmin()

    const progressMessages = [
      `🔍 Analyzing requirements for: ${taskTitle}`,
      `📊 Gathering relevant information and data`,
      `🧠 Processing and synthesizing findings`,
      `📝 Preparing preliminary results`,
      `✅ Making significant progress on ${taskTitle}`,
    ]

    for (let i = 0; i < progressMessages.length; i++) {
      setTimeout(
        async () => {
          await supabase.from("agent_logs").insert({
            agent_id: agentId,
            log_type: "progress",
            message: progressMessages[i],
            metadata: {
              progress_step: i + 1,
              total_steps: progressMessages.length,
              task_title: taskTitle,
            },
            created_at: new Date().toISOString(),
          })
        },
        (i + 1) * 10000,
      ) // Every 10 seconds
    }
  }

  /**
   * Parse JSON from LLM response
   */
  private static parseJSONFromLLMResponse(response: string): any {
    try {
      return JSON.parse(response)
    } catch (error) {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error("No valid JSON found in response")
    }
  }

  /**
   * Validate and sanitize workflow
   */
  private static validateWorkflow(workflow: any): GeneratedWorkflow {
    return {
      immediateTasks: Array.isArray(workflow.immediateTasks) ? workflow.immediateTasks : [],
      dependencies: Array.isArray(workflow.dependencies) ? workflow.dependencies : [],
      workingStatus: workflow.workingStatus || {
        currentFocus: "Analyzing requirements",
        nextMilestone: "Complete initial setup",
        progressIndicator: "🔄 Agent is getting started",
      },
    }
  }
}
