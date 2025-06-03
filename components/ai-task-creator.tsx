"use client"

import { useState } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Brain, Sparkles, CheckCircle, AlertTriangle, Target, ListTodo } from 'lucide-react'
import { createTasksWithAI } from "@/app/dashboard/agents/[id]/ai-task-actions"

interface AITaskCreatorProps {
  agentId: string
  agentName: string
  agentGoal: string
}

export default function AITaskCreator({ agentId, agentName, agentGoal }: AITaskCreatorProps) {
  const [userInput, setUserInput] = useState("")
  const [state, action, isPending] = useActionState(createTasksWithAI.bind(null, agentId), undefined)

  const handleSubmit = (formData: FormData) => {
    if (!userInput.trim()) return
    action(formData)
  }

  return (
    <Card className="bg-white/70 backdrop-blur-md border-gray-200/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Brain className="h-5 w-5 text-white" />
          </div>
          AI Task Creator
          <Badge variant="secondary" className="bg-blue-100/80 text-blue-800 border-blue-200/50">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by OpenAI
          </Badge>
        </CardTitle>
        <CardDescription className="text-gray-600">
          Describe what you need {agentName} to work on, and AI will create a comprehensive task breakdown with
          dependencies.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Agent Context */}
        <div className="p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Agent Goal</span>
          </div>
          <p className="text-sm text-blue-700">{agentGoal}</p>
        </div>

        {/* User Input Form */}
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="userInput" className="text-sm font-medium text-gray-700">
              What do you need the agent to work on?
            </label>
            <Textarea
              id="userInput"
              name="userInput"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="e.g., Create a marketing campaign for our new product launch, Research competitors in the SaaS space, Develop a content strategy for Q1..."
              className="min-h-[120px] bg-white/50 backdrop-blur-sm border-gray-200/50 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all duration-200"
              disabled={isPending}
              required
            />
            <div className="flex justify-between items-center">
              <span className={`text-xs ${userInput.length > 450 ? 'text-orange-600' : 'text-gray-500'}`}>
                {userInput.length}/500 characters
              </span>
              <span className="text-xs text-gray-500">Be specific for better AI analysis</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || !userInput.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                AI is analyzing your request...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Create Tasks with AI
              </>
            )}
          </Button>
        </form>

        {/* Results */}
        {state?.success && (
          <Alert className="bg-green-50/80 border-green-200/50 backdrop-blur-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Tasks Created Successfully!</AlertTitle>
            <AlertDescription className="text-green-700 space-y-2">
              <p>{state.message}</p>
              {state.createdDependencies && state.createdDependencies > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <ListTodo className="h-4 w-4" />
                  <span className="text-sm">
                    {state.createdDependencies} dependencies added to your{" "}
                    <a href="/dashboard/dependencies" className="underline font-medium">
                      Dependencies basket
                    </a>
                  </span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {state?.error && (
          <Alert variant="destructive" className="bg-red-50/80 border-red-200/50 backdrop-blur-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Creating Tasks</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* AI Analysis Results */}
        {state?.userNeedAnalysis && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50/80 backdrop-blur-sm rounded-xl border border-purple-200/50">
              <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Need Analysis
              </h4>
              <p className="text-sm text-purple-700">{state.userNeedAnalysis}</p>
            </div>

            {state.recommendedFlow && state.recommendedFlow.length > 0 && (
              <div className="p-4 bg-orange-50/80 backdrop-blur-sm rounded-xl border border-orange-200/50">
                <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Recommended Flow
                </h4>
                <ol className="text-sm text-orange-700 space-y-1">
                  {state.recommendedFlow.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-200 text-orange-800 rounded-full text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            💡 <strong>Tip:</strong> The more specific you are, the better AI can understand your needs
          </p>
          <p>
            🔗 <strong>Dependencies:</strong> Tasks requiring your approval will be added to the Dependencies basket
          </p>
          <p>
            🎯 <strong>Smart Analysis:</strong> AI considers your agent's goal and existing tasks
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
