"use client"

import { useActionState, useState, useEffect } from "react"
import { updateTask, type TaskEditState } from "@/app/dashboard/agents/[id]/task-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2, Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface SimpleAgent {
  id: string
  name: string | null
}

interface SimpleTask {
  id: string
  title: string | null
  agent_id: string
}

interface TaskEditFormProps {
  taskId: string
  currentTitle: string
  currentDescription?: string
  currentStatus: string
  currentBlockedReason?: string
  currentDependsOnTaskId?: string | null
  currentDependsOnAgentId?: string | null
  currentOutputSummary?: string | null
  onSuccess?: () => void
  onCancel?: () => void
  allUserAgents: SimpleAgent[]
  allUserTasks: SimpleTask[]
}

const statusOptions = [
  { value: "todo", label: "To Do", description: "Task is ready to be worked on" },
  { value: "in_progress", label: "In Progress", description: "Task is currently being worked on" },
  { value: "blocked", label: "Blocked", description: "Task is waiting for something" },
  { value: "done", label: "Done", description: "Task has been completed" },
]

export default function TaskEditForm({
  taskId,
  currentTitle,
  currentDescription = "",
  currentStatus,
  currentBlockedReason = "",
  currentDependsOnTaskId = null,
  currentDependsOnAgentId = null,
  currentOutputSummary = "",
  onSuccess,
  onCancel,
  allUserAgents,
  allUserTasks,
}: TaskEditFormProps) {
  const [title, setTitle] = useState(currentTitle)
  const [description, setDescription] = useState(currentDescription)
  const [status, setStatus] = useState(currentStatus)
  const [blockedReason, setBlockedReason] = useState(currentBlockedReason)
  const [dependsOnAgentId, setDependsOnAgentId] = useState<string | null>(currentDependsOnAgentId)
  const [dependsOnTaskId, setDependsOnTaskId] = useState<string | null>(currentDependsOnTaskId)
  const [isDependency, setIsDependency] = useState(currentStatus === "blocked" || !!currentDependsOnTaskId)
  const [outputSummary, setOutputSummary] = useState(currentOutputSummary || "")

  const initialState: TaskEditState = {}
  const [state, formAction, isPending] = useActionState(
    (prevState: TaskEditState | undefined, formData: FormData) => updateTask(taskId, prevState, formData),
    initialState,
  )

  // Filter tasks based on selected dependsOnAgentId
  const filteredTasks = dependsOnAgentId
    ? allUserTasks.filter((task) => task.agent_id === dependsOnAgentId && task.id !== taskId) // Exclude current task
    : []

  // Effect to manage isDependency and blockedReason based on dependsOnTaskId
  useEffect(() => {
    if (dependsOnTaskId) {
      setIsDependency(true)
      if (!blockedReason) {
        const dependentTask = allUserTasks.find((task) => task.id === dependsOnTaskId)
        const dependentAgent = allUserAgents.find((agent) => agent.id === dependsOnAgentId)
        if (dependentTask && dependentAgent) {
          setBlockedReason(`Blocked by task "${dependentTask.title}" in agent "${dependentAgent.name}".`)
        } else {
          setBlockedReason("Blocked by another task.")
        }
      }
      // If a dependency is set, force status to 'blocked'
      if (status !== "blocked") {
        setStatus("blocked")
      }
    } else if (isDependency && !blockedReason) {
      // If isDependency is checked manually but no inter-task dependency, clear blocked reason
      setBlockedReason("")
    }
  }, [dependsOnTaskId, dependsOnAgentId, allUserTasks, allUserAgents, isDependency, blockedReason, status])

  // Call onSuccess when update is successful
  if (state?.success && onSuccess) {
    onSuccess()
  }

  const handleSubmit = (formData: FormData) => {
    if (dependsOnAgentId) formData.append("dependsOnAgentId", dependsOnAgentId)
    if (dependsOnTaskId) formData.append("dependsOnTaskId", dependsOnTaskId)
    if (outputSummary) formData.append("output_summary", outputSummary)
    formAction(formData)
  }

  return (
    <div className="space-y-6">
      {state?.success && (
        <Alert className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state?.errors?._form && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Update Failed</AlertTitle>
          <AlertDescription>{state.errors._form.join(", ")}</AlertDescription>
        </Alert>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title" className="font-medium text-gray-700 dark:text-gray-300">
            Task Title
          </Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Analyze Q4 sales data"
            required
            minLength={5}
            maxLength={100}
            className="mt-1"
            aria-describedby="title-error"
          />
          {state?.errors?.title && (
            <p id="title-error" className="mt-1 text-sm text-red-600">
              {state.errors.title.join(", ")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description" className="font-medium text-gray-700 dark:text-gray-300">
            Task Description (Optional)
          </Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide additional details about what needs to be done..."
            maxLength={500}
            className="mt-1 min-h-[100px]"
            aria-describedby="description-error"
          />
          {state?.errors?.description && (
            <p id="description-error" className="mt-1 text-sm text-red-600">
              {state.errors.description.join(", ")}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDependency"
            name="isDependency"
            checked={isDependency}
            onCheckedChange={(checked) => {
              setIsDependency(!!checked)
              if (!checked) {
                setDependsOnAgentId(null)
                setDependsOnTaskId(null)
                setBlockedReason("")
              }
            }}
          />
          <Label htmlFor="isDependency" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            This task requires human approval or depends on another task
          </Label>
        </div>

        {isDependency && (
          <>
            <div>
              <Label htmlFor="dependsOnAgent" className="font-medium text-gray-700 dark:text-gray-300">
                Depends on Agent (Optional)
              </Label>
              <Select
                name="dependsOnAgent"
                value={dependsOnAgentId || "none"}
                onValueChange={(value) => {
                  setDependsOnAgentId(value === "none" ? null : value)
                  setDependsOnTaskId(null) // Reset task when agent changes
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific agent</SelectItem>
                  {allUserAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Select an agent if this task depends on a task from another agent.
              </p>
            </div>

            {dependsOnAgentId && (
              <div>
                <Label htmlFor="dependsOnTask" className="font-medium text-gray-700 dark:text-gray-300">
                  Depends on Task (Optional)
                </Label>
                <Select
                  name="dependsOnTask"
                  value={dependsOnTaskId || "none"}
                  onValueChange={(value) => setDependsOnTaskId(value === "none" ? null : value)}
                  disabled={!dependsOnAgentId || filteredTasks.length === 0}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific task</SelectItem>
                    {filteredTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select a specific task within the chosen agent that this task depends on.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="blockedReason" className="font-medium text-gray-700 dark:text-gray-300">
                Reason for Being Blocked
              </Label>
              <Textarea
                id="blockedReason"
                name="blockedReason"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Explain why this task is blocked..."
                maxLength={200}
                className="mt-1 min-h-[80px]"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="status" className="font-medium text-gray-700 dark:text-gray-300">
            Task Status
          </Label>
          <Select
            name="status"
            value={status}
            onValueChange={setStatus}
            disabled={!!dependsOnTaskId && status !== "blocked"} // Disable if dependent and not blocked
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.status && <p className="mt-1 text-sm text-red-600">{state.errors.status.join(", ")}</p>}
          {!!dependsOnTaskId && status !== "blocked" && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              This task is blocked by another task and must remain 'Blocked' until its dependency is resolved.
            </p>
          )}
        </div>

        {status === "done" && (
          <div>
            <Label htmlFor="outputSummary" className="font-medium text-gray-700 dark:text-gray-300">
              Output Summary (Optional)
            </Label>
            <Textarea
              id="outputSummary"
              name="outputSummary"
              value={outputSummary}
              onChange={(e) => setOutputSummary(e.target.value)}
              placeholder="Summarize the outcome or key results of this task..."
              maxLength={1000}
              className="mt-1 min-h-[100px]"
              aria-describedby="outputSummary-error"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Provide a brief summary of the task's outcome. This can be used by dependent agents.
            </p>
            {state?.errors?.output_summary && (
              <p id="outputSummary-error" className="mt-1 text-sm text-red-600">
                {state.errors.output_summary.join(", ")}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isPending} className="bg-[#007AFF] hover:bg-[#0056b3] text-white">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
