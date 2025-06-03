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
  Lightbulb,
  AlertTriangle,
  Loader2,
  ClipboardList,
  Target,
  TrendingUp,
  Shield,
  Zap,
  Users,
  DollarSign,
  Clock,
  Star,
} from "lucide-react"
import type {
  ConfigurationStage,
  SmartQuestion,
  UserAnswer,
  GeneratedPlan,
  AIConsultationMessage,
} from "@/lib/systematic-flow-types"
import {
  generateSmartQuestions,
  analyzeAnswersAndGeneratePlan,
  consultWithAI,
  validatePlanReadiness,
} from "@/app/onboarding/agent-config/phase1-actions"

const phase1Stages: ConfigurationStage[] = [
  {
    id: "requirements",
    name: "Smart Discovery",
    description: "AI-driven requirements gathering",
    status: "active",
  },
  {
    id: "planning",
    name: "Strategic Planning",
    description: "Comprehensive plan generation",
    status: "pending",
    dependencies: ["requirements"],
  },
  {
    id: "consultation",
    name: "Expert Consultation",
    description: "Refine and validate your plan",
    status: "pending",
    dependencies: ["planning"],
  },
]

interface Phase1AgentConfigProps {
  goalPrimer: string
  onPhase1Complete: (plan: GeneratedPlan) => void
}

const Phase1AgentConfig: React.FC<Phase1AgentConfigProps> = ({ goalPrimer, onPhase1Complete }) => {
  const [currentStage, setCurrentStage] = useState<string>("requirements")
  const [stageStatuses, setStageStatuses] = useState<Record<string, "pending" | "active" | "completed">>({
    requirements: "active",
    planning: "pending",
    consultation: "pending",
  })

  // Requirements stage
  const [questions, setQuestions] = useState<SmartQuestion[]>([])
  const [answers, setAnswers] = useState<UserAnswer[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questionRound, setQuestionRound] = useState(1)

  // Planning stage
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Consultation stage
  const [consultationMessages, setConsultationMessages] = useState<AIConsultationMessage[]>([])
  const [consultationInput, setConsultationInput] = useState("")
  const [loadingConsultation, setLoadingConsultation] = useState(false)

  // Validation
  const [planValidation, setPlanValidation] = useState<{
    ready: boolean
    issues?: string[]
    recommendations?: string[]
  } | null>(null)

  const [error, setError] = useState<string | null>(null)

  // Load initial questions
  useEffect(() => {
    if (currentStage === "requirements" && questions.length === 0) {
      loadSmartQuestions()
    }
  }, [currentStage])

  const loadSmartQuestions = async () => {
    setLoadingQuestions(true)
    setError(null)

    try {
      const result = await generateSmartQuestions(goalPrimer, answers, questionRound)
      if (result.success && result.questions) {
        setQuestions((prev) => [...prev, ...result.questions!])
      } else {
        setError(result.error || "Failed to generate questions")
      }
    } catch (err) {
      setError("Failed to load questions")
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string | string[] | boolean | number) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) => (a.questionId === questionId ? { ...a, answer, timestamp: new Date() } : a))
      } else {
        return [...prev, { questionId, answer, timestamp: new Date() }]
      }
    })
  }

  const generateMoreQuestions = async () => {
    setQuestionRound((prev) => prev + 1)
    await loadSmartQuestions()
  }

  const proceedToPlanning = async () => {
    setLoadingPlan(true)
    setError(null)

    try {
      const result = await analyzeAnswersAndGeneratePlan(answers, goalPrimer)
      if (result.success && result.plan) {
        setPlan(result.plan)
        setStageStatuses((prev) => ({
          ...prev,
          requirements: "completed",
          planning: "completed",
          consultation: "active",
        }))
        setCurrentStage("consultation")

        // Show a brief success message
        setTimeout(() => {
          setError(null)
        }, 100)

        // Validate the plan
        const validation = await validatePlanReadiness(result.plan)
        if (validation.success) {
          setPlanValidation(validation)
        }
      } else {
        setError(result.error || "Failed to generate strategic plan")
      }
    } catch (err) {
      setError("Failed to create strategic plan")
    } finally {
      setLoadingPlan(false)
    }
  }

  const sendConsultationMessage = async () => {
    if (!consultationInput.trim() || !plan) return

    setLoadingConsultation(true)

    const userMessage: AIConsultationMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: consultationInput,
      timestamp: new Date(),
    }

    setConsultationMessages((prev) => [...prev, userMessage])
    setConsultationInput("")

    try {
      const result = await consultWithAI(consultationInput, plan.id, plan, consultationMessages)
      if (result.success && result.response) {
        setConsultationMessages((prev) => [...prev, result.response!])
        if (result.planUpdates) {
          const updatedPlan = { ...plan, ...result.planUpdates }
          setPlan(updatedPlan)

          // Re-validate updated plan
          const validation = await validatePlanReadiness(updatedPlan)
          if (validation.success) {
            setPlanValidation(validation)
          }
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

  const completePhase1 = () => {
    if (plan && planValidation?.ready) {
      try {
        console.log("Completing Phase 1 with plan:", plan.id)
        onPhase1Complete(plan)
      } catch (err) {
        console.error("Error completing Phase 1:", err)
        setError("Failed to proceed to Phase 2. Please try again.")
      }
    }
  }

  const getProgress = () => {
    const completed = Object.values(stageStatuses).filter((status) => status === "completed").length
    return (completed / phase1Stages.length) * 100
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "business":
        return <Target className="h-4 w-4" />
      case "technical":
        return <Zap className="h-4 w-4" />
      case "workflow":
        return <Users className="h-4 w-4" />
      case "security":
        return <Shield className="h-4 w-4" />
      case "performance":
        return <TrendingUp className="h-4 w-4" />
      case "integration":
        return <Brain className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
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
                <label htmlFor={`${question.id}-${option}`} className="text-sm">
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
            <label htmlFor={question.id} className="text-sm">
              Yes
            </label>
          </div>
        )
      default:
        return null
    }
  }

  const canProceedToPlanning =
    answers.length >= Math.min(3, questions.length) &&
    answers.every((answer) => {
      if (typeof answer.answer === "string") {
        return answer.answer.trim().length > 0
      }
      return answer.answer !== null && answer.answer !== undefined
    })

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Progress Header */}
      <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Brain className="h-6 w-6 text-blue-600" />
            Phase 1: Intelligent Configuration & Strategic Planning
          </CardTitle>
          <CardDescription className="text-base">
            AI-driven discovery and strategic planning for your perfect agent
          </CardDescription>
          <Progress value={getProgress()} className="w-full mt-3 h-2" />
          <div className="text-sm text-gray-600 mt-1">
            {Math.round(getProgress())}% Complete • {answers.length} insights gathered
          </div>
        </CardHeader>
      </Card>

      {/* Stage Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        {phase1Stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <div className="flex items-center gap-3">
              {stageStatuses[stage.id] === "completed" ? (
                <CheckCircle className="h-7 w-7 text-green-500" />
              ) : stageStatuses[stage.id] === "active" ? (
                <Circle className="h-7 w-7 text-blue-500 fill-current" />
              ) : (
                <Circle className="h-7 w-7 text-gray-300" />
              )}
              <div>
                <div className="font-semibold text-sm">{stage.name}</div>
                <div className="text-xs text-gray-500">{stage.description}</div>
              </div>
            </div>
            {index < phase1Stages.length - 1 && <ArrowRight className="h-5 w-5 text-gray-400 mx-6" />}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Requirements Stage */}
      {currentStage === "requirements" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Smart Discovery Session
            </CardTitle>
            <CardDescription>
              Our AI will ask strategic questions to understand your business needs and technical requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingQuestions ? (
              <div className="text-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                <p className="mt-3 text-gray-600">Generating intelligent questions...</p>
                <p className="text-sm text-gray-500">Round {questionRound}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6">
                  {questions.map((question) => (
                    <Card key={question.id} className="border-l-4 border-l-blue-500 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 mb-2">{question.question}</h4>
                            {question.context && (
                              <p className="text-sm text-gray-600 mb-3 italic">{question.context}</p>
                            )}
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                {getCategoryIcon(question.category)}
                                {question.category}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  question.priority === "high"
                                    ? "border-red-500 text-red-600"
                                    : question.priority === "medium"
                                      ? "border-yellow-500 text-yellow-600"
                                      : "border-green-500 text-green-600"
                                }`}
                              >
                                {question.priority} priority
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {renderQuestionInput(question)}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-6 border-t">
                  <Button variant="outline" onClick={generateMoreQuestions} disabled={loadingQuestions}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Generate More Questions
                  </Button>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {answers.length} of {questions.length} answered
                    </div>
                    <Button onClick={proceedToPlanning} disabled={!canProceedToPlanning || loadingPlan} size="lg">
                      {loadingPlan ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ClipboardList className="mr-2 h-4 w-4" />
                      )}
                      Generate Strategic Plan
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consultation Stage */}
      {currentStage === "consultation" && plan && (
        <div className="space-y-6">
          {/* Plan Overview */}
          <Card className="border-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-green-600" />
                Strategic Plan: {plan.title}
              </CardTitle>
              <CardDescription className="text-base">{plan.description}</CardDescription>
              <div className="flex gap-4 mt-3">
                <Badge variant="outline" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {plan.estimatedCost || "Cost TBD"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {plan.estimatedTimeToValue || "Timeline TBD"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${
                    plan.complexity === "high"
                      ? "border-red-500 text-red-600"
                      : plan.complexity === "medium"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-green-500 text-green-600"
                  }`}
                >
                  {plan.complexity} complexity
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Objectives
                  </h4>
                  <ul className="space-y-2">
                    {plan.objectives.map((obj, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Success Metrics
                  </h4>
                  <ul className="space-y-2">
                    {plan.successMetrics.map((metric, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Key Risks
                  </h4>
                  <ul className="space-y-2">
                    {plan.risks.slice(0, 3).map((risk, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Validation */}
          {planValidation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Plan Validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {planValidation.ready ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Plan Ready for Implementation</AlertTitle>
                    <AlertDescription>Your strategic plan has been validated and is ready to proceed.</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Plan Needs Attention</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2">
                        {planValidation.issues?.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {planValidation.recommendations && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Recommendations:</h5>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {planValidation.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Consultation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-teal-500" />
                Expert AI Consultation
              </CardTitle>
              <CardDescription>
                Discuss your plan with our AI expert to refine and optimize your strategy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-3 p-4 border rounded-lg bg-gray-50 shadow-inner">
                  {consultationMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Start a conversation to refine your strategic plan...</p>
                      <p className="text-sm text-gray-400 mt-1">Ask about implementation, risks, or optimizations</p>
                    </div>
                  ) : (
                    consultationMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg shadow-sm ${
                          message.role === "user"
                            ? "bg-blue-100 ml-auto max-w-[80%] border-l-4 border-l-blue-500"
                            : "bg-white mr-auto max-w-[80%] border-l-4 border-l-green-500"
                        }`}
                      >
                        <div className="font-semibold text-sm mb-2 text-gray-800">
                          {message.role === "user" ? "You" : "AI Strategy Expert"}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</div>

                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-gray-600 mb-1">Suggestions:</div>
                            <ul className="list-disc list-inside text-xs text-gray-600">
                              {message.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {message.relatedQuestions && message.role === "assistant" && (
                          <div className="mt-3 space-x-1 space-y-1">
                            <div className="text-xs font-medium text-gray-600 mb-1">Follow-up questions:</div>
                            {message.relatedQuestions.map((q, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => setConsultationInput(q)}
                              >
                                {q}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ask about implementation strategy, potential risks, resource optimization, or any other aspect of your plan..."
                    value={consultationInput}
                    onChange={(e) => setConsultationInput(e.target.value)}
                    className="flex-1"
                    rows={3}
                  />
                  <Button
                    onClick={sendConsultationMessage}
                    disabled={!consultationInput.trim() || loadingConsultation}
                    className="self-end"
                  >
                    {loadingConsultation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send
                  </Button>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={(e) => {
                      e.preventDefault()
                      completePhase1()
                    }}
                    disabled={!planValidation?.ready}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete Phase 1 & Proceed to Deployment
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Phase1AgentConfig
