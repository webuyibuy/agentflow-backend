"use client"

import type React from "react"

import { useState, useActionState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createAgentAction } from "@/app/dashboard/agents/new/actions"
import { Bot, Loader2, AlertTriangle, CheckCircle } from "lucide-react"

interface SimpleAgentCreatorProps {
  userId: string
}

export default function SimpleAgentCreator({ userId }: SimpleAgentCreatorProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
  })

  const [createState, createAction, isCreating] = useActionState(createAgentAction, undefined)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.goal.trim()) return

    const form = new FormData()
    form.append("name", formData.name.trim())
    form.append("goal", formData.goal.trim())
    createAction(form)
  }

  // Handle successful creation
  if (createState?.success && createState?.agentId) {
    router.push(`/dashboard/agents/${createState.agentId}?created=true`)
    return null
  }

  const isFormValid = formData.name.trim().length >= 3 && formData.goal.trim().length >= 10

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Bot className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>What should your agent work on?</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {createState?.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{createState.error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sales Assistant, Content Creator, Research Helper"
              disabled={isCreating}
            />
            <p className="text-sm text-gray-500">Give your agent a clear, descriptive name</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">What should this agent accomplish?</Label>
            <Textarea
              id="goal"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              placeholder="e.g., Generate 20 qualified leads per week by researching prospects and sending personalized outreach messages"
              rows={4}
              disabled={isCreating}
            />
            <p className="text-sm text-gray-500">
              Be specific about what you want to achieve. The agent will break this down into actionable tasks.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">What happens next:</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• Your agent will immediately start analyzing your goal</li>
                  <li>• It will create specific tasks and start working on them</li>
                  <li>• When it needs your help, it will create dependencies for you</li>
                  <li>• You'll see real-time updates of what it's thinking and doing</li>
                </ul>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!isFormValid || isCreating} size="lg">
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Your Agent...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Create Agent & Start Working
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
