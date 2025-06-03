"use server"

import { IntelligentAgentOrchestrator } from "@/lib/intelligent-agent-orchestrator"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function autoStartAgentAfterCreation(
  agentId: string,
  userInputs: {
    goalPrimer?: string
    answers?: any[]
    planData?: any
    consultationHistory?: any[]
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🚀 Auto-starting agent workflow for: ${agentId}`)

    const supabase = getSupabaseFromServer()

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, goal, owner_id")
      .eq("id", agentId)
      .single()

    if (agentError || !agent) {
      return { success: false, error: "Agent not found" }
    }

    // Prepare context for intelligent orchestrator
    const context = {
      agentId: agent.id,
      agentName: agent.name,
      agentGoal: agent.goal,
      userInputs,
      userId: agent.owner_id,
    }

    // Initiate intelligent workflow
    const result = await IntelligentAgentOrchestrator.initiateAgentWorkflow(context)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Refresh dashboard to show agent working
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/agents/${agentId}`)

    console.log(`✅ Agent ${agent.name} is now working automatically`)
    return { success: true }
  } catch (error) {
    console.error("Error auto-starting agent:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
