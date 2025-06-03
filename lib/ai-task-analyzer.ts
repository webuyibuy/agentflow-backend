import { getSupabaseAdmin } from "@/lib/supabase/server"

export interface TaskAnalysisRequest {
  userInput: string
  agentGoal: string
  agentType: string
  existingTasks?: Task[]
  userId: string
}

export interface Task {
  id?: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "todo" | "in_progress" | "blocked" | "done"
  isDependency: boolean
  blockedReason?: string
  dependsOnTaskId?: string
  dependsOnAgentId?: string
  estimatedHours?: number
  category: "strategy" | "research" | "implementation" | "review" | "communication"
  metadata?: Record<string, any>
}

export interface TaskAnalysisResult {
  success: boolean
  tasks: Task[]
  dependencies: Task[]
  userNeedAnalysis: string
  recommendedFlow: string[]
  error?: string
}

export class AITaskAnalyzer {
  async analyzeUserNeedsAndCreateTasks(request: TaskAnalysisRequest): Promise<TaskAnalysisResult> {
    try {
      const { AIOperations } = await import("@/lib/ai-operations")

      const result = await AIOperations.analyzeAndGenerateTasks(
        request.userInput,
        request.agentGoal,
        request.agentType,
        request.userId,
        request.existingTasks,
      )

      if (!result.success) {
        console.error("AI Task Analysis failed:", result.error)
        return this.fallbackAnalysis(request)
      }

      // Process the AI response
      const processedResult = this.processAIResponse(
        {
          userNeedAnalysis: result.userNeedAnalysis,
          recommendedFlow: result.recommendedFlow,
          tasks: result.tasks,
          dependencies: result.dependencies,
        },
        request,
      )

      // Store the analysis in the database
      await this.storeTaskAnalysis(request.userId, request.userInput, processedResult)

      return processedResult
    } catch (error) {
      console.error("AI Task Analysis Error:", error)
      return this.fallbackAnalysis(request)
    }
  }

  private buildAnalysisPrompt(request: TaskAnalysisRequest): string {
    const existingTasksContext = request.existingTasks?.length
      ? `\nExisting tasks: ${request.existingTasks.map((t) => `- ${t.title} (${t.status})`).join("\n")}`
      : ""

    return `
Analyze the following user input and create a comprehensive task breakdown for their ${request.agentType} agent:

User Input: "${request.userInput}"
Agent Goal: "${request.agentGoal}"
Agent Type: "${request.agentType}"${existingTasksContext}

Please provide a JSON response with this exact structure:
{
  "userNeedAnalysis": "Detailed analysis of what the user is trying to achieve",
  "recommendedFlow": ["Step 1", "Step 2", "Step 3"],
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "priority": "low|medium|high|urgent",
      "status": "todo|blocked",
      "isDependency": true/false,
      "blockedReason": "Why this task is blocked (if applicable)",
      "dependsOnTaskId": "reference to another task (if applicable)",
      "estimatedHours": 2,
      "category": "strategy|research|implementation|review|communication",
      "metadata": {
        "aiGenerated": true,
        "userInput": "original user input",
        "complexity": "low|medium|high"
      }
    }
  ],
  "dependencies": [
    {
      "title": "Dependency task title",
      "description": "What needs human approval or external input",
      "priority": "high|urgent",
      "status": "blocked",
      "isDependency": true,
      "blockedReason": "Requires human approval/input",
      "category": "review|communication",
      "metadata": {
        "requiresHumanApproval": true,
        "dependencyType": "approval|input|decision"
      }
    }
  ]
}

Guidelines:
1. Break down complex requests into manageable tasks
2. Identify tasks that require human approval/input as dependencies
3. Create logical task sequences with proper dependencies
4. Prioritize tasks based on importance and urgency
5. Include estimated time for each task
6. Ensure dependencies are clearly marked and explained
7. Focus on actionable, specific tasks
8. Consider the agent's capabilities and limitations
`
  }

  private processAIResponse(analysis: any, request: TaskAnalysisRequest): TaskAnalysisResult {
    // Validate and sanitize the AI response
    const tasks: Task[] = (analysis.tasks || []).map((task: any, index: number) => ({
      title: task.title || `Task ${index + 1}`,
      description: task.description || "",
      priority: ["low", "medium", "high", "urgent"].includes(task.priority) ? task.priority : "medium",
      status: task.isDependency ? "blocked" : "todo",
      isDependency: Boolean(task.isDependency),
      blockedReason: task.blockedReason || null,
      dependsOnTaskId: task.dependsOnTaskId || null,
      dependsOnAgentId: task.dependsOnAgentId || null,
      estimatedHours: typeof task.estimatedHours === "number" ? task.estimatedHours : 2,
      category: ["strategy", "research", "implementation", "review", "communication"].includes(task.category)
        ? task.category
        : "implementation",
      metadata: {
        ...task.metadata,
        aiGenerated: true,
        userInput: request.userInput,
        generatedAt: new Date().toISOString(),
      },
    }))

    const dependencies: Task[] = (analysis.dependencies || []).map((dep: any, index: number) => ({
      title: dep.title || `Dependency ${index + 1}`,
      description: dep.description || "",
      priority: ["high", "urgent"].includes(dep.priority) ? dep.priority : "high",
      status: "blocked",
      isDependency: true,
      blockedReason: dep.blockedReason || "Requires human approval",
      estimatedHours: typeof dep.estimatedHours === "number" ? dep.estimatedHours : 1,
      category: ["review", "communication"].includes(dep.category) ? dep.category : "review",
      metadata: {
        ...dep.metadata,
        aiGenerated: true,
        requiresHumanApproval: true,
        dependencyType: dep.metadata?.dependencyType || "approval",
      },
    }))

    return {
      success: true,
      tasks,
      dependencies,
      userNeedAnalysis: analysis.userNeedAnalysis || "Analysis not available",
      recommendedFlow: Array.isArray(analysis.recommendedFlow) ? analysis.recommendedFlow : [],
    }
  }

  private fallbackAnalysis(request: TaskAnalysisRequest): TaskAnalysisResult {
    // Simple rule-based fallback when AI is not available
    const baseTask: Task = {
      title: `Process: ${request.userInput.substring(0, 50)}...`,
      description: `Work on the user request: ${request.userInput}`,
      priority: "medium",
      status: "todo",
      isDependency: false,
      estimatedHours: 2,
      category: "implementation",
      metadata: {
        aiGenerated: false,
        fallback: true,
        userInput: request.userInput,
      },
    }

    const dependency: Task = {
      title: "Review and Approve Plan",
      description: `Review the approach for: ${request.userInput}`,
      priority: "high",
      status: "blocked",
      isDependency: true,
      blockedReason: "Requires human review and approval",
      estimatedHours: 1,
      category: "review",
      metadata: {
        aiGenerated: false,
        requiresHumanApproval: true,
        dependencyType: "approval",
      },
    }

    return {
      success: true,
      tasks: [baseTask],
      dependencies: [dependency],
      userNeedAnalysis: "Fallback analysis: User needs assistance with their request",
      recommendedFlow: ["Review request", "Create plan", "Execute plan", "Review results"],
    }
  }

  private async storeTaskAnalysis(userId: string, userInput: string, result: TaskAnalysisResult): Promise<void> {
    try {
      const supabase = getSupabaseAdmin()

      await supabase.from("ai_task_analyses").insert({
        user_id: userId,
        user_input: userInput,
        analysis_result: result,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to store task analysis:", error)
      // Non-critical error, continue execution
    }
  }

  async createTasksFromAnalysis(
    agentId: string,
    userId: string,
    analysis: TaskAnalysisResult,
  ): Promise<{ success: boolean; createdTasks: string[]; createdDependencies: string[]; error?: string }> {
    try {
      const supabase = getSupabaseAdmin()
      const createdTasks: string[] = []
      const createdDependencies: string[] = []

      // Create regular tasks
      for (const task of analysis.tasks) {
        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert({
            agent_id: agentId,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            is_dependency: task.isDependency,
            blocked_reason: task.blockedReason,
            depends_on_task_id: task.dependsOnTaskId,
            depends_on_agent_id: task.dependsOnAgentId,
            estimated_hours: task.estimatedHours,
            metadata: task.metadata,
          })
          .select("id")
          .single()

        if (error) {
          console.error("Error creating task:", error)
          continue
        }

        createdTasks.push(newTask.id)
      }

      // Create dependency tasks
      for (const dependency of analysis.dependencies) {
        const { data: newDependency, error } = await supabase
          .from("tasks")
          .insert({
            agent_id: agentId,
            title: dependency.title,
            description: dependency.description,
            priority: dependency.priority,
            status: "blocked",
            is_dependency: true,
            blocked_reason: dependency.blockedReason,
            estimated_hours: dependency.estimatedHours,
            metadata: dependency.metadata,
          })
          .select("id")
          .single()

        if (error) {
          console.error("Error creating dependency:", error)
          continue
        }

        createdDependencies.push(newDependency.id)
      }

      return {
        success: true,
        createdTasks,
        createdDependencies,
      }
    } catch (error) {
      console.error("Error creating tasks from analysis:", error)
      return {
        success: false,
        createdTasks: [],
        createdDependencies: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
