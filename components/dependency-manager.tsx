"use client"

import { useState, useActionState, useTransition } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { moveToTasks, updateTaskMetadata } from "@/app/dashboard/dependencies/actions"
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Bot,
  Timer,
  Flag,
  MoveRight,
  Loader2,
  ArrowRight,
  Users,
  Target,
  Zap,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface DependencyTask {
  id: string
  title: string
  blocked_reason?: string | null
  created_at: string
  updated_at?: string | null
  status: string
  metadata?: {
    priority?: string
    deadline?: string
    estimated_hours?: number
    user_notes?: string
    completion_notes?: string
    workflow_status?: string
    moved_to_tasks?: boolean
    in_history?: boolean
    completed_at?: string
    completed_by?: string
  } | null
  agents?: {
    id: string
    name: string
    owner_id: string
    status?: string
  } | null
}

interface DependencyManagerProps {
  pendingDependencies: DependencyTask[]
  completedDependencies: DependencyTask[]
}

export default function DependencyManager({ pendingDependencies, completedDependencies }: DependencyManagerProps) {
  const { toast } = useToast()
  const [selectedTask, setSelectedTask] = useState<DependencyTask | null>(null)
  const [showSettings, setShowSettings] = useState<string | null>(null)
  const [settingsData, setSettingsData] = useState<Record<string, any>>({})

  const [moveState, moveAction, isMoving] = useActionState(moveToTasks, undefined)
  const [updateState, updateAction] = useActionState(updateTaskMetadata, undefined)

  const [isPending, startTransition] = useTransition()

  const handleSettingsChange = (taskId: string, field: string, value: any) => {
    setSettingsData((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [field]: value,
      },
    }))
  }

  const handleSaveSettings = (taskId: string) => {
    const taskSettings = settingsData[taskId] || {}
    if (Object.keys(taskSettings).length === 0) {
      setShowSettings(null)
      return
    }

    startTransition(() => {
      const formData = new FormData()
      formData.append("taskId", taskId)
      Object.entries(taskSettings).forEach(([key, value]) => {
        formData.append(key, value as string)
      })

      updateAction(formData)
      setShowSettings(null)
      toast({
        title: "Settings Updated",
        description: "Task settings have been saved successfully.",
      })
    })
  }

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
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
        isCompleted ? "bg-green-50/30 border-green-200" : "border-orange-200/50 bg-orange-50/20 hover:bg-orange-50/40"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">{task.agents?.name || "Unknown Agent"}</span>
              <Badge
                variant="outline"
                className={`text-xs ${task.agents?.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}
              >
                {task.agents?.status || "inactive"}
              </Badge>
              {isCompleted && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✅ Completed
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
            {task.blocked_reason && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Why this needs your help:</strong> {task.blocked_reason}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {task.metadata?.priority && (
              <Badge variant="outline" className={getPriorityColor(task.metadata.priority)}>
                <Flag className="h-3 w-3 mr-1" />
                {task.metadata.priority}
              </Badge>
            )}
            {task.metadata?.deadline && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(task.metadata.deadline).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
            </span>
            {task.metadata?.estimated_hours && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {task.metadata.estimated_hours}h est.
              </span>
            )}
          </div>
        </div>

        {task.metadata?.user_notes && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>Your Notes:</strong> {task.metadata.user_notes}
            </p>
          </div>
        )}

        {isCompleted && task.metadata?.completion_notes && (
          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-green-800">
              <strong>Your Work:</strong> {task.metadata.completion_notes}
            </p>
            {task.metadata?.completed_at && (
              <p className="text-xs text-green-600 mt-1">
                Completed on {new Date(task.metadata.completed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!isCompleted && (
            <>
              <form action={moveAction} className="inline-block">
                <input type="hidden" name="taskId" value={task.id} />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isMoving && moveState?.taskId === task.id}
                >
                  {isMoving && moveState?.taskId === task.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    <>
                      <MoveRight className="h-4 w-4 mr-1" />
                      I'll Work On This
                    </>
                  )}
                </Button>
              </form>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(showSettings === task.id ? null : task.id)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings === task.id && !isCompleted && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Task Settings</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <Select
                  defaultValue={task.metadata?.priority || "medium"}
                  onValueChange={(value) => handleSettingsChange(task.id, "priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <Input
                  type="date"
                  defaultValue={task.metadata?.deadline ? task.metadata.deadline.split("T")[0] : ""}
                  onChange={(e) => handleSettingsChange(task.id, "deadline", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <Input
                  type="number"
                  placeholder="Hours"
                  defaultValue={task.metadata?.estimated_hours || ""}
                  onChange={(e) => handleSettingsChange(task.id, "estimated_hours", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Notes</label>
              <Textarea
                placeholder="Add your notes about this task..."
                defaultValue={task.metadata?.user_notes || ""}
                rows={3}
                onChange={(e) => handleSettingsChange(task.id, "user_notes", e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSaveSettings(task.id)} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {(moveState?.message || updateState?.message) && (
        <div
          className={`p-4 rounded-lg ${
            moveState?.success || updateState?.success
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {moveState?.message || updateState?.message}
          {moveState?.success && (
            <div className="mt-2 text-sm">
              <ArrowRight className="inline h-3 w-3 mr-1" />
              Go to your{" "}
              <a href="/dashboard" className="font-medium underline">
                home dashboard
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
            Needs Your Help ({pendingDependencies.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed History ({completedDependencies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDependencies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up! 🎉</h3>
                <p className="text-gray-600 mb-4">Your AI agents don't need any help right now.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild variant="outline">
                    <a href="/dashboard/agents/new">
                      <Zap className="h-4 w-4 mr-2" />
                      Create Another Agent
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/dashboard">
                      <Target className="h-4 w-4 mr-2" />
                      View Dashboard
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Your agents need help with these tasks</h4>
                    <p className="text-sm text-blue-700">
                      Click "I'll Work On This" to move a task to your home dashboard where you can complete it. Your
                      agents will automatically resume once you're done.
                    </p>
                  </div>
                </div>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Tasks Yet</h3>
                <p className="text-gray-600">Tasks you complete will appear here for your reference.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">Your completed work</h4>
                    <p className="text-sm text-green-700">
                      Here's a history of all the dependency tasks you've completed for your agents. Great job on the
                      human-AI collaboration!
                    </p>
                  </div>
                </div>
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
