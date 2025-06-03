import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import AgentEditForm from "@/components/agent-edit-form"
import { ArrowLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PageProps {
  params: {
    id: string
  }
}

export default async function AgentEditPage({ params }: PageProps) {
  const agentId = params.id

  try {
    const supabase = getSupabaseFromServer()
    const userId = await getDefaultUserId()

    // Fetch the agent to edit
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("owner_id", userId)
      .single()

    if (agentError || !agent) {
      return (
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600">Agent Not Found</h1>
            <p className="text-gray-600 mt-2">
              The agent you're trying to edit doesn't exist or you don't have permission to edit it.
            </p>
            <Link
              href="/dashboard/agents"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Agents
            </Link>
          </div>
        </div>
      )
    }

    // Fetch user's other agents for parent selection (excluding current agent)
    const { data: userAgents, error: agentsError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("owner_id", userId)
      .neq("id", agentId)
      .order("name")

    if (agentsError) {
      console.error("Error fetching user agents:", agentsError)
    }

    return (
      <div className="container mx-auto py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/dashboard/agents/${agentId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Agent
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Agent</h1>
              <p className="text-gray-600 dark:text-gray-400">Modify "{agent.name}" configuration and settings</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <AgentEditForm
          agentId={agentId}
          currentName={agent.name || ""}
          currentGoal={agent.goal || ""}
          currentBehavior={agent.behavior}
          currentParentAgentId={agent.parent_agent_id}
          userAgents={userAgents || []}
          onSuccess={() => {
            // Redirect to agent detail page after successful update
            window.location.href = `/dashboard/agents/${agentId}`
          }}
          onCancel={() => {
            // Redirect back to agent detail page
            window.location.href = `/dashboard/agents/${agentId}`
          }}
        />
      </div>
    )
  } catch (error) {
    console.error("Error loading agent edit page:", error)
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
          <p className="text-gray-600 mt-2">An unexpected error occurred while loading the agent.</p>
          <Link
            href="/dashboard/agents"
            className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Agents
          </Link>
        </div>
      </div>
    )
  }
}

export async function generateMetadata({ params }: PageProps) {
  try {
    const supabase = getSupabaseFromServer()
    const { data: agent } = await supabase.from("agents").select("name").eq("id", params.id).single()

    return {
      title: agent?.name ? `Edit ${agent.name}` : "Edit Agent",
      description: "Modify agent configuration and settings",
    }
  } catch {
    return {
      title: "Edit Agent",
      description: "Modify agent configuration and settings",
    }
  }
}
