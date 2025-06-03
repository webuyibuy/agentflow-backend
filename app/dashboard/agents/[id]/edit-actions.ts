"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"

export interface AgentEditState {
  success?: boolean
  message?: string
  errors?: {
    name?: string[]
    goal?: string[]
    behavior?: string[]
    parent_agent_id?: string[]
    _form?: string[]
  }
}

export async function updateAgent(
  agentId: string,
  prevState: AgentEditState | undefined,
  formData: FormData,
): Promise<AgentEditState> {
  try {
    const name = formData.get("name") as string
    const goal = formData.get("goal") as string
    const behavior = formData.get("behavior") as string
    const parentAgentId = formData.get("parent_agent_id") as string

    // Validation
    const errors: AgentEditState["errors"] = {}

    if (!name || name.trim().length < 3) {
      errors.name = ["Agent name must be at least 3 characters long"]
    }
    if (name && name.length > 50) {
      errors.name = ["Agent name must be less than 50 characters"]
    }

    if (!goal || goal.trim().length < 10) {
      errors.goal = ["Goal must be at least 10 characters long"]
    }
    if (goal && goal.length > 500) {
      errors.goal = ["Goal must be less than 500 characters"]
    }

    if (behavior && behavior.length > 1000) {
      errors.behavior = ["Behavior description must be less than 1000 characters"]
    }

    // Check for circular parent relationship
    if (parentAgentId && parentAgentId !== "none" && parentAgentId === agentId) {
      errors.parent_agent_id = ["An agent cannot be its own parent"]
    }

    if (Object.keys(errors).length > 0) {
      return { errors }
    }

    const supabase = getSupabaseFromServer()
    const userId = await getDefaultUserId()

    console.log(`[updateAgent] Updating agent ${agentId} for user ${userId}`)

    // Verify agent ownership
    const { data: existingAgent, error: fetchError } = await supabase
      .from("agents")
      .select("id, name, owner_id")
      .eq("id", agentId)
      .eq("owner_id", userId)
      .single()

    if (fetchError || !existingAgent) {
      console.error(`[updateAgent] Agent not found or access denied:`, fetchError)
      return {
        errors: {
          _form: ["Agent not found or you don't have permission to edit it"],
        },
      }
    }

    // Check if parent agent exists and belongs to user (if specified)
    if (parentAgentId && parentAgentId !== "none") {
      const { data: parentAgent, error: parentError } = await supabase
        .from("agents")
        .select("id, name")
        .eq("id", parentAgentId)
        .eq("owner_id", userId)
        .single()

      if (parentError || !parentAgent) {
        return {
          errors: {
            parent_agent_id: ["Selected parent agent not found or you don't have access to it"],
          },
        }
      }

      // Check for circular dependency
      const { data: descendants, error: descendantsError } = await supabase
        .from("agents")
        .select("id")
        .eq("parent_agent_id", agentId)

      if (!descendantsError && descendants) {
        const descendantIds = descendants.map((d) => d.id)
        if (descendantIds.includes(parentAgentId)) {
          return {
            errors: {
              parent_agent_id: ["Cannot create circular parent-child relationship"],
            },
          }
        }
      }
    }

    // Update the agent
    const updateData = {
      name: name.trim(),
      goal: goal.trim(),
      behavior: behavior?.trim() || null,
      parent_agent_id: parentAgentId === "none" ? null : parentAgentId || null,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", agentId)
      .eq("owner_id", userId)

    if (updateError) {
      console.error(`[updateAgent] Failed to update agent:`, updateError)
      return {
        errors: {
          _form: ["Failed to update agent. Please try again."],
        },
      }
    }

    console.log(`[updateAgent] Successfully updated agent "${name}" (${agentId})`)

    // Revalidate relevant pages
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath("/dashboard/agents/manage")
    revalidatePath(`/dashboard/agents/${agentId}`)

    return {
      success: true,
      message: `Agent "${name}" has been successfully updated.`,
    }
  } catch (error) {
    console.error("[updateAgent] Unexpected error:", error)
    return {
      errors: {
        _form: ["An unexpected error occurred while updating the agent."],
      },
    }
  }
}

interface DeleteAgentResult {
  success: boolean
  message: string
  agentId?: string
}

export async function deleteAgent(
  prevState: DeleteAgentResult | undefined,
  formData: FormData,
): Promise<DeleteAgentResult> {
  try {
    const agentId = formData.get("agentId") as string

    if (!agentId) {
      return {
        success: false,
        message: "Agent ID is required",
      }
    }

    const supabase = getSupabaseFromServer()
    const userId = await getDefaultUserId()

    console.log(`[deleteAgent] Starting deletion process for agent ${agentId}`)

    // First, verify the agent exists and belongs to the user
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, status")
      .eq("id", agentId)
      .eq("owner_id", userId)
      .single()

    if (agentError || !agent) {
      console.error(`[deleteAgent] Agent not found or access denied:`, agentError)
      return {
        success: false,
        message: "Agent not found or you don't have permission to delete it",
      }
    }

    // Check for active dependencies that would be orphaned
    const { data: activeDependencies, error: depError } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("agent_id", agentId)
      .eq("is_dependency", true)
      .in("status", ["pending", "in_progress"])

    if (depError) {
      console.error(`[deleteAgent] Error checking dependencies:`, depError)
      return {
        success: false,
        message: "Error checking agent dependencies",
      }
    }

    if (activeDependencies && activeDependencies.length > 0) {
      return {
        success: false,
        message: `Cannot delete agent with ${activeDependencies.length} active dependencies. Complete or reassign them first.`,
      }
    }

    // Start deletion process
    console.log(`[deleteAgent] Proceeding with deletion of agent "${agent.name}"`)

    // 1. Delete or update child agents that reference this agent as parent
    const { error: childAgentsError } = await supabase
      .from("agents")
      .update({ parent_agent_id: null })
      .eq("parent_agent_id", agentId)

    if (childAgentsError) {
      console.warn(`[deleteAgent] Warning: Could not update child agents:`, childAgentsError)
    }

    // 2. Handle tasks - mark dependency tasks as orphaned, delete regular tasks
    const { error: orphanTasksError } = await supabase
      .from("tasks")
      .update({
        status: "orphaned",
        metadata: {
          orphaned_at: new Date().toISOString(),
          original_agent_id: agentId,
          orphaned_reason: "Agent deleted",
        },
      })
      .eq("agent_id", agentId)
      .eq("is_dependency", true)

    if (orphanTasksError) {
      console.warn(`[deleteAgent] Warning: Could not orphan dependency tasks:`, orphanTasksError)
    }

    // Delete non-dependency tasks
    const { error: deleteTasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("agent_id", agentId)
      .eq("is_dependency", false)

    if (deleteTasksError) {
      console.warn(`[deleteAgent] Warning: Could not delete regular tasks:`, deleteTasksError)
    }

    // 3. Delete agent logs
    const { error: logsError } = await supabase.from("agent_logs").delete().eq("agent_id", agentId)

    if (logsError) {
      console.warn(`[deleteAgent] Warning: Could not delete agent logs:`, logsError)
    }

    // 4. Delete notifications related to this agent
    const { error: notificationsError } = await supabase
      .from("notifications")
      .delete()
      .or(`agent_id.eq.${agentId},metadata->>agent_id.eq.${agentId}`)

    if (notificationsError) {
      console.warn(`[deleteAgent] Warning: Could not delete notifications:`, notificationsError)
    }

    // 5. Finally, delete the agent itself
    const { error: deleteAgentError } = await supabase.from("agents").delete().eq("id", agentId).eq("owner_id", userId)

    if (deleteAgentError) {
      console.error(`[deleteAgent] Failed to delete agent:`, deleteAgentError)
      return {
        success: false,
        message: "Failed to delete agent. Please try again.",
      }
    }

    console.log(`[deleteAgent] Successfully deleted agent "${agent.name}" (${agentId})`)

    // Revalidate relevant pages
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath("/dashboard/agents/manage")
    revalidatePath(`/dashboard/agents/${agentId}`)

    return {
      success: true,
      message: `Agent "${agent.name}" has been successfully deleted.`,
      agentId,
    }
  } catch (error) {
    console.error("[deleteAgent] Unexpected error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while deleting the agent.",
    }
  }
}
