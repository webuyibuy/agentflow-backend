"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { revalidatePath } from "next/cache"
import { AgentOrchestrator } from "@/lib/agent-orchestrator"

export interface CreateAgentState {
  success?: boolean
  error?: string
  agentId?: string
}

export async function createAgentAction(
  prevState: CreateAgentState | undefined,
  formData: FormData,
): Promise<CreateAgentState> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    let userId: string

    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return { error: "Please log in to create an agent." }
    }

    const name = formData.get("name") as string
    const goal = formData.get("goal") as string

    // Simple validation
    if (!name?.trim() || name.trim().length < 3) {
      return { error: "Agent name must be at least 3 characters long." }
    }

    if (!goal?.trim() || goal.trim().length < 10) {
      return { error: "Please provide a more detailed goal (at least 10 characters)." }
    }

    console.log(`[CreateAgent] Creating agent "${name}" for user ${userId}`)

    // Create the agent without metadata column
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .insert({
        owner_id: userId,
        name: name.trim(),
        goal: goal.trim(),
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (agentError || !agent) {
      console.error("[CreateAgent] Error creating agent:", agentError)
      return { error: "Failed to create agent. Please try again." }
    }

    // Store creation metadata in agent_custom_data table
    const { error: customDataError } = await supabaseAdmin.from("agent_custom_data").insert({
      agent_id: agent.id,
      custom_data: {
        created_via: "simple_creator",
        auto_start: true,
        creation_source: "dashboard_new",
      },
      configuration_method: "simple_creator",
    })

    if (customDataError) {
      console.error("[CreateAgent] Error storing metadata:", customDataError)
      // Non-critical error, continue
    }

    // Start the agent working immediately
    await AgentOrchestrator.startAgent({
      agentId: agent.id,
      agentName: name,
      agentGoal: goal,
      userId,
    })

    // Log creation
    await supabaseAdmin.from("agent_logs").insert({
      agent_id: agent.id,
      log_type: "milestone",
      message: `🎉 Agent "${name}" created and starting work immediately!`,
      metadata: { goal, created_via: "simple_creator" },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath("/dashboard/dependencies")

    return {
      success: true,
      agentId: agent.id,
    }
  } catch (error: any) {
    console.error("[CreateAgent] Unexpected error:", error)
    return { error: "Something went wrong. Please try again." }
  }
}

export async function createAgentWithWorkflow(
  prevState: CreateAgentState | undefined,
  formData: FormData,
): Promise<CreateAgentState> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    let userId: string

    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return { error: "Please log in to create an agent." }
    }

    const templateId = formData.get("templateId") as string
    const name = formData.get("name") as string
    const goal = formData.get("goal") as string
    const behavior = formData.get("behavior") as string
    const priority = (formData.get("priority") as "low" | "medium" | "high") || "medium"
    const suggestedTasksJson = formData.get("suggestedTasks") as string
    let suggestedTasks: string[] = []

    try {
      suggestedTasks = JSON.parse(suggestedTasksJson || "[]")
    } catch (e) {
      console.error("Error parsing suggested tasks:", e)
    }

    // Simple validation
    if (!name?.trim() || name.trim().length < 3) {
      return { error: "Agent name must be at least 3 characters long." }
    }

    if (!goal?.trim() || goal.trim().length < 10) {
      return { error: "Please provide a more detailed goal (at least 10 characters)." }
    }

    console.log(`[CreateAgentWithWorkflow] Creating agent "${name}" from template "${templateId}" for user ${userId}`)

    // Create the agent without metadata column
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .insert({
        owner_id: userId,
        name: name.trim(),
        goal: goal.trim(),
        status: "active",
        template_slug: templateId,
        behavior: behavior?.trim(),
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (agentError || !agent) {
      console.error("[CreateAgentWithWorkflow] Error creating agent:", agentError)
      return { error: "Failed to create agent. Please try again." }
    }

    // Store workflow metadata in agent_custom_data table
    const { error: customDataError } = await supabaseAdmin.from("agent_custom_data").insert({
      agent_id: agent.id,
      custom_data: {
        created_via: "template_wizard",
        template_id: templateId,
        behavior: behavior?.trim(),
        priority,
        auto_start: true,
        creation_source: "workflow",
      },
      configuration_method: "template_wizard",
    })

    if (customDataError) {
      console.error("[CreateAgentWithWorkflow] Error storing metadata:", customDataError)
      // Non-critical error, continue
    }

    // Create initial tasks if provided
    if (suggestedTasks.length > 0) {
      const tasksToInsert = suggestedTasks.map((task, index) => ({
        agent_id: agent.id,
        title: task,
        description: `Auto-generated task from template: ${task}`,
        status: "pending",
        priority: priority,
        created_at: new Date().toISOString(),
        position: index,
      }))

      const { error: tasksError } = await supabaseAdmin.from("tasks").insert(tasksToInsert)

      if (tasksError) {
        console.error("[CreateAgentWithWorkflow] Error creating initial tasks:", tasksError)
        // Continue anyway, not critical
      } else {
        console.log(`[CreateAgentWithWorkflow] Created ${tasksToInsert.length} initial tasks for agent ${agent.id}`)
      }
    }

    // Start the agent working immediately
    await AgentOrchestrator.startAgent({
      agentId: agent.id,
      agentName: name,
      agentGoal: goal,
      agentBehavior: behavior,
      userId,
    })

    // Log creation
    await supabaseAdmin.from("agent_logs").insert({
      agent_id: agent.id,
      log_type: "milestone",
      message: `🎉 Agent "${name}" created from template and starting work immediately!`,
      metadata: { goal, template: templateId, created_via: "template_wizard" },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath("/dashboard/dependencies")

    return {
      success: true,
      agentId: agent.id,
    }
  } catch (error: any) {
    console.error("[CreateAgentWithWorkflow] Unexpected error:", error)
    return { error: "Something went wrong. Please try again." }
  }
}
