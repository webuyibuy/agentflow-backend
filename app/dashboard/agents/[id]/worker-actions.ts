"use server"

import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"
import { triggerN8nWorkflow, executeLyzrAgent, selectIntegrationForTask } from "@/lib/worker-integrations"
import { addAgentLog } from "./actions"
import { revalidatePath } from "next/cache"
import { getDefaultUserId } from "@/lib/default-user"

export interface ExecuteTaskResult {
  success: boolean
  error?: string
  message?: string
  executionId?: string
  integration?: "n8n" | "lyzr" | "none"
}

/**
 * Executes a task using the appropriate worker integration
 */
export async function executeTaskWithWorker(
  agentId: string,
  taskId: string,
  taskDescription: string,
  agentType = "custom",
): Promise<ExecuteTaskResult> {
  const supabaseServer = getSupabaseFromServer()
  const supabaseAdmin = getSupabaseAdmin()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { success: false, error: "Authentication required." }
  }

  // Verify agent ownership
  const { data: agentData, error: agentFetchError } = await supabaseServer
    .from("agents")
    .select("id, owner_id, name, template_slug")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { success: false, error: "Agent not found." }
  }

  if (agentData.owner_id !== userId) {
    return { success: false, error: "You do not own this agent." }
  }

  // Verify task exists and belongs to this agent
  const { data: taskData, error: taskFetchError } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, depends_on_task_id") // Select depends_on_task_id
    .eq("id", taskId)
    .eq("agent_id", agentId)
    .single()

  if (taskFetchError || !taskData) {
    return { success: false, error: "Task not found." }
  }

  let prerequisiteOutputSummary: string | null = null

  // If this task depends on another, fetch its output summary
  if (taskData.depends_on_task_id) {
    const { data: prerequisiteTask, error: prerequisiteError } = await supabaseAdmin
      .from("tasks")
      .select("output_summary")
      .eq("id", taskData.depends_on_task_id)
      .single()

    if (prerequisiteError) {
      console.error("Error fetching prerequisite task output summary:", prerequisiteError)
      await addAgentLog(
        agentId,
        "warning",
        `Could not fetch output summary for prerequisite task ${taskData.depends_on_task_id}: ${prerequisiteError.message}`,
        taskId,
      )
    } else if (prerequisiteTask?.output_summary) {
      prerequisiteOutputSummary = prerequisiteTask.output_summary
      await addAgentLog(
        agentId,
        "info",
        `Fetched output summary from prerequisite task ${taskData.depends_on_task_id}`,
        taskId,
        { prerequisiteTaskId: taskData.depends_on_task_id, summaryLength: prerequisiteOutputSummary.length },
      )
    }
  }

  try {
    // Determine which integration to use
    const selectedIntegration = selectIntegrationForTask(taskDescription, agentData.template_slug || agentType)

    await addAgentLog(agentId, "info", `Starting task execution using ${selectedIntegration} integration`, taskId, {
      integration: selectedIntegration,
      taskTitle: taskData.title,
    })

    let result

    if (selectedIntegration === "n8n") {
      // Execute with n8n workflow
      result = await triggerN8nWorkflow({
        workflowId: `agent_task_${agentType}`, // This would be configurable in a real implementation
        inputData: {
          taskDescription,
          agentName: agentData.name,
          agentType: agentData.template_slug,
          taskId,
          timestamp: new Date().toISOString(),
          prerequisiteOutputSummary, // Pass the output summary here
        },
        agentId,
        taskId,
      })
    } else if (selectedIntegration === "lyzr") {
      // Execute with Lyzr agent
      result = await executeLyzrAgent({
        agentType: agentData.template_slug || "general_assistant",
        prompt: `Task: ${taskDescription}\n\nAgent Context: ${agentData.name} (${agentData.template_slug})\n\nPlease complete this task and provide detailed results.`,
        context: {
          agentName: agentData.name,
          agentType: agentData.template_slug,
          taskId,
          timestamp: new Date().toISOString(),
          prerequisiteOutputSummary, // Pass the output summary here
        },
        agentId,
        taskId,
      })
    } else {
      // No integration needed - handle locally
      await addAgentLog(agentId, "info", "Task processed locally without external integration", taskId)

      // Simulate local processing
      await new Promise((resolve) => setTimeout(resolve, 500))

      result = {
        success: true,
        executionId: `local_${Date.now()}`,
        data: { message: "Task completed locally" },
      }
    }

    if (result.success) {
      // Update task status to completed
      const { error: updateError } = await supabaseAdmin
        .from("tasks")
        .update({
          status: "done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)

      if (updateError) {
        console.error("Error updating task status:", updateError)
        await addAgentLog(
          agentId,
          "error",
          `Task execution succeeded but failed to update status: ${updateError.message}`,
          taskId,
        )
      } else {
        await addAgentLog(
          agentId,
          "milestone",
          `Task completed successfully using ${selectedIntegration} integration`,
          taskId,
          { executionId: result.executionId, integration: selectedIntegration },
        )
      }

      revalidatePath(`/dashboard/agents/${agentId}`)
      revalidatePath("/dashboard")

      return {
        success: true,
        message: `Task executed successfully using ${selectedIntegration} integration`,
        executionId: result.executionId,
        integration: selectedIntegration,
      }
    } else {
      return {
        success: false,
        error: result.error || "Task execution failed",
        integration: selectedIntegration,
      }
    }
  } catch (error) {
    console.error("Error in executeTaskWithWorker:", error)

    await addAgentLog(
      agentId,
      "error",
      `Unexpected error during task execution: ${error instanceof Error ? error.message : "Unknown error"}`,
      taskId,
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Test the worker integrations with sample data
 */
export async function testWorkerIntegrations(agentId: string): Promise<ExecuteTaskResult> {
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    return { success: false, error: "Authentication required." }
  }

  const supabaseServer = getSupabaseFromServer()

  // Verify agent ownership
  const { data: agentData, error: agentFetchError } = await supabaseServer
    .from("agents")
    .select("id, owner_id, name, template_slug")
    .eq("id", agentId)
    .single()

  if (agentFetchError || !agentData) {
    return { success: false, error: "Agent not found." }
  }

  if (agentData.owner_id !== userId) {
    return { success: false, error: "You do not own this agent." }
  }

  try {
    await addAgentLog(agentId, "milestone", "🧪 Starting worker integration tests...", undefined, {
      testType: "integration_test",
    })

    // Test n8n integration
    const n8nResult = await triggerN8nWorkflow({
      workflowId: "test_workflow",
      inputData: {
        testData: "Sample data for n8n test",
        agentName: agentData.name,
        timestamp: new Date().toISOString(),
        prerequisiteOutputSummary: "This is a test summary from a prerequisite task for n8n.", // Add test summary
      },
      agentId,
    })

    // Test Lyzr integration
    const lyzrResult = await executeLyzrAgent({
      agentType: "research_assistant",
      prompt: "This is a test prompt to verify Lyzr integration is working correctly.",
      context: {
        testMode: true,
        agentName: agentData.name,
        prerequisiteOutputSummary: "This is a test summary from a prerequisite task for Lyzr.", // Add test summary
      },
      agentId,
    })

    const results = {
      n8n: n8nResult.success,
      lyzr: lyzrResult.success,
      errors: [
        ...(n8nResult.error ? [`n8n: ${n8nResult.error}`] : []),
        ...(lyzrResult.error ? [`Lyzr: ${lyzrResult.error}`] : []),
      ],
    }

    await addAgentLog(
      agentId,
      results.n8n && results.lyzr ? "success" : "error",
      `🧪 Integration tests completed. n8n: ${results.n8n ? "✅" : "❌"}, Lyzr: ${results.lyzr ? "✅" : "❌"}`,
      undefined,
      { testResults: results },
    )

    revalidatePath(`/dashboard/agents/${agentId}`)

    return {
      success: results.n8n && results.lyzr,
      message:
        results.errors.length > 0
          ? `Some integrations failed: ${results.errors.join(", ")}`
          : "All worker integrations tested successfully!",
      integration: "none", // This is a test, not a specific integration
    }
  } catch (error) {
    console.error("Error testing worker integrations:", error)

    await addAgentLog(
      agentId,
      "error",
      `🧪 Integration test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      undefined,
      { testType: "integration_test", error: true },
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
