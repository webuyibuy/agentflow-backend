import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { TestButton } from "./test-button"
import AgentDetailPageClient from "./AgentDetailPageClient"
import { Suspense } from "react"

interface PageProps {
  params: {
    id: string
  }
}

export default async function AgentDetailPage({ params }: PageProps) {
  const agentId = params.id

  console.log(`[AgentDetailPage] Loading agent ${agentId}`)

  try {
    const supabase = getSupabaseFromServer()
    let userId: string

    try {
      userId = await getDefaultUserId()
    } catch (error) {
      console.error("[AgentDetailPage] Authentication error:", error)
      return (
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600">Authentication Required</h1>
            <p className="text-gray-600 mt-2">Please log in to view agent details.</p>
            <a href="/login" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go to Login
            </a>
          </div>
        </div>
      )
    }

    console.log(`[AgentDetailPage] User ID: ${userId}`)

    // Fetch agent details - try with and without owner verification
    let agent = null
    let agentError = null

    // First try with owner verification
    const { data: ownedAgent, error: ownedError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("owner_id", userId)
      .single()

    if (ownedAgent) {
      agent = ownedAgent
    } else {
      // If not found with owner verification, try without (for development/testing)
      console.log(`[AgentDetailPage] Agent not found with owner verification, trying without...`)
      const { data: anyAgent, error: anyError } = await supabase.from("agents").select("*").eq("id", agentId).single()

      if (anyAgent) {
        agent = anyAgent
        console.log(`[AgentDetailPage] Found agent without owner verification`)
      } else {
        agentError = anyError || ownedError
      }
    }

    if (!agent) {
      console.error(`[AgentDetailPage] Agent ${agentId} not found:`, agentError?.message)
      return (
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600">Agent Not Found</h1>
            <p className="text-gray-600 mt-2">
              The agent you're looking for doesn't exist or you don't have access to it.
            </p>
            <a
              href="/dashboard"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      )
    }

    // Fetch tasks for this agent
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })

    if (tasksError) {
      console.error(`[AgentDetailPage] Error loading tasks for agent ${agentId}:`, tasksError.message)
    }

    console.log(`[AgentDetailPage] Successfully loaded agent "${agent.name}" with ${tasksData?.length || 0} tasks`)

    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-gray-600">Manage and monitor your AI agent</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/dashboard"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back to Dashboard
            </a>
            <Suspense fallback={<div className="px-4 py-2 bg-gray-100 rounded">Loading...</div>}>
              <TestButton agentId={agentId} />
            </Suspense>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading agent details...</p>
            </div>
          }
        >
          <AgentDetailPageClient agent={agent} tasksData={tasksData || []} agentId={agentId} />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("[AgentDetailPage] Unexpected error:", error)
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
          <p className="text-gray-600 mt-2">An unexpected error occurred while loading the agent.</p>
          <a href="/dashboard" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps) {
  try {
    const supabase = getSupabaseFromServer()
    const { data: agent } = await supabase.from("agents").select("name").eq("id", params.id).single()

    return {
      title: agent?.name ? `${agent.name} - Agent Details` : "Agent Details",
      description: "Manage and monitor your AI agent",
    }
  } catch {
    return {
      title: "Agent Details",
      description: "Manage and monitor your AI agent",
    }
  }
}
