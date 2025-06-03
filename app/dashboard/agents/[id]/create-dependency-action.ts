"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createAgentDependency(agentId: string, title: string, reason: string, priority = "high") {
  console.log(`Creating dependency for agent ${agentId}: ${title}`)

  try {
    const supabase = getSupabaseAdmin()

    // Get agent info to ensure it exists
    const { data: agent } = await supabase.from("agents").select("id, owner_id, name").eq("id", agentId).single()

    if (!agent) {
      console.error(`Agent ${agentId} not found`)
      return { success: false, error: "Agent not found" }
    }

    // Create the dependency task
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        agent_id: agentId,
        title: title,
        status: "blocked", // IMPORTANT: Mark as blocked
        priority: priority,
        is_dependency: true, // MARK AS DEPENDENCY
        blocked_reason: reason, // IMPORTANT: Include blocked reason
        auto_generated: false, // This is manually created
        metadata: {
          blocked_by: "user_input",
          workflow_type: "dependency",
          ai_generated: false,
          requires_human_input: true,
          dependency_type: "user_input",
          priority: priority,
          manually_created: true,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating dependency:", error)
      return { success: false, error: error.message }
    }

    // Log the dependency creation
    await supabase.from("agent_logs").insert({
      agent_id: agentId,
      log_type: "dependency",
      message: `🚨 New dependency created: ${title}`,
      metadata: {
        dependency_id: task.id,
        dependency_title: title,
        dependency_reason: reason,
        manually_created: true,
      },
      created_at: new Date().toISOString(),
    })

    // Revalidate paths
    revalidatePath(`/dashboard/agents/${agentId}`)
    revalidatePath("/dashboard/dependencies")

    return { success: true, taskId: task.id }
  } catch (error) {
    console.error("Error in createAgentDependency:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
