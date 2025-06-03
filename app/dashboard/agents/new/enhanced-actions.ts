"use server"

import { revalidatePath } from "next/cache"
import { dbOps } from "@/lib/database-operations"
import { taskGenerator } from "@/lib/task-generator"
import { aiProvider } from "@/lib/ai-provider-manager"
import { validateInput, AgentConfigSchema } from "@/lib/validation"
import { errorHandler } from "@/lib/error-handler"
import { getDefaultUserId } from "@/lib/default-user"

export interface AgentCreationState {
  success?: boolean
  error?: string
  agentId?: string
  message?: string
  validationErrors?: string[]
}

export async function createAgentWithTasks(
  prevState: AgentCreationState | undefined,
  formData: FormData,
): Promise<AgentCreationState> {
  try {
    // Get user ID
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return {
        success: false,
        error: "Authentication required to create agent",
      }
    }

    // Extract and validate form data
    const rawData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      goal: formData.get("goal") as string,
      capabilities: formData.getAll("capabilities") as string[],
      aiProvider: formData.get("aiProvider") as string,
      aiModel: formData.get("aiModel") as string,
      workspaceId: formData.get("workspaceId") as string,
      generateTasks: formData.get("generateTasks") === "true",
      industry: formData.get("industry") as string,
      teamSize: Number.parseInt(formData.get("teamSize") as string) || undefined,
      timeline: formData.get("timeline") as string,
    }

    // Validate required fields
    if (!rawData.name || rawData.name.length < 3) {
      return {
        success: false,
        error: "Agent name must be at least 3 characters long",
      }
    }

    if (!rawData.description || rawData.description.length < 10) {
      return {
        success: false,
        error: "Agent description must be at least 10 characters long",
      }
    }

    if (!rawData.goal || rawData.goal.length < 10) {
      return {
        success: false,
        error: "Agent goal must be at least 10 characters long",
      }
    }

    if (!rawData.capabilities || rawData.capabilities.length === 0) {
      return {
        success: false,
        error: "At least one capability must be selected",
      }
    }

    // Validate agent configuration
    const agentConfig = {
      name: rawData.name,
      description: rawData.description,
      capabilities: rawData.capabilities,
      aiProvider: rawData.aiProvider,
      aiModel: rawData.aiModel,
      workspaceId: rawData.workspaceId || userId, // Use userId as workspace if not provided
      parameters: {
        goal: rawData.goal,
        industry: rawData.industry,
        teamSize: rawData.teamSize,
        timeline: rawData.timeline,
      },
    }

    const validation = validateInput(AgentConfigSchema, agentConfig)
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid agent configuration",
        validationErrors: validation.errors,
      }
    }

    // Test AI provider before creating agent
    const providerTest = await aiProvider.testProvider(rawData.aiProvider, userId)
    if (!providerTest.success) {
      return {
        success: false,
        error: `AI provider test failed: ${providerTest.error}. Please check your API key configuration.`,
      }
    }

    // Create agent in database
    const agentResult = await dbOps.createAgent(agentConfig, userId)
    if (!agentResult.success) {
      return {
        success: false,
        error: agentResult.error,
      }
    }

    const agentId = agentResult.agent.id

    // Generate tasks if requested
    if (rawData.generateTasks && rawData.goal) {
      try {
        const taskResult = await taskGenerator.generateTasks({
          description: rawData.goal,
          context: {
            industry: rawData.industry,
            teamSize: rawData.teamSize,
            timeline: rawData.timeline,
            workspaceId: agentConfig.workspaceId,
          },
          userId,
        })

        if (taskResult.success && taskResult.tasks) {
          // Create tasks in database
          for (const task of taskResult.tasks) {
            await dbOps.createTask(
              {
                ...task,
                agent_id: agentId,
                status: "todo",
                workspaceId: agentConfig.workspaceId,
              },
              userId,
            )
          }

          // Log task generation
          await dbOps.logAgentEvent(agentId, `Generated ${taskResult.tasks.length} tasks automatically`, "info", userId)
        }
      } catch (taskError) {
        // Don't fail agent creation if task generation fails
        await dbOps.logAgentEvent(agentId, `Task generation failed: ${(taskError as Error).message}`, "warning", userId)
      }
    }

    // Log successful agent creation
    await dbOps.logAgentEvent(agentId, `Agent "${rawData.name}" created successfully`, "success", userId)

    // Revalidate relevant paths
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath(`/dashboard/agents/${agentId}`)

    return {
      success: true,
      agentId,
      message: `Agent "${rawData.name}" created successfully${rawData.generateTasks ? " with auto-generated tasks" : ""}`,
    }
  } catch (error) {
    const errorId = errorHandler.captureError(error as Error, {
      action: "create_agent_with_tasks",
      component: "agent_creation",
      severity: "high",
    })

    return {
      success: false,
      error: `Failed to create agent. Error ID: ${errorId}`,
    }
  }
}

export async function validateAgentName(
  name: string,
  workspaceId?: string,
): Promise<{
  isValid: boolean
  error?: string
}> {
  try {
    if (!name || name.length < 3) {
      return {
        isValid: false,
        error: "Agent name must be at least 3 characters long",
      }
    }

    if (name.length > 50) {
      return {
        isValid: false,
        error: "Agent name must be less than 50 characters",
      }
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return {
        isValid: false,
        error: "Agent name can only contain letters, numbers, spaces, hyphens, and underscores",
      }
    }

    return { isValid: true }
  } catch (error) {
    errorHandler.captureError(error as Error, {
      action: "validate_agent_name",
      component: "agent_creation",
      severity: "low",
    })

    return {
      isValid: false,
      error: "Failed to validate agent name",
    }
  }
}

export async function testAIProviderConnection(
  provider: string,
  model?: string,
): Promise<{
  success: boolean
  error?: string
  latency?: number
}> {
  try {
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return {
        success: false,
        error: "Authentication required to test AI provider",
      }
    }

    const result = await aiProvider.testProvider(provider, userId)
    return result
  } catch (error) {
    errorHandler.captureError(error as Error, {
      action: "test_ai_provider",
      component: "agent_creation",
      severity: "medium",
    })

    return {
      success: false,
      error: "Failed to test AI provider connection",
    }
  }
}
