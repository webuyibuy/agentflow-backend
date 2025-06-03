"use client"

import { useActionState, useState, useEffect } from "react"
import { updateAgent, type AgentEditState } from "@/app/dashboard/agents/[id]/edit-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2, Save, Sparkles, Target, Brain, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AgentEditFormProps {
  agentId: string
  currentName: string
  currentGoal: string
  currentBehavior?: string | null
  currentParentAgentId?: string | null
  userAgents: { id: string; name: string | null }[]
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AgentEditForm({
  agentId,
  currentName,
  currentGoal,
  currentBehavior,
  currentParentAgentId,
  userAgents,
  onSuccess,
  onCancel,
}: AgentEditFormProps) {
  const [name, setName] = useState(currentName)
  const [goal, setGoal] = useState(currentGoal)
  const [behavior, setBehavior] = useState(currentBehavior || "")
  const [parentAgentId, setParentAgentId] = useState<string | null>(currentParentAgentId || null)
  const [hasChanges, setHasChanges] = useState(false)

  const initialState: AgentEditState = {}
  const [state, formAction, isPending] = useActionState(
    (prevState: AgentEditState | undefined, formData: FormData) => updateAgent(agentId, prevState, formData),
    initialState,
  )

  // Track changes
  useEffect(() => {
    const changed =
      name !== currentName ||
      goal !== currentGoal ||
      behavior !== (currentBehavior || "") ||
      parentAgentId !== currentParentAgentId

    setHasChanges(changed)
  }, [name, goal, behavior, parentAgentId, currentName, currentGoal, currentBehavior, currentParentAgentId])

  // Call onSuccess when update is successful
  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess()
    }
  }, [state?.success, onSuccess])

  // Character counts
  const nameCount = name.length
  const goalCount = goal.length
  const behaviorCount = behavior.length

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {state?.success && (
        <Alert className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {state?.errors?._form && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Update Failed</AlertTitle>
          <AlertDescription>{state.errors._form.join(", ")}</AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Edit Agent Configuration
          </CardTitle>
          <CardDescription>
            Customize your agent's identity, goals, and behavior to optimize its performance.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-6">
            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                <Target className="h-4 w-4 text-blue-600" />
                Agent Name
              </Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Assistant, Data Analyst, Customer Support Bot"
                required
                minLength={3}
                maxLength={50}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                aria-describedby="name-error name-help"
              />
              <div className="flex justify-between items-center">
                <p id="name-help" className="text-xs text-gray-500 dark:text-gray-400">
                  Choose a clear, descriptive name for your agent
                </p>
                <span
                  className={`text-xs ${nameCount > 45 ? "text-orange-500" : nameCount > 50 ? "text-red-500" : "text-gray-400"}`}
                >
                  {nameCount}/50
                </span>
              </div>
              {state?.errors?.name && (
                <p id="name-error" className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {state.errors.name.join(", ")}
                </p>
              )}
            </div>

            {/* Primary Goal */}
            <div className="space-y-2">
              <Label htmlFor="goal" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                <Target className="h-4 w-4 text-green-600" />
                Primary Goal
              </Label>
              <Textarea
                id="goal"
                name="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe the main objective for this agent. What should it accomplish? Be specific about the desired outcomes and success criteria."
                required
                minLength={10}
                maxLength={500}
                className="min-h-[120px] transition-all duration-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
                aria-describedby="goal-error goal-help"
              />
              <div className="flex justify-between items-center">
                <p id="goal-help" className="text-xs text-gray-500 dark:text-gray-400">
                  Define clear, measurable objectives for optimal agent performance
                </p>
                <span
                  className={`text-xs ${goalCount > 450 ? "text-orange-500" : goalCount > 500 ? "text-red-500" : "text-gray-400"}`}
                >
                  {goalCount}/500
                </span>
              </div>
              {state?.errors?.goal && (
                <p id="goal-error" className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {state.errors.goal.join(", ")}
                </p>
              )}
            </div>

            {/* Behavior Instructions */}
            <div className="space-y-2">
              <Label
                htmlFor="behavior"
                className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300"
              >
                <Brain className="h-4 w-4 text-purple-600" />
                Behavior & Instructions
                <span className="text-xs text-gray-500 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="behavior"
                name="behavior"
                value={behavior}
                onChange={(e) => setBehavior(e.target.value)}
                placeholder="Define the agent's personality, communication style, decision-making approach, and any specific constraints or guidelines it should follow."
                maxLength={1000}
                className="min-h-[140px] transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                aria-describedby="behavior-error behavior-help"
              />
              <div className="flex justify-between items-center">
                <p id="behavior-help" className="text-xs text-gray-500 dark:text-gray-400">
                  Customize personality, tone, and operational guidelines
                </p>
                <span
                  className={`text-xs ${behaviorCount > 900 ? "text-orange-500" : behaviorCount > 1000 ? "text-red-500" : "text-gray-400"}`}
                >
                  {behaviorCount}/1000
                </span>
              </div>
              {state?.errors?.behavior && (
                <p id="behavior-error" className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {state.errors.behavior.join(", ")}
                </p>
              )}
            </div>

            {/* Parent Agent */}
            <div className="space-y-2">
              <Label
                htmlFor="parent_agent_id"
                className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300"
              >
                <Users className="h-4 w-4 text-indigo-600" />
                Parent Agent
                <span className="text-xs text-gray-500 font-normal">(Optional)</span>
              </Label>
              <Select
                name="parent_agent_id"
                value={parentAgentId || "none"}
                onValueChange={(value) => setParentAgentId(value === "none" ? null : value)}
                disabled={isPending}
              >
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <SelectValue placeholder="Select a parent agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      No Parent Agent
                    </span>
                  </SelectItem>
                  {userAgents
                    .filter((agent) => agent.id !== agentId) // Don't allow self-parenting
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          {agent.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create hierarchical relationships for coordinated agent workflows
              </p>
              {state?.errors?.parent_agent_id && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {state.errors.parent_agent_id.join(", ")}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
              <Button
                type="submit"
                disabled={isPending || !hasChanges}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                  className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  Cancel
                </Button>
              )}
              {hasChanges && !isPending && (
                <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></div>
                  Unsaved changes
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
