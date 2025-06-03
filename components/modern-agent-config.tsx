"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Loader2,
  ClipboardList,
  Target,
  TrendingUp,
  Star,
  Rocket,
  ListChecks,
  CheckCheck,
  ArrowLeft,
  TestTube,
  Upload,
  FileText,
  ImageIcon,
  Edit3,
  Sparkles,
  Brain,
  Settings,
} from "lucide-react"
import type {
  SmartQuestion,
  UserAnswer,
  GeneratedPlan,
  AIConsultationMessage,
  DeploymentResult,
} from "@/lib/systematic-flow-types"
import {
  generateSmartQuestions,
  submitAnswersAndGeneratePlan,
  consultWithAI,
  finalizeAndDeployAgent,
} from "@/app/onboarding/agent-config/systematic-actions"
import { useRouter, useSearchParams } from "next/navigation"
import { agentTemplates } from "@/lib/agent-templates"

interface ModernAgentConfigProps {
  goalPrimer: string
}

type Step = "discovery" | "consultation" | "planning" | "configuration" | "deployment" | "complete"

const steps = [
  { id: "discovery", name: "Discovery", description: "Smart questions" },
  { id: "consultation", name: "AI Consultation", description: "Multimodal planning" },
  { id: "planning", name: "Strategy Plan", description: "Review & modify" },
  { id: "configuration", name: "Configuration", description: "Agent setup" },
  { id: "deployment", name: "Deployment", description: "Go live" },
]

const ModernAgentConfig: React.FC<ModernAgentConfigProps> = ({ goalPrimer }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")

  // Get template info
  const selectedTemplate = templateId ? agentTemplates.find((t) => t.id === templateId) : null

  const [currentStep, setCurrentStep] = useState<Step>("discovery")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Discovery state
  const [questions, setQuestions] = useState<SmartQuestion[]>([])
  const [answers, setAnswers] = useState<UserAnswer[]>([])
  const [questionRound, setQuestionRound] = useState(1)

  // Consultation state (moved before planning)
  const [consultationMessages, setConsultationMessages] = useState<AIConsultationMessage[]>([])
  const [consultationInput, setConsultationInput] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // Planning state
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const [planEdits, setPlanEdits] = useState<Partial<GeneratedPlan>>({})

  // Configuration state
  const [agentName, setAgentName] = useState("")
  const [agentDescription, setAgentDescription] = useState("")
  const [agentPersonality, setAgentPersonality] = useState("")
  const [agentTone, setAgentTone] = useState("")
  const [isAdvancedConfig, setIsAdvancedConfig] = useState(false)

  // Deployment state
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null)

  // Initialize with template-specific data
  useEffect(() => {
    if (selectedTemplate) {
      setAgentName(selectedTemplate.name)
      setAgentDescription(selectedTemplate.description)
      setAgentPersonality(selectedTemplate.defaultPersonality || "Professional and helpful")
      setAgentTone(selectedTemplate.defaultTone || "Friendly")
    }
  }, [selectedTemplate])

  // Initialize questions
  useEffect(() => {
    if (currentStep === "discovery" && questions.length === 0) {
      loadInitialQuestions()
    }
  }, [currentStep])

  useEffect(() => {
    if (plan) {
      setAgentName(plan.title || selectedTemplate?.name || "My AI Agent")
      setAgentDescription(plan.description || selectedTemplate?.description || "")
    }
  }, [plan, selectedTemplate])

  const loadInitialQuestions = useCallback(async () => {
    console.log("🔄 Loading initial questions...")
    setIsLoading(true)
    setError(null)

    try {
      const templateContext = selectedTemplate
        ? {
            templateName: selectedTemplate.name,
            templateCategory: selectedTemplate.category,
            templateDescription: selectedTemplate.description,
            templateTags: selectedTemplate.tags,
          }
        : null

      const result = await generateSmartQuestions(goalPrimer, [], 1, templateContext)
      console.log("📥 Question generation result:", result)

      if (result.success && result.questions) {
        console.log("✅ Questions loaded successfully:", result.questions.length)
        setQuestions(result.questions)
      } else {
        console.error("❌ Failed to generate questions:", result.error)
        setError(result.error || "Failed to generate questions")
      }
    } catch (err) {
      console.error("❌ Unexpected error loading questions:", err)
      setError("Failed to load questions. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [goalPrimer, selectedTemplate])

  const handleAnswerChange = useCallback((questionId: string, answer: string | string[] | boolean | number) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) => (a.questionId === questionId ? { ...a, answer, timestamp: new Date() } : a))
      } else {
        return [...prev, { questionId, answer, timestamp: new Date() }]
      }
    })
  }, [])

  const generateMoreQuestions = useCallback(async () => {
    console.log("🔄 Generating more questions...")
    setIsLoading(true)
    setError(null)

    try {
      const templateContext = selectedTemplate
        ? {
            templateName: selectedTemplate.name,
            templateCategory: selectedTemplate.category,
            templateDescription: selectedTemplate.description,
            templateTags: selectedTemplate.tags,
          }
        : null

      const result = await generateSmartQuestions(goalPrimer, answers, questionRound + 1, templateContext)
      console.log("📥 More questions result:", result)

      if (result.success && result.questions) {
        console.log("✅ More questions generated:", result.questions.length)
        setQuestions((prev) => [...prev, ...result.questions!])
        setQuestionRound((prev) => prev + 1)
      } else {
        console.error("❌ Failed to generate more questions:", result.error)
        setError(result.error || "Failed to generate more questions")
      }
    } catch (err) {
      console.error("❌ Unexpected error generating more questions:", err)
      setError("Failed to generate more questions. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [goalPrimer, answers, questionRound, selectedTemplate])

  const proceedToConsultation = useCallback(() => {
    setCurrentStep("consultation")
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }, [])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const sendConsultationMessage = useCallback(async () => {
    if (!consultationInput.trim()) return

    setIsLoading(true)
    const userMessage: AIConsultationMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: consultationInput,
      timestamp: new Date(),
      attachments: uploadedFiles.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    }

    setConsultationMessages((prev) => [...prev, userMessage])
    setConsultationInput("")

    try {
      const templateContext = selectedTemplate
        ? {
            templateName: selectedTemplate.name,
            templateCategory: selectedTemplate.category,
            templateDescription: selectedTemplate.description,
            templateTags: selectedTemplate.tags,
          }
        : null

      const result = await consultWithAI(
        consultationInput,
        "consultation_phase",
        { answers, uploadedFiles, templateContext },
        consultationMessages,
      )

      if (result.success && result.response) {
        setConsultationMessages((prev) => [...prev, result.response!])
      } else {
        setError(result.error || "Failed to consult with AI")
      }
    } catch (err) {
      setError("Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }, [consultationInput, uploadedFiles, answers, consultationMessages, selectedTemplate])

  const proceedToPlanning = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const templateContext = selectedTemplate
        ? {
            templateName: selectedTemplate.name,
            templateCategory: selectedTemplate.category,
            templateDescription: selectedTemplate.description,
            templateTags: selectedTemplate.tags,
          }
        : null

      const result = await submitAnswersAndGeneratePlan(
        answers,
        goalPrimer,
        consultationMessages,
        uploadedFiles,
        templateContext,
      )

      if (result.success && result.plan) {
        setPlan(result.plan)
        setCurrentStep("planning")
      } else {
        setError(result.error || "Failed to generate plan")
      }
    } catch (err) {
      setError("Failed to create strategic plan")
    } finally {
      setIsLoading(false)
    }
  }, [answers, goalPrimer, consultationMessages, uploadedFiles, selectedTemplate])

  const handlePlanEdit = useCallback((field: keyof GeneratedPlan, value: any) => {
    setPlanEdits((prev) => ({ ...prev, [field]: value }))
  }, [])

  const savePlanEdits = useCallback(() => {
    if (plan) {
      setPlan({ ...plan, ...planEdits })
      setPlanEdits({})
      setIsEditingPlan(false)
    }
  }, [plan, planEdits])

  const proceedToConfiguration = useCallback(() => {
    setCurrentStep("configuration")
  }, [])

  const proceedToDeployment = useCallback(() => {
    setCurrentStep("deployment")
  }, [])

  const handleDeploy = useCallback(async () => {
    if (!plan || !agentName.trim()) return
    setIsLoading(true)
    try {
      const agentConfig = {
        name: agentName,
        description: agentDescription,
        personality: agentPersonality,
        tone: agentTone,
        template: selectedTemplate,
        isAdvanced: isAdvancedConfig,
      }

      const result = await finalizeAndDeployAgent(plan.id, agentConfig)
      setDeploymentResult({
        success: result.success,
        agentId: result.agentId,
        tasks: result.tasks,
        error: result.error,
        nextSteps: [
          "Review generated tasks in Dependencies",
          "Configure agent parameters",
          "Test agent functionality",
          "Monitor performance metrics",
        ],
      })
      if (result.success) {
        setCurrentStep("complete")
      }
    } catch (err) {
      setError("Deployment failed")
    } finally {
      setIsLoading(false)
    }
  }, [plan, agentName, agentDescription, agentPersonality, agentTone, selectedTemplate, isAdvancedConfig])

  const goBack = useCallback(() => {
    const stepOrder: Step[] = ["discovery", "consultation", "planning", "configuration", "deployment"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }, [currentStep])

  const getStepIndex = (step: Step) => {
    return steps.findIndex((s) => s.id === step)
  }

  const getCurrentStepIndex = () => {
    return getStepIndex(currentStep)
  }

  const getProgress = () => {
    const currentIndex = getCurrentStepIndex()
    return ((currentIndex + 1) / steps.length) * 100
  }

  const canProceedFromDiscovery = () => {
    return (
      answers.length >= Math.min(3, questions.length) &&
      answers.every((answer) => {
        if (typeof answer.answer === "string") {
          return answer.answer.trim().length > 0
        }
        return answer.answer !== null && answer.answer !== undefined
      })
    )
  }

  const renderQuestionInput = (question: SmartQuestion) => {
    const currentAnswer = answers.find((a) => a.questionId === question.id)?.answer

    switch (question.type) {
      case "text":
        return (
          <Textarea
            placeholder={question.placeholder || "Enter your answer..."}
            value={(currentAnswer as string) || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="min-h-[80px] resize-none"
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
                <label htmlFor={`${question.id}-${option}`} className="text-sm font-medium">
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
            <label htmlFor={question.id} className="text-sm font-medium">
              Yes
            </label>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          {selectedTemplate ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <selectedTemplate.icon className="h-4 w-4" />
                Template-Based Configuration
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Creating {selectedTemplate.name}</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Tailored specifically for {selectedTemplate.category} needs. This template is optimized for{" "}
                {selectedTemplate.description.toLowerCase()}.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                {selectedTemplate.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <TestTube className="h-4 w-4" />
                Custom Agent Configuration
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Create Your Perfect AI Agent</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Follow our intelligent process to build a customized AI agent that meets your specific needs
              </p>
            </div>
          )}
        </div>

        {/* Progress */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">{Math.round(getProgress())}%</span>
            </div>
            <Progress value={getProgress()} className="h-2 mb-6" />

            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index <= getCurrentStepIndex() ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {index < getCurrentStepIndex() ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-medium text-gray-900">{step.name}</div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-4 ${index < getCurrentStepIndex() ? "bg-blue-600" : "bg-gray-200"}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Discovery Step */}
        {currentStep === "discovery" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Smart Discovery
                {selectedTemplate && (
                  <Badge variant="outline" className="ml-2">
                    {selectedTemplate.category}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedTemplate
                  ? `Answer questions tailored for ${selectedTemplate.name} to optimize your agent configuration`
                  : "Answer strategic questions to help us understand your needs"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading && questions.length === 0 ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {selectedTemplate
                      ? `Generating ${selectedTemplate.name}-specific questions...`
                      : "Generating intelligent questions..."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <Card key={question.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {index + 1}. {question.question}
                                </h4>
                                {question.context && <p className="text-sm text-gray-600 mb-3">{question.context}</p>}
                                <div className="flex gap-2 mb-3">
                                  <Badge variant="secondary" className="text-xs">
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
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button variant="outline" onClick={generateMoreQuestions} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Lightbulb className="mr-2 h-4 w-4" />
                      )}
                      More Questions
                    </Button>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {answers.length} of {questions.length} answered
                      </span>
                      <Button onClick={proceedToConsultation} disabled={!canProceedFromDiscovery() || isLoading}>
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        AI Consultation
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Consultation Step (moved before planning) */}
        {currentStep === "consultation" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Strategy Consultant
                {selectedTemplate && (
                  <Badge variant="outline" className="ml-2">
                    {selectedTemplate.category} Expert
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Discuss your vision with our AI expert. Upload supporting materials (documents, images, files) to
                enhance the consultation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chat Interface - moved to top */}
              <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                {consultationMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Start your strategy consultation</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Share your vision, ask questions, or describe specific requirements
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultationMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.role === "user" ? "bg-blue-100 ml-8" : "bg-white mr-8 border"
                        }`}
                      >
                        <div className="font-medium text-sm mb-1">
                          {message.role === "user"
                            ? "You"
                            : selectedTemplate
                              ? `${selectedTemplate.category} AI Expert`
                              : "AI Strategist"}
                        </div>
                        <div className="text-sm">{message.content}</div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            📎 {message.attachments.length} file(s) attached
                          </div>
                        )}
                        {message.relatedQuestions && message.role === "assistant" && (
                          <div className="mt-2 space-y-1">
                            {message.relatedQuestions.map((q, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs mr-2"
                                onClick={() => setConsultationInput(q)}
                              >
                                {q}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder={
                    selectedTemplate
                      ? `Ask our ${selectedTemplate.category} expert about implementation, best practices, or specific requirements...`
                      : "Share your vision, ask questions, or describe specific requirements..."
                  }
                  value={consultationInput}
                  onChange={(e) => setConsultationInput(e.target.value)}
                  className="flex-1 resize-none"
                  rows={2}
                />
                <Button onClick={sendConsultationMessage} disabled={!consultationInput.trim() || isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>

              {/* File Upload Section - moved to bottom */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-1">Supporting Materials</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload documents, images, or files to provide additional context
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </Button>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="font-medium text-gray-900 text-sm">Uploaded Files:</h5>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith("image/") ? (
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={proceedToPlanning}>
                  Generate Strategy Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Planning Step (with edit capabilities) */}
        {currentStep === "planning" && plan && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Strategic Plan
                <Button variant="outline" size="sm" onClick={() => setIsEditingPlan(!isEditingPlan)} className="ml-4">
                  <Edit3 className="h-4 w-4 mr-1" />
                  {isEditingPlan ? "Cancel Edit" : "Edit Plan"}
                </Button>
              </CardTitle>
              <CardDescription>
                Review and modify your customized strategic plan
                {selectedTemplate && ` for ${selectedTemplate.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                {isEditingPlan ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-green-900 mb-1">Title</label>
                      <Input
                        value={planEdits.title || plan.title}
                        onChange={(e) => handlePlanEdit("title", e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-900 mb-1">Description</label>
                      <Textarea
                        value={planEdits.description || plan.description}
                        onChange={(e) => handlePlanEdit("description", e.target.value)}
                        className="bg-white"
                        rows={3}
                      />
                    </div>
                    <Button onClick={savePlanEdits} className="bg-green-600 hover:bg-green-700">
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-green-900 mb-2">{plan.title}</h3>
                    <p className="text-green-800 mb-4">{plan.description}</p>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        {plan.complexity} complexity
                      </Badge>
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        {plan.estimatedTimeToValue || "Timeline TBD"}
                      </Badge>
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        {plan.estimatedCost || "Cost TBD"}
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Objectives
                    {isEditingPlan && (
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </h4>
                  <ul className="space-y-2">
                    {(planEdits.objectives || plan.objectives).map((obj, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {isEditingPlan ? (
                          <Input
                            value={obj}
                            onChange={(e) => {
                              const newObjectives = [...(planEdits.objectives || plan.objectives)]
                              newObjectives[index] = e.target.value
                              handlePlanEdit("objectives", newObjectives)
                            }}
                            className="text-sm"
                          />
                        ) : (
                          obj
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Success Metrics
                    {isEditingPlan && (
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </h4>
                  <ul className="space-y-2">
                    {(planEdits.successMetrics || plan.successMetrics).map((metric, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        {isEditingPlan ? (
                          <Input
                            value={metric}
                            onChange={(e) => {
                              const newMetrics = [...(planEdits.successMetrics || plan.successMetrics)]
                              newMetrics[index] = e.target.value
                              handlePlanEdit("successMetrics", newMetrics)
                            }}
                            className="text-sm"
                          />
                        ) : (
                          metric
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={proceedToConfiguration}>
                  Configure Agent
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Step (template-aware) */}
        {currentStep === "configuration" && plan && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                Agent Configuration
                {selectedTemplate && (
                  <Badge variant="outline" className="ml-2">
                    {selectedTemplate.name} Template
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedTemplate
                  ? `Configure your ${selectedTemplate.name} with optimized defaults`
                  : "Configure your agent details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedTemplate && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Template Optimization</AlertTitle>
                  <AlertDescription>
                    This configuration is pre-optimized for {selectedTemplate.category} use cases. Default settings are
                    based on best practices for {selectedTemplate.name}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="agentName" className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name
                  </label>
                  <Input
                    id="agentName"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder={selectedTemplate ? selectedTemplate.name : "Enter agent name"}
                  />
                </div>

                <div>
                  <label htmlFor="agentDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    id="agentDescription"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    placeholder={selectedTemplate ? selectedTemplate.description : "Describe your agent's purpose"}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="agentPersonality" className="block text-sm font-medium text-gray-700 mb-2">
                    Personality
                  </label>
                  <Select value={agentPersonality} onValueChange={setAgentPersonality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select personality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional and helpful">Professional and helpful</SelectItem>
                      <SelectItem value="Friendly and casual">Friendly and casual</SelectItem>
                      <SelectItem value="Expert and authoritative">Expert and authoritative</SelectItem>
                      <SelectItem value="Empathetic and supportive">Empathetic and supportive</SelectItem>
                      <SelectItem value="Efficient and direct">Efficient and direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="agentTone" className="block text-sm font-medium text-gray-700 mb-2">
                    Communication Tone
                  </label>
                  <Select value={agentTone} onValueChange={setAgentTone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Friendly">Friendly</SelectItem>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Formal">Formal</SelectItem>
                      <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="advancedConfig" checked={isAdvancedConfig} onCheckedChange={setIsAdvancedConfig} />
                  <label htmlFor="advancedConfig" className="text-sm font-medium">
                    Show advanced configuration options
                  </label>
                </div>

                {isAdvancedConfig && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium text-gray-900">Advanced Settings</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Response Length</label>
                        <Select defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                            <SelectItem value="medium">Medium (1-2 paragraphs)</SelectItem>
                            <SelectItem value="long">Long (detailed responses)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Creativity Level</label>
                        <Select defaultValue="balanced">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="creative">Creative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={proceedToDeployment} disabled={!agentName.trim() || agentName.length < 3}>
                  Ready to Deploy
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deployment Step */}
        {currentStep === "deployment" && plan && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Rocket className="h-5 w-5 text-green-500" />
                Ready for Deployment
              </CardTitle>
              <CardDescription>Deploy your agent and generate actionable tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <CheckCheck className="h-4 w-4" />
                <AlertTitle>All Systems Ready</AlertTitle>
                <AlertDescription>
                  Your {selectedTemplate ? selectedTemplate.name : "agent"} configuration is complete. Deployment will
                  create your AI agent and generate actionable tasks.
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Create your AI agent with configured settings</li>
                  <li>• Generate actionable tasks from your strategic plan</li>
                  <li>• Set up task dependencies and relationships</li>
                  <li>• Add tasks to your Dependency Basket for immediate action</li>
                  <li>• Tasks will appear in your Dashboard and Dependencies page</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleDeploy} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy Agent
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {currentStep === "complete" && deploymentResult && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {deploymentResult.success ? "Deployment Successful!" : "Deployment Failed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {deploymentResult.success ? (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Success!</AlertTitle>
                    <AlertDescription>
                      Your {selectedTemplate ? selectedTemplate.name : "AI agent"} has been deployed successfully with{" "}
                      {deploymentResult.tasks?.length || 0} actionable tasks. Tasks are now available in your Dashboard
                      and Dependencies page.
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Agent Details</h4>
                      <p className="text-sm text-green-800">
                        <strong>ID:</strong> {deploymentResult.agentId}
                      </p>
                      <p className="text-sm text-green-800">
                        <strong>Type:</strong> {selectedTemplate ? selectedTemplate.name : "Custom Agent"}
                      </p>
                      <p className="text-sm text-green-800">
                        <strong>Tasks:</strong> {deploymentResult.tasks?.length || 0} generated
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {deploymentResult.nextSteps?.map((step, index) => (
                          <li key={index}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => router.push("/dashboard/dependencies")}>
                      <ListChecks className="mr-2 h-4 w-4" />
                      View Tasks
                    </Button>
                    <Button onClick={() => router.push("/dashboard")}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Deployment Failed</AlertTitle>
                    <AlertDescription>{deploymentResult.error}</AlertDescription>
                  </Alert>
                  <div className="flex justify-center">
                    <Button onClick={() => setCurrentStep("deployment")}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ModernAgentConfig
