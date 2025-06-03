"use client"

import { useActionState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { moveToTasks } from "@/app/dashboard/dependencies/actions"
import { Clock, AlertTriangle, CheckCircle2, Bot, MoveRight, Loader2, ArrowRight, Target } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface DependencyTask {
  id: string
  title: string
  blocked_reason?: string | null
  created_at: string
  status: string
  metadata?: {
    priority?: string
    reasoning?: string
    completion_notes?: string
    completed_at?: string
  } | null
  agents?: {
    id: string
    name: string
    status?: string
  } | null
}

interface SimpleDependencyManagerProps {
  pendingDependencies: DependencyTask[]
  completedDependencies: DependencyTask[]
}

export default function SimpleDependencyManager({
  pendingDependencies,
  completedDependencies,
}: SimpleDependencyManagerProps) {
  const { toast } = useToast()
  const [moveState, moveAction, isMoving] = useActionState(moveToTasks, undefined)

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const DependencyCard = ({ task, isCompleted = false }: { task: DependencyTask; isCompleted?: boolean }) => (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        isCompleted ? "bg-green-50/30 border-green-200" : "border-orange-200 bg-orange-50/30 hover:bg-orange-50/50"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">{task.agents?.name || "Unknown Agent"}</span>
              {task.metadata?.priority && (
                <Badge variant="outline" className={getPriorityColor(task.metadata.priority)}>
                  {task.metadata.priority}
                </Badge>
              )}
              {isCompleted && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✅ Done
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">{task.title}</h3>

            {/* Why this task exists */}
            {task.blocked_reason && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-amber-800">
                  <strong>Why your agent needs help:</strong> {task.blocked_reason}
                </p>
              </div>
            )}

            {/* AI reasoning */}
            {task.metadata?.reasoning && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800">
                  <strong>Agent's reasoning:</strong> {task.metadata.reasoning}
                </p>
              </div>
            )}

            {/* Completion notes for completed tasks */}
            {isCompleted && task.metadata?.completion_notes && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-green-800">
                  <strong>What you completed:</strong> {task.metadata.completion_notes}
                </p>
                {task.metadata?.completed_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Completed {formatDistanceToNow(new Date(task.metadata.completed_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      {!isCompleted && (
        <CardContent className="pt-0">
          <form action={moveAction} className="inline-block">
            <input type="hidden" name="taskId" value={task.id} />
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isMoving && moveState?.taskId === task.id}
            >
              {isMoving && moveState?.taskId === task.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving to your workspace...
                </>
              ) : (
                <>
                  <MoveRight className="h-4 w-4 mr-2" />
                  I'll Work On This
                </>
              )}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {moveState?.message && (
        <div
          className={`p-4 rounded-lg ${
            moveState.success
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {moveState.message}
          {moveState.success && (
            <div className="mt-2 text-sm">
              <ArrowRight className="inline h-3 w-3 mr-1" />
              Go to your{" "}
              <a href="/dashboard" className="font-medium underline">
                dashboard
              </a>{" "}
              to work on this task
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Need Your Help ({pendingDependencies.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedDependencies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDependencies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up! 🎉</h3>
                <p className="text-gray-600 mb-6">
                  Your agents don't need any help right now. They're working autonomously.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild variant="outline">
                    <a href="/dashboard/agents/new">
                      <Target className="h-4 w-4 mr-2" />
                      Create Another Agent
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/dashboard">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Back to Dashboard
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-1">
                  Your agents need your help with {pendingDependencies.length} task
                  {pendingDependencies.length !== 1 ? "s" : ""}
                </h4>
                <p className="text-sm text-blue-700">
                  Click "I'll Work On This" to move a task to your dashboard. Your agent will automatically continue
                  once you're done.
                </p>
              </div>
              <div className="grid gap-4">
                {pendingDependencies.map((task) => (
                  <DependencyCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedDependencies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed tasks yet</h3>
                <p className="text-gray-600">Tasks you complete will appear here for your reference.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-1">Your completed work</h4>
                <p className="text-sm text-green-700">
                  Great job! Here's a history of tasks you've completed to help your agents.
                </p>
              </div>
              <div className="grid gap-4">
                {completedDependencies.map((task) => (
                  <DependencyCard key={task.id} task={task} isCompleted />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
