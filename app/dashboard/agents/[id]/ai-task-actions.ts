"use server"

import { AITaskAnalyzer, type TaskAnalysisRequest } from "@/lib/ai-task-analyzer"
import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getDefaultUserId } from "@/lib/default-user"
import { addAgentLog } from "./actions"
import { sendSlackNotification } from "@/lib/slack-notifications"

export interface AITaskCreationState {
  success?: boolean
  message?: string
  error?: string
  createdTasks?: number
  createdDependencies?: number
  userNeedAnalysis?: string
  recommendedFlow?: string[]
}

export async function createTasksWithAI(
  agentId: string,
  prevState: AITaskCreationState | undefined,
  formData: FormData,
): Promise<AITaskCreationState> {
  const supabase = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { error: "Authentication required." }
  }

  const userInput = formData.get("userInput") as string
  if (!userInput?.trim()) {
    return { error: "Please describe what you need the agent to work on." }
  }

  try {
    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, goal, template_slug, owner_id")
      .eq("id", agentId)
      .single()

    if (agentError || !agent) {
      return { error: "Agent not found." }
    }

    if (agent.owner_id !== userId) {
      return { error: "You don't have permission to modify this agent." }
    }

    // Get existing tasks for context
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, is_dependency")
      .eq("agent_id", agentId)
      .limit(10)

    // Prepare AI analysis request
    const analysisRequest: TaskAnalysisRequest = {
      userInput: userInput.trim(),
      agentGoal: agent.goal || "",
      agentType: agent.template_slug || "custom",
      existingTasks: existingTasks || [],
      userId,
    }

    // Analyze user needs and create tasks using AI
    const analyzer = new AITaskAnalyzer()
    const analysis = await analyzer.analyzeUserNeedsAndCreateTasks(analysisRequest)

    if (!analysis.success) {
      return {
        error: analysis.error || "Failed to analyze user needs",
        userNeedAnalysis: analysis.userNeedAnalysis,
      }
    }

    // Create tasks in database
    const result = await analyzer.createTasksFromAnalysis(agentId, userId, analysis)

    if (!result.success) {
      return { error: result.error || "Failed to create tasks" }
    }

    // Log the AI task creation
    await addAgentLog(
      agentId,
      "milestone",
      `AI created ${result.createdTasks.length} tasks and ${result.createdDependencies.length} dependencies based on user input`,
      undefined,
      {
        userInput: userInput.trim(),
        tasksCreated: result.createdTasks.length,
        dependenciesCreated: result.createdDependencies.length,
        userNeedAnalysis: analysis.userNeedAnalysis,
        aiGenerated: true,
      },
      userId,
    )

    // Send Slack notification if dependencies were created
    if (result.createdDependencies.length > 0) {
      await sendSlackNotification(
        `🤖 AI created ${result.createdDependencies.length} dependency tasks for agent "${agent.name}" that require your attention. Check your Dependencies basket.`,
      )
    }

    // Revalidate relevant pages
    revalidatePath(`/dashboard/agents/${agentId}`)
    revalidatePath("/dashboard/dependencies")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `AI successfully created ${result.createdTasks.length} tasks and ${result.createdDependencies.length} dependencies based on your request.`,
      createdTasks: result.createdTasks.length,
      createdDependencies: result.createdDependencies.length,
      userNeedAnalysis: analysis.userNeedAnalysis,
      recommendedFlow: analysis.recommendedFlow,
    }
  } catch (error) {
    console.error("Error in AI task creation:", error)
    return {
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function analyzeTaskDependencies(
  agentId: string,
  taskId: string,
): Promise<{ success: boolean; dependencies?: string[]; error?: string }> {
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { success: false, error: "Authentication required." }
  }

  try {
    const supabase = getSupabaseFromServer()

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id, title, description, status,
        agents (id, name, goal, owner_id)
      `)
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      return { success: false, error: "Task not found." }
    }

    // @ts-ignore - Supabase typing
    if (task.agents?.owner_id !== userId) {
      return { success: false, error: "Permission denied." }
    }

    // Use AI to analyze what dependencies this task might need
    const analyzer = new AITaskAnalyzer()
    const analysisRequest: TaskAnalysisRequest = {
      userInput: `Analyze dependencies for task: ${task.title} - ${task.description}`,
      // @ts-ignore
      agentGoal: task.agents?.goal || "",
      agentType: "dependency-analyzer",
      userId,
    }

    const analysis = await analyzer.analyzeUserNeedsAndCreateTasks(analysisRequest)

    if (analysis.success && analysis.dependencies.length > 0) {
      // Create the dependency tasks
      const result = await analyzer.createTasksFromAnalysis(agentId, userId, {
        ...analysis,
        tasks: [], // Only create dependencies
        dependencies: analysis.dependencies,
      })

      return {
        success: true,
        dependencies: result.createdDependencies,
      }
    }

    return { success: true, dependencies: [] }
  } catch (error) {
    console.error("Error analyzing task dependencies:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
    }
  }
}
