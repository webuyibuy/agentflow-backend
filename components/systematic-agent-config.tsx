"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle,
  Circle,
  ArrowRight,
  MessageSquare,
  Brain,
  Rocket,
  Lightbulb,
  AlertTriangle,
  Loader2,
  ListChecks,
  ClipboardList,
  Zap,
  CheckCheck,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react"
import type {
  ConfigurationStage,
  SmartQuestion,
  UserAnswer,
  GeneratedPlan,
  AIConsultationMessage,
  AgentTask,
} from "@/lib/systematic-flow-types"
import {
  generateSmartQuestions,
  submitAnswersAndGeneratePlan,
  consultWithAI,
  finalizeAndDeployAgent,
} from "@/app/onboarding/agent-config/systematic-actions"
import { useRouter } from "next/navigation"

const phase1Stages: ConfigurationStage[] = [
  {
    id: "requirements",
    name: "Requirements Gathering",
    description: "Smart questions to understand your needs",
    status: "active",
  },
  {
    id: "planning",
    name: "Strategic Planning",
    description: "AI generates comprehensive plan",
    status: "pending",
    dependencies: ["requirements"],
  },
  {
    id: "consultation",
    name: "AI Consultation",
    description: "Deep dive and refine your plan",
    status: "pending",
    dependencies: ["planning"],
  },
]

const phase2Stages: ConfigurationStage[] = [
  {
    id: "deploy",
    name: "Review & Deploy",
    description: "Final review, agent deployment & task generation",
    status: "pending",
    dependencies: ["consultation"],
  },
]

const allStages = [...phase1Stages, ...phase2Stages]

interface SystematicAgentConfigProps {
  goalPrimer: string
}

interface DeploymentStatus {
  working: string[]
  needsAttention: string[]
  dependencyTasks: AgentTask[]
}

const SystematicAgentConfig: React.FC<SystematicAgentConfigProps> = ({ goalPrimer }) => {
  const router = useRouter()
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1)
  const [currentStage, setCurrentStage] = useState<string>("requirements")
  const [stageStatuses, setStageStatuses] = useState<Record<string, "pending" | "active" | "completed">>({
    requirements: "active",
    planning: "pending",
    consultation: "pending",
    deploy: "pending",
  })

  // Requirements stage
  const [questions, setQuestions] = useState<SmartQuestion[]>([])
  const [answers, setAnswers] = useState<UserAnswer[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  // Planning stage
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Consultation stage
  const [consultationMessages, setConsultationMessages] = useState<AIConsultationMessage[]>([])
  const [consultationInput, setConsultationInput] = useState("")
  const [loadingConsultation, setLoadingConsultation] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<AgentTask[]>([])

  // Deploy stage
  const [deploying, setDeploying] = useState(false)
  const [deployedAgentId, setDeployedAgentId] = useState<string | null>(null)
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null)

  const [error, setError] = useState<string | null>(null)

  // Load initial questions
  useEffect(() => {
    if (currentPhase === 1 && currentStage === "requirements" && questions.length === 0) {
      loadSmartQuestions()
    }
  }, [currentPhase, currentStage])

  const loadSmartQuestions = async () => {
    setLoadingQuestions(true)
    setError(null)

    try {
      const result = await generateSmartQuestions(goalPrimer, answers)
      if (result.success && result.questions) {
        setQuestions(result.questions)
      } else {
        setError(result.error || "Failed to generate questions")
      }
    } catch (err) {
      setError("Failed to load questions")
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string | string[] | boolean) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) => (a.questionId === questionId ? { ...a, answer, timestamp: new Date() } : a))
      } else {
        return [...prev, { questionId, answer, timestamp: new Date() }]
      }
    })
  }

  const completeRequirementsAndGeneratePlan = async () => {
    setLoadingPlan(true)
    setError(null)

    try {
      const result = await submitAnswersAndGeneratePlan(answers)
      if (result.success && result.plan) {
        setPlan(result.plan)
        setStageStatuses((prev) => ({
          ...prev,
          requirements: "completed",
          planning: "completed",
          consultation: "active",
        }))
        setCurrentStage("consultation")

        // Add welcome message to consultation
        const welcomeMessage: AIConsultationMessage = {
          id: `msg_welcome_${Date.now()}`,
          role: "assistant",
          content: `Great! I've analyzed your requirements and created a strategic plan. Let's discuss it in detail. I can help you refine the approach, identify potential challenges, and create specific action items. What aspects of the plan would you like to explore first?`,
          timestamp: new Date(),
          relatedQuestions: [
            "What concerns do you have about the timeline?",
            "Are there any technical constraints we should consider?",
            "How does this align with your budget expectations?",
          ],
        }
        setConsultationMessages([welcomeMessage])
      } else {
        setError(result.error || "Failed to generate plan")
      }
    } catch (err) {
      setError("Failed to create plan")
    } finally {
      setLoadingPlan(false)
    }
  }

  const sendConsultationMessage = async () => {
    if (!consultationInput.trim() || !plan) return

    setLoadingConsultation(true)
    setError(null)

    const userMessage: AIConsultationMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: consultationInput,
      timestamp: new Date(),
    }

    setConsultationMessages((prev) => [...prev, userMessage])
    setConsultationInput("")

    try {
      const result = await consultWithAI(consultationInput, plan.id, [...consultationMessages])
      if (result.success && result.response) {
        setConsultationMessages((prev) => [...prev, result.response!])

        // Add generated tasks to the list
        if (result.generatedTasks && result.generatedTasks.length > 0) {
          setGeneratedTasks((prev) => [...prev, ...result.generatedTasks!])
        }

        // Update plan if needed
        if (result.planUpdates) {
          setPlan((prev) => (prev ? { ...prev, ...result.planUpdates } : null))
        }
      } else {
        setError(result.error || "Failed to consult with AI")
      }
    } catch (err) {
      setError("Failed to send message")
    } finally {
      setLoadingConsultation(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setConsultationInput(question)
  }

  const finalizePhase1AndProceedToPhase2 = () => {
    setStageStatuses((prev) => ({
      ...prev,
      consultation: "completed",
      deploy: "active",
    }))
    setCurrentStage("deploy")
    setCurrentPhase(2)
  }

  const deployAgentAndGenerateTasks = async () => {
    if (!plan) return

    setDeploying(true)
    setError(null)

    try {
      const result = await finalizeAndDeployAgent(plan.id)
      if (result.success && result.agentId) {
        setDeployedAgentId(result.agentId)
        setDeploymentStatus(result.deploymentStatus || null)
        setStageStatuses((prev) => ({
          ...prev,
          deploy: "completed",
        }))
      } else {
        setError(result.error || "Failed to deploy agent")
      }
    } catch (err) {
      setError("Failed to deploy agent")
    } finally {
      setDeploying(false)
    }
  }

  const getOverallProgress = () => {
    const completed = Object.values(stageStatuses).filter((status) => status === "completed").length
    return (completed / allStages.length) * 100
  }

  const renderQuestionInput = (question: SmartQuestion) => {
    const currentAnswer = answers.find((a) => a.questionId === question.id)?.answer
    switch (question.type) {
      case "text":
        return (
          <Textarea
            placeholder="Enter your answer..."
            value={(currentAnswer as string) || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="min-h-[100px]"
          />
        )
      case "select":
        return (
          <Select
            value={(currentAnswer as string) || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "multiselect":
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={((currentAnswer as string[]) || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const current = (currentAnswer as string[]) || []
                    if (checked) {
                      handleAnswerChange(question.id, [...current, option])
                    } else {
                      handleAnswerChange(
                        question.id,
                        current.filter((item) => item !== option),
                      )
                    }
                  }}
                />
                <label htmlFor={`${question.id}-${option}`} className="text-xs">
                  {option}
                </label>
              </div>
            ))}
          </div>
        )
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={question.id}
              checked={(currentAnswer as boolean) || false}
              onCheckedChange={(checked) => handleAnswerChange(question.id, Boolean(checked))}
            />
            <label htmlFor={question.id} className="text-xs">
              Yes
            </label>
          </div>
        )
      default:
        return null
    }
  }

  const renderStages = (stagesToRender: ConfigurationStage[]) => (
    <div className="flex items-center justify-between">
      {stagesToRender.map((stage, index) => (
        <div key={stage.id} className="flex items-center">
          <div className="flex items-center gap-2">
            {stageStatuses[stage.id] === "completed" ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : stageStatuses[stage.id] === "active" ? (
              <Circle className="h-6 w-6 text-blue-500 fill-current" />
            ) : (
              <Circle className="h-6 w-6 text-gray-300" />
            )}
            <div>
              <div className="font-medium text-xs">{stage.name}</div>
              <div className="text-xs text-gray-500">{stage.description}</div>
            </div>
          </div>
          {index < stagesToRender.length - 1 && <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />}
        </div>
      ))}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Systematic Agent Configuration: Phase {currentPhase} of 2
          </CardTitle>
          <CardDescription>
            {currentPhase === 1
              ? "Phase 1: Intelligent Configuration & Strategic Planning"
              : "Phase 2: Deployment & Actionable Task Distribution"}
          </CardDescription>
          <Progress value={getOverallProgress()} className="w-full mt-2" />
        </CardHeader>
      </Card>

      {/* Stage Navigation */}
      {currentPhase === 1 && renderStages(phase1Stages)}
      {currentPhase === 2 && renderStages(phase2Stages)}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Phase 1 Content */}
      {currentPhase === 1 && (
        <>
          {currentStage === "requirements" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Requirements Gathering
                </CardTitle>
                <CardDescription>Answer these smart questions to help us understand your needs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingQuestions ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    <p className="mt-2 text-xs text-gray-500">Generating smart questions...</p>
                  </div>
                ) : (
                  <>
                    {questions.map((question) => (
                      <div key={question.id} className="space-y-3 p-4 border rounded-lg shadow-xs bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{question.question}</h4>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {question.category}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${question.priority === "high" ? "border-red-500 text-red-600" : question.priority === "medium" ? "border-yellow-500 text-yellow-600" : "border-green-500 text-green-600"}`}
                              >
                                {question.priority} priority
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {renderQuestionInput(question)}
                      </div>
                    ))}
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={loadSmartQuestions} disabled={loadingQuestions}>
                        {loadingQuestions ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Lightbulb className="mr-2 h-4 w-4" />
                        )}
                        More Questions
                      </Button>
                      <Button
                        onClick={completeRequirementsAndGeneratePlan}
                        disabled={answers.length === 0 || loadingPlan}
                      >
                        {loadingPlan ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ClipboardList className="mr-2 h-4 w-4" />
                        )}
                        Generate Plan
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {currentStage === "consultation" && plan && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-indigo-500" />
                    Strategic Plan Overview
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-700">Objectives</h4>
                      <ul className="space-y-1 list-disc list-inside text-xs text-gray-600">
                        {plan.objectives.map((obj, index) => (
                          <li key={index}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-700">Required Resources</h4>
                      <ul className="space-y-1 text-xs">
                        {plan.resources.map((resource, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Badge variant={resource.configured ? "default" : "secondary"}>{resource.type}</Badge>
                            <span className="text-gray-600">{resource.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Tasks Display */}
              {generatedTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Generated Tasks from Consultation
                    </CardTitle>
                    <CardDescription>Tasks automatically created based on our conversation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {generatedTasks.map((task) => (
                        <div key={task.id} className="p-3 border rounded-lg bg-orange-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-800">{task.title}</h5>
                              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {task.priority} priority
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {task.category}
                                </Badge>
                                {task.requiresApproval && (
                                  <Badge variant="destructive" className="text-xs">
                                    Requires Approval
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-teal-500" />
                    AI Strategy Consultant
                    <Badge variant="outline" className="text-xs">
                      Real-time Intelligence
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Discuss your plan with our AI expert. Tasks will be automatically generated from our conversation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="max-h-96 overflow-y-auto space-y-3 p-4 border rounded-lg bg-gray-50 shadow-inner">
                      {consultationMessages.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">AI consultant is ready to help...</p>
                      ) : (
                        consultationMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg shadow-xs ${message.role === "user" ? "bg-blue-100 ml-auto max-w-[80%]" : "bg-white mr-auto max-w-[80%]"}`}
                          >
                            <div className="font-semibold text-xs mb-1 text-gray-800">
                              {message.role === "user" ? "You" : "AI Strategy Consultant"}
                            </div>
                            <div className="text-xs text-gray-700">{message.content}</div>
                            {message.relatedQuestions && message.role === "assistant" && (
                              <div className="mt-2 space-x-1 space-y-1">
                                {message.relatedQuestions.map((q, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => handleQuickQuestion(q)}
                                  >
                                    {q}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {loadingConsultation && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">AI is thinking...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask about your plan, request changes, or discuss implementation details..."
                        value={consultationInput}
                        onChange={(e) => setConsultationInput(e.target.value)}
                        className="flex-1"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            sendConsultationMessage()
                          }
                        }}
                      />
                      <Button
                        onClick={sendConsultationMessage}
                        disabled={!consultationInput.trim() || loadingConsultation}
                      >
                        {loadingConsultation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send
                      </Button>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={finalizePhase1AndProceedToPhase2} size="lg">
                        Finalize Plan & Proceed to Deployment (Phase 2) <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Phase 2 Content - Enhanced Deployment */}
      {currentPhase === 2 && currentStage === "deploy" && plan && (
        <div className="space-y-6">
          {!deployedAgentId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-purple-500" />
                  Ready for Deployment
                </CardTitle>
                <CardDescription>
                  Your agent configuration is complete. Deploy to see what's working and what needs attention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-gray-50 shadow-xs">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Final Plan Summary: {plan.title}</h3>
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Timeline</h4>
                      <div className="space-y-1 text-xs text-gray-600">
                        {plan.timeline.map((phase, index) => (
                          <div key={index}>
                            <strong>{phase.phase}:</strong> {phase.duration}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Success Metrics</h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                        {plan.successMetrics.map((metric, index) => (
                          <li key={index}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Show consultation-generated tasks */}
                {generatedTasks.length > 0 && (
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-semibold mb-2 text-gray-800 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                      Tasks Generated from AI Consultation ({generatedTasks.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {generatedTasks.map((task) => (
                        <div key={task.id} className="text-xs">
                          <strong>{task.title}</strong> - {task.priority} priority
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={deployAgentAndGenerateTasks}
                    disabled={deploying}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {deploying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="mr-2 h-4 w-4" />
                    )}
                    Deploy Agent & Analyze System
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Deployment Success with Status Analysis
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-5 w-5" />
                <AlertTitle>🎉 Deployment Successful!</AlertTitle>
                <AlertDescription>
                  Agent deployed successfully! Agent ID: <strong>{deployedAgentId}</strong>
                </AlertDescription>
              </Alert>

              {deploymentStatus && (
                <>
                  {/* What's Working */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCheck className="h-5 w-5 text-green-500" />✅ What's Working
                      </CardTitle>
                      <CardDescription>Systems and components that are operational</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {deploymentStatus.working.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs text-green-800">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Needs Attention */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-orange-500" />🔧 Needs Attention
                      </CardTitle>
                      <CardDescription>
                        Areas that require configuration or completion to optimize performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {deploymentStatus.needsAttention.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            <span className="text-xs text-orange-800">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dependency Tasks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-blue-500" />📋 Tasks Added to Dependency Basket
                      </CardTitle>
                      <CardDescription>
                        {deploymentStatus.dependencyTasks.length} tasks have been automatically added to help you
                        complete the setup
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {deploymentStatus.dependencyTasks.map((task) => (
                          <div key={task.id} className="p-3 border rounded-lg bg-blue-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-xs text-gray-800">{task.title}</h5>
                                <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {task.priority} priority
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {task.category}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Next Steps */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />🎯 Next Steps
                      </CardTitle>
                      <CardDescription>Recommended actions to get the most out of your agent</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600">1</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-xs">Review Dependency Basket</h4>
                            <p className="text-xs text-gray-600">
                              Start with high-priority tasks to unlock your agent's full potential
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600">2</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-xs">Configure Missing Components</h4>
                            <p className="text-xs text-gray-600">
                              Complete the "Needs Attention" items for optimal performance
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600">3</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-xs">Monitor & Iterate</h4>
                            <p className="text-xs text-gray-600">
                              Track progress and refine your agent based on results
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => router.push("/dashboard/dependencies")} className="flex-1" size="lg">
                      <ListChecks className="mr-2 h-4 w-4" />
                      Go to Dependency Basket
                    </Button>
                    <Button
                      onClick={() => router.push(`/dashboard/agents/${deployedAgentId}`)}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Agent Dashboard
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SystematicAgentConfig
