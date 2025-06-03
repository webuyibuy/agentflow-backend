"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { revalidatePath } from "next/cache"
import { multiLLMProvider } from "@/lib/multi-llm-provider"
import { AITaskAnalyzer } from "@/lib/ai-task-analyzer"

interface DeployAgentParams {
  name: string
  goal: string
  templateSlug?: string
  templateName?: string
  behavior?: string
  customAnswers?: Record<string, string>
  userId: string
  plan?: any
}

interface DeployAgentResult {
  success: boolean
  message?: string
  error?: string
  agentId?: string
  redirectUrl?: string
}

export async function deployAgent(params: DeployAgentParams): Promise<DeployAgentResult> {
  try {
    console.log("Starting agent deployment with params:", JSON.stringify(params, null, 2))

    // Get the user ID
    let userId = params.userId
    if (!userId) {
      try {
        userId = await getDefaultUserId()
      } catch (error) {
        console.error("Error getting default user ID:", error)
        return {
          success: false,
          error: "Authentication required. Please log in and try again.",
        }
      }
    }

    // Get admin Supabase client for database operations
    const supabase = getSupabaseAdmin()

    // Create the agent record without metadata column
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: params.name,
        goal: params.goal,
        owner_id: userId,
        template_slug: params.templateSlug || "custom-agent",
        template_name: params.templateName || "Custom Agent",
        behavior: params.behavior || "",
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (agentError) {
      console.error("Error creating agent:", agentError)
      return {
        success: false,
        error: `Failed to create agent: ${agentError.message}`,
      }
    }

    const agentId = agent.id

    // Store custom answers and metadata in agent_custom_data table if provided
    if (params.customAnswers && Object.keys(params.customAnswers).length > 0) {
      const customDataToStore = {
        ...params.customAnswers,
        configuration_method: "onboarding",
        template_slug: params.templateSlug,
        template_name: params.templateName,
        deployment_source: "review_deploy",
      }

      const { error: customDataError } = await supabase.from("agent_custom_data").insert({
        agent_id: agentId,
        custom_data: customDataToStore,
        configuration_method: "onboarding",
      })

      if (customDataError) {
        console.error("Error storing custom answers:", customDataError)
        // Non-critical error, continue with deployment
      }
    }

    // Create initial tasks based on the plan or generate them
    let tasks = []
    if (params.plan && params.plan.tasks) {
      // Use the provided plan
      tasks = params.plan.tasks.map((task: any) => ({
        agent_id: agentId,
        title: task.title,
        description: task.description,
        priority: task.priority.toLowerCase(),
        status: "todo",
        is_dependency: false,
      }))
    } else {
      // Generate tasks using AI
      try {
        // Try to use the user's LLM provider
        const availableProviders = multiLLMProvider.getAvailableProviders()

        if (availableProviders.length > 0) {
          // Use the AI Task Analyzer to generate tasks
          const taskAnalyzer = new AITaskAnalyzer()
          const analysisResult = await taskAnalyzer.analyzeUserNeedsAndCreateTasks({
            userInput: `Create initial tasks for a ${params.templateName || "custom"} agent with the goal: ${params.goal}`,
            agentGoal: params.goal,
            agentType: params.templateName || "Custom Agent",
            userId: userId,
          })

          if (analysisResult.success) {
            // Use the generated tasks
            const creationResult = await taskAnalyzer.createTasksFromAnalysis(agentId, userId, analysisResult)
            if (!creationResult.success) {
              console.error("Error creating tasks from analysis:", creationResult.error)
            }
          } else {
            console.error("Task analysis failed:", analysisResult.error)
            // Continue with deployment even if task generation fails
          }
        } else {
          // No LLM provider available, create default tasks
          tasks = [
            {
              agent_id: agentId,
              title: "Initial Setup",
              description: "Configure the agent's initial settings and parameters.",
              priority: "high",
              status: "todo",
              is_dependency: false,
            },
            {
              agent_id: agentId,
              title: "Define Success Metrics",
              description: "Establish clear metrics to measure the agent's performance.",
              priority: "medium",
              status: "todo",
              is_dependency: false,
            },
          ]

          // Insert default tasks
          if (tasks.length > 0) {
            const { error: tasksError } = await supabase.from("tasks").insert(tasks)
            if (tasksError) {
              console.error("Error creating default tasks:", tasksError)
              // Non-critical error, continue with deployment
            }
          }
        }
      } catch (error) {
        console.error("Error generating tasks:", error)
        // Continue with deployment even if task generation fails
      }
    }

    // Update user's onboarding progress
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_step: 4, // Assuming this is the final step
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (profileError) {
      console.error("Error updating onboarding progress:", profileError)
      // Non-critical error, continue with deployment
    }

    // Add XP for completing onboarding
    const { error: xpError } = await supabase.from("xp_log").insert({
      owner_id: userId,
      action: "completed_onboarding",
      points: 100,
      description: "Completed agent onboarding process",
    })

    if (xpError) {
      console.error("Error adding XP for onboarding:", xpError)
      // Non-critical error, continue with deployment
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/agents/${agentId}`)

    console.log("Agent deployment successful. Agent ID:", agentId)

    // Return success with redirect information
    return {
      success: true,
      message: "Agent deployed successfully!",
      agentId: agentId,
      redirectUrl: `/dashboard/agents/${agentId}`,
    }
  } catch (error) {
    console.error("Unexpected error in deployAgent:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred during deployment.",
    }
  }
}
