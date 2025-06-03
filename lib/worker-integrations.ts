"use server"

import { getDecryptedApiKey } from "@/app/dashboard/settings/profile/api-key-actions"
import { addAgentLog } from "@/app/dashboard/agents/[id]/actions"

export interface WorkflowExecutionResult {
  success: boolean
  executionId?: string
  error?: string
  data?: any
}

export interface N8nWorkflowTrigger {
  workflowId: string
  inputData: Record<string, any>
  agentId: string
  taskId?: string
}

export interface LyzrAgentRequest {
  agentType: string
  prompt: string
  context?: Record<string, any>
  agentId: string
  taskId?: string
}

/**
 * Triggers an n8n workflow execution
 */
export async function triggerN8nWorkflow(request: N8nWorkflowTrigger): Promise<WorkflowExecutionResult> {
  try {
    // Get the n8n instance URL from encrypted storage
    const n8nUrl = await getDecryptedApiKey("n8n_url")

    if (!n8nUrl) {
      await addAgentLog(
        request.agentId,
        "error",
        "n8n integration not configured. Please add your n8n instance URL in settings.",
        request.taskId,
      )
      return {
        success: false,
        error: "n8n instance URL not configured",
      }
    }

    // Log the workflow trigger attempt
    await addAgentLog(
      request.agentId,
      "action",
      `Triggering n8n workflow ${request.workflowId} with input data`,
      request.taskId,
      { workflowId: request.workflowId, inputKeys: Object.keys(request.inputData) },
    )

    // For now, this is a stub implementation
    // In a real implementation, you would make an HTTP request to n8n
    const stubExecutionId = `n8n_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Simulate workflow execution
    console.log(`[STUB] n8n workflow execution:`, {
      url: n8nUrl,
      workflowId: request.workflowId,
      inputData: request.inputData,
      executionId: stubExecutionId,
      prerequisiteOutputSummary: request.inputData.prerequisiteOutputSummary, // Log the new field
    })

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Log successful execution
    await addAgentLog(
      request.agentId,
      "success",
      `n8n workflow ${request.workflowId} executed successfully (execution ID: ${stubExecutionId})`,
      request.taskId,
      { executionId: stubExecutionId, workflowId: request.workflowId },
    )

    return {
      success: true,
      executionId: stubExecutionId,
      data: {
        message: "Workflow executed successfully",
        timestamp: new Date().toISOString(),
        inputProcessed: Object.keys(request.inputData).length,
      },
    }
  } catch (error) {
    console.error("Error triggering n8n workflow:", error)

    await addAgentLog(
      request.agentId,
      "error",
      `Failed to trigger n8n workflow ${request.workflowId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      request.taskId,
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Executes a Lyzr agent request
 */
export async function executeLyzrAgent(request: LyzrAgentRequest): Promise<WorkflowExecutionResult> {
  try {
    // Get the Lyzr API key from encrypted storage
    const lyzrApiKey = await getDecryptedApiKey("lyzr_api_key")

    if (!lyzrApiKey) {
      await addAgentLog(
        request.agentId,
        "error",
        "Lyzr integration not configured. Please add your Lyzr API key in settings.",
        request.taskId,
      )
      return {
        success: false,
        error: "Lyzr API key not configured",
      }
    }

    // Log the Lyzr agent execution attempt
    await addAgentLog(
      request.agentId,
      "action",
      `Executing Lyzr agent of type '${request.agentType}' with prompt`,
      request.taskId,
      { agentType: request.agentType, promptLength: request.prompt.length },
    )

    // For now, this is a stub implementation
    // In a real implementation, you would make an HTTP request to Lyzr API
    const stubExecutionId = `lyzr_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Simulate Lyzr agent execution
    console.log(`[STUB] Lyzr agent execution:`, {
      agentType: request.agentType,
      prompt: request.prompt.substring(0, 100) + "...",
      context: request.context,
      executionId: stubExecutionId,
      apiKeyPresent: !!lyzrApiKey,
      prerequisiteOutputSummary: request.context?.prerequisiteOutputSummary, // Log the new field
    })

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate a mock response based on the agent type
    let mockResponse = ""
    switch (request.agentType) {
      case "data_analyst":
        mockResponse = "Data analysis completed. Found 3 key insights and 2 recommendations for optimization."
        break
      case "content_writer":
        mockResponse = "Content generated successfully. Created 500-word article with SEO optimization."
        break
      case "research_assistant":
        mockResponse = "Research completed. Compiled findings from 15 sources with citations and summary."
        break
      default:
        mockResponse = `Task completed by ${request.agentType} agent. Results processed and ready for review.`
    }

    // Log successful execution
    await addAgentLog(
      request.agentId,
      "success",
      `Lyzr ${request.agentType} agent completed successfully: ${mockResponse}`,
      request.taskId,
      { executionId: stubExecutionId, agentType: request.agentType },
    )

    return {
      success: true,
      executionId: stubExecutionId,
      data: {
        response: mockResponse,
        agentType: request.agentType,
        timestamp: new Date().toISOString(),
        tokensUsed: Math.floor(Math.random() * 1000) + 500, // Mock token usage
      },
    }
  } catch (error) {
    console.error("Error executing Lyzr agent:", error)

    await addAgentLog(
      request.agentId,
      "error",
      `Failed to execute Lyzr ${request.agentType} agent: ${error instanceof Error ? error.message : "Unknown error"}`,
      request.taskId,
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Helper function to determine the best integration for a given task
 */
export function selectIntegrationForTask(taskDescription: string, agentType: string): "n8n" | "lyzr" | "none" {
  const taskLower = taskDescription.toLowerCase()

  // Keywords that suggest n8n workflow automation
  const n8nKeywords = ["workflow", "automation", "integrate", "api", "webhook", "schedule", "trigger", "pipeline"]

  // Keywords that suggest Lyzr AI agent work
  const lyzrKeywords = ["analyze", "write", "research", "generate", "summarize", "translate", "classify", "extract"]

  const hasN8nKeywords = n8nKeywords.some((keyword) => taskLower.includes(keyword))
  const hasLyzrKeywords = lyzrKeywords.some((keyword) => taskLower.includes(keyword))

  if (hasN8nKeywords && !hasLyzrKeywords) {
    return "n8n"
  } else if (hasLyzrKeywords && !hasN8nKeywords) {
    return "lyzr"
  } else if (hasLyzrKeywords && hasN8nKeywords) {
    // If both, prefer Lyzr for AI-heavy tasks, n8n for automation-heavy tasks
    return taskLower.includes("automat") ? "n8n" : "lyzr"
  }

  // Default based on agent type
  if (agentType === "dev" || agentType === "marketing") {
    return "n8n" // These often need workflow automation
  } else if (agentType === "sales" || agentType === "hr") {
    return "lyzr" // These often need AI analysis/generation
  }

  return "none"
}
