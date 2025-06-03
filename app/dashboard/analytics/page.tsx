import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import type { Metadata } from "next"
import AnalyticsDashboard from "@/components/analytics-dashboard"

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  description: "Monitor your agent performance and system metrics",
}

async function AnalyticsDataFetcher(userId: string) {
  const adminSupabase = getSupabaseAdmin()

  // Fetch comprehensive analytics data
  const [
    { data: agents, error: agentsError },
    { data: tasks, error: tasksError },
    { data: xpLogs, error: xpError },
    { data: agentLogs, error: logsError },
  ] = await Promise.all([
    adminSupabase
      .from("agents")
      .select("id, name, template_slug, status, created_at, updated_at")
      .eq("owner_id", userId),
    adminSupabase
      .from("tasks")
      .select(
        `
        id, 
        title, 
        status, 
        is_dependency, 
        created_at, 
        updated_at,
        agent_id,
        agents!inner(owner_id)
      `,
      )
      .eq("agents.owner_id", userId),
    adminSupabase.from("xp_log").select("points, created_at, task_id").eq("owner_id", userId),
    adminSupabase
      .from("agent_logs")
      .select("log_type, timestamp, agent_id") // Changed created_at to timestamp
      .eq("user_id", userId)
      .gte("timestamp", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Changed created_at to timestamp
  ])

  if (agentsError || tasksError || xpError || logsError) {
    console.error("Error fetching analytics data:", { agentsError, tasksError, xpError, logsError })
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading analytics data. Please try again later.</p>
      </div>
    )
  }

  return (
    <AnalyticsDashboard agents={agents || []} tasks={tasks || []} xpLogs={xpLogs || []} agentLogs={agentLogs || []} />
  )
}

export default async function AnalyticsPage() {
  try {
    const userId = await getDefaultUserId()

    return (
      <div className="container mx-auto py-6">
        <AnalyticsDashboard userId={userId} />
      </div>
    )
  } catch (error) {
    console.error("Error loading analytics page:", error)
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Analytics</h1>
          <p className="text-gray-600 mt-2">There was an error loading the analytics dashboard.</p>
        </div>
      </div>
    )
  }
}
