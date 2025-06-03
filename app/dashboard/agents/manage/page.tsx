import { getSupabaseAdmin } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getSelectedAgentIdFromCookie } from "./actions"
import AgentManagerClient from "@/components/agent-manager-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manage Agents - AgentFlow",
}

export default async function ManageAgentsPage() {
  const supabase = getSupabaseAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: agents, error } = await supabase
    .from("agents")
    .select(`
    id, 
    name, 
    template_slug, 
    goal, 
    status, 
    created_at,
    task_count:tasks(count),
    dependency_count:tasks(count).eq(is_dependency, true).neq(status, 'completed')
  `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching agents for management page:", error)
    // Handle error gracefully, perhaps show an error message to the user
    return (
      <div className="flex-1 p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-4">Manage Your Agents</h1>
        <p className="text-red-500">Error loading agents. Please try again later.</p>
      </div>
    )
  }

  const selectedAgentId = await getSelectedAgentIdFromCookie()

  return <AgentManagerClient agents={agents || []} selectedAgentId={selectedAgentId} />
}
