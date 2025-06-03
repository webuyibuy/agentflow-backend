import Link from "next/link"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import SimpleDependencyManager from "@/components/simple-dependency-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Clock, CheckCircle2, ArrowLeft } from "lucide-react"

export default async function DependenciesPage() {
  const supabase = getSupabaseFromServer()

  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    console.error("[DependenciesPage] Authentication error:", error)
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Please log in</h1>
          <p className="text-gray-600 mt-2">You need to be logged in to view dependencies.</p>
          <Link href="/login" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // Fetch tasks that need user attention
  const { data: allTasks, error } = await supabase
    .from("tasks")
    .select(`
      id, title, blocked_reason, created_at, updated_at, status, metadata,
      is_dependency, agent_id, priority,
      agents!inner(id, name, owner_id, status)
    `)
    .eq("agents.owner_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[DependenciesPage] Error fetching tasks:", error.message)
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Dependencies</h1>
          <p className="text-gray-600 mt-2">Could not load your tasks. Please try again.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const tasks = allTasks || []

  // Simple categorization
  const pendingDeps = tasks.filter(
    (task) =>
      task.is_dependency === true &&
      task.status !== "done" &&
      task.metadata?.workflow_status !== "completed" &&
      task.metadata?.moved_to_tasks !== true,
  )

  const completedDeps = tasks.filter(
    (task) =>
      task.is_dependency === true &&
      task.status === "done" &&
      (task.metadata?.workflow_status === "completed" || task.metadata?.in_history === true),
  )

  const activeUserTasks = tasks.filter(
    (task) =>
      task.is_dependency === false &&
      task.status === "in_progress" &&
      task.metadata?.moved_to_tasks === true &&
      task.metadata?.workflow_status === "user_working",
  ).length

  const urgentCount = pendingDeps.filter(
    (dep) => dep.metadata?.priority === "urgent" || dep.metadata?.priority === "high",
  ).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks That Need Your Help</h1>
          <p className="text-gray-600 mt-2">
            Your agents have created these tasks because they need your input, approval, or expertise.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Your Help</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeps.length}</div>
            <p className="text-xs text-gray-600">Tasks waiting for you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
            <p className="text-xs text-gray-600">Urgent items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You're Working On</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUserTasks}</div>
            <p className="text-xs text-gray-600">
              <Link href="/dashboard" className="hover:underline text-blue-600">
                View on Dashboard
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedDeps.length}</div>
            <p className="text-xs text-gray-600">Tasks you've finished</p>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      {pendingDeps.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-3">How This Works:</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <span className="font-medium">1. Agent Identifies Need:</span>
                <p>Your agent realizes it needs human input or approval to continue</p>
              </div>
              <div>
                <span className="font-medium">2. You Take Action:</span>
                <p>Click "I'll Work On This" to move the task to your dashboard</p>
              </div>
              <div>
                <span className="font-medium">3. Agent Continues:</span>
                <p>Once you complete the task, your agent automatically resumes working</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <SimpleDependencyManager pendingDependencies={pendingDeps} completedDependencies={completedDeps} />
    </div>
  )
}
