"use client"

import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, X, Wand2, AlertCircle, CheckCircle } from "lucide-react"
import { createTask, generateTasksFromDescription, createMultipleTasks } from "@/app/dashboard/tasks/new/actions"
import { ErrorBoundary, useErrorHandler } from "@/components/error-boundary"

interface EnhancedTaskFormProps {
  workspaceId?: string
  onSuccess?: (taskId: string) => void
  onCancel?: () => void
}

export default function EnhancedTaskForm({ workspaceId, onSuccess, onCancel }: EnhancedTaskFormProps) {
  return (
    <ErrorBoundary>
      <TaskFormContent workspaceId={workspaceId} onSuccess={onSuccess} onCancel={onCancel} />
    </ErrorBoundary>
  )
}

function TaskFormContent({ workspaceId, onSuccess, onCancel }: EnhancedTaskFormProps) {
  const [mode, setMode] = useState<"single" | "generate">("single")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())

  const [createState, createAction, isCreating] = useActionState(createTask, undefined)
  const [generateState, generateAction, isGenerating] = useActionState(generateTasksFromDescription, undefined)

  const handleError = useErrorHandler()

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleGenerateSuccess = (state: any) => {
    if (state?.success && state.generatedTasks) {
      setGeneratedTasks(state.generatedTasks)
      setSelectedTasks(new Set(state.generatedTasks.map((_: any, index: number) => index)))
    }
  }

  const handleCreateMultiple = async () => {
    try {
      const tasksToCreate = generatedTasks.filter((_, index) => selectedTasks.has(index))

      if (tasksToCreate.length === 0) {
        return
      }

      const result = await createMultipleTasks(tasksToCreate, workspaceId || "")

      if (result.success) {
        setGeneratedTasks([])
        setSelectedTasks(new Set())
        if (onSuccess) {
          onSuccess("multiple")
        }
      }
    } catch (error) {
      handleError(error as Error, { action: "create_multiple_tasks" })
    }
  }

  const toggleTaskSelection = (index: number) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Create Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")} size="sm">
              Single Task
            </Button>
            <Button variant={mode === "generate" ? "default" : "outline"} onClick={() => setMode("generate")} size="sm">
              <Wand2 className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          </div>

          {mode === "single" && (
            <form action={createAction} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input id="title" name="title" placeholder="Enter task title" required maxLength={100} />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe the task requirements and acceptance criteria"
                  required
                  maxLength={2000}
                  rows={4}
                />
              </div>

              {/* Priority and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue="medium">
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

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" name="dueDate" type="datetime-local" />
                </div>
              </div>

              {/* Estimated Hours */}
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  name="estimatedHours"
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.5"
                  placeholder="e.g., 4.5"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {tags.map((tag) => (
                    <input key={tag} type="hidden" name="tags" value={tag} />
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {createState?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{createState.error}</AlertDescription>
                </Alert>
              )}

              {createState?.validationErrors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {createState.validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Display */}
              {createState?.success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{createState.message}</AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Task
                </Button>
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}

          {mode === "generate" && (
            <div className="space-y-4">
              <form
                action={(formData) => {
                  generateAction(formData)
                  // Handle success in useEffect or similar
                  setTimeout(() => {
                    if (generateState?.success) {
                      handleGenerateSuccess(generateState)
                    }
                  }, 100)
                }}
                className="space-y-4"
              >
                <input type="hidden" name="workspaceId" value={workspaceId} />

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Project Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your project or goal. The AI will generate relevant tasks based on this description."
                    required
                    maxLength={2000}
                    rows={4}
                  />
                </div>

                {/* Context Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" name="industry" placeholder="e.g., Technology, Healthcare, Finance" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Team Size</Label>
                    <Input id="teamSize" name="teamSize" type="number" min="1" max="1000" placeholder="e.g., 5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input id="timeline" name="timeline" placeholder="e.g., 2 weeks, 1 month, Q1 2024" />
                </div>

                {/* Error Display */}
                {generateState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{generateState.error}</AlertDescription>
                  </Alert>
                )}

                {/* Success Display */}
                {generateState?.success && !generatedTasks.length && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{generateState.message}</AlertDescription>
                  </Alert>
                )}

                {/* Generate Button */}
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Tasks
                </Button>
              </form>

              {/* Generated Tasks */}
              {generatedTasks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Generated Tasks</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTasks(new Set(generatedTasks.map((_, i) => i)))}
                      >
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedTasks(new Set())}>
                        Select None
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {generatedTasks.map((task, index) => (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-colors ${
                          selectedTasks.has(index) ? "ring-2 ring-blue-500 bg-blue-50" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedTasks.has(index)}
                              onChange={() => toggleTaskSelection(index)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge variant="outline">{task.priority}</Badge>
                                <Badge variant="secondary">{task.category}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Est: {task.estimatedHours}h</span>
                                {task.requiredSkills.length > 0 && (
                                  <span>Skills: {task.requiredSkills.join(", ")}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateMultiple} disabled={selectedTasks.size === 0}>
                      Create Selected Tasks ({selectedTasks.size})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedTasks([])
                        setSelectedTasks(new Set())
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
