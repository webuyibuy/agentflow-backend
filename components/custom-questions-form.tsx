"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, MessageCircle, Brain, Heart } from "lucide-react"
import { generateAgentQuestions } from "@/app/onboarding/agent-config/custom-questions-actions"

interface Question {
  id: string
  question: string
  type: "text" | "textarea" | "select" | "multiselect" | "checkbox"
  options?: string[]
  required: boolean
  category: "strategy" | "configuration" | "integration" | "metrics" | "personal" | "goals"
  placeholder?: string
  roleContext?: string // New field for role-specific context
}

interface CustomQuestionsFormProps {
  templateSlug: string
  templateName: string
  agentGoal: string
  onAnswersChange: (answers: Record<string, any>) => void
}

const getRolePersonality = (templateSlug: string) => {
  const personalities: Record<string, { icon: any; greeting: string; tone: string }> = {
    "mental-peace-coach": {
      icon: Brain,
      greeting: "Hello! I'm your mindfulness guide. Let me understand your wellness journey...",
      tone: "calm, empathetic, and nurturing",
    },
    "sales-lead-generator": {
      icon: MessageCircle,
      greeting: "Hey there! I'm your sales strategist. Let's build your lead generation powerhouse...",
      tone: "energetic, results-focused, and strategic",
    },
    "fitness-trainer": {
      icon: Heart,
      greeting: "Ready to transform your fitness? I'm here to create your perfect workout plan...",
      tone: "motivational, encouraging, and health-focused",
    },
    "financial-advisor": {
      icon: Sparkles,
      greeting: "Let's secure your financial future! I'll help optimize your money management...",
      tone: "professional, trustworthy, and analytical",
    },
    "parenting-coach": {
      icon: Heart,
      greeting: "Parenting is beautiful! Let me support you on this amazing journey...",
      tone: "warm, understanding, and supportive",
    },
    "language-tutor": {
      icon: MessageCircle,
      greeting: "¡Hola! Bonjour! Ready to master a new language? Let's personalize your learning...",
      tone: "encouraging, patient, and culturally aware",
    },
    "travel-planner": {
      icon: Sparkles,
      greeting: "Adventure awaits! I'm your travel companion ready to plan amazing experiences...",
      tone: "enthusiastic, knowledgeable, and adventure-focused",
    },
    "nutrition-advisor": {
      icon: Heart,
      greeting: "Nourish your body, fuel your life! Let's create your perfect nutrition plan...",
      tone: "health-focused, encouraging, and science-based",
    },
    "productivity-optimizer": {
      icon: Sparkles,
      greeting: "Time to supercharge your productivity! Let's optimize your workflow...",
      tone: "efficient, systematic, and goal-oriented",
    },
    "creative-content-creator": {
      icon: Sparkles,
      greeting: "Let's unleash your creativity! I'm here to amplify your creative vision...",
      tone: "inspiring, artistic, and innovative",
    },
  }

  return (
    personalities[templateSlug] || {
      icon: Sparkles,
      greeting: "Hello! I'm excited to help you configure your perfect agent...",
      tone: "helpful, professional, and adaptive",
    }
  )
}

export default function CustomQuestionsForm({
  templateSlug,
  templateName,
  agentGoal,
  onAnswersChange,
}: CustomQuestionsFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [showRoleIntro, setShowRoleIntro] = useState(true)

  const rolePersonality = getRolePersonality(templateSlug)
  const RoleIcon = rolePersonality.icon

  // Generate questions when goal is provided and sufficient length
  useEffect(() => {
    if (agentGoal && agentGoal.length >= 15 && !hasGenerated && !isLoading) {
      generateQuestions()
    }
  }, [agentGoal, hasGenerated, isLoading])

  // Update parent component when answers change
  useEffect(() => {
    onAnswersChange(answers)
  }, [answers, onAnswersChange])

  const generateQuestions = async () => {
    setIsLoading(true)
    try {
      const result = await generateAgentQuestions(templateSlug, agentGoal, templateName)

      if (result.success && result.questions) {
        // Add role-specific context to questions
        const enhancedQuestions = result.questions.map((q: Question) => ({
          ...q,
          roleContext: `As your ${templateName.toLowerCase()}, I need to understand...`,
        }))
        setQuestions(enhancedQuestions)
        setHasGenerated(true)
      }
    } catch (error) {
      console.error("Error generating questions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || ""

    switch (question.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="mt-2"
          />
        )

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="mt-2 min-h-[80px]"
          />
        )

      case "select":
        return (
          <Select value={value} onValueChange={(val) => handleAnswerChange(question.id, val)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={question.placeholder || "Select an option"} />
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
          <div className="mt-2 space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : []
                    if (checked) {
                      handleAnswerChange(question.id, [...currentValues, option])
                    } else {
                      handleAnswerChange(
                        question.id,
                        currentValues.filter((v: string) => v !== option),
                      )
                    }
                  }}
                />
                <Label htmlFor={`${question.id}-${option}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        )

      case "checkbox":
        return (
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id={question.id}
              checked={!!value}
              onCheckedChange={(checked) => handleAnswerChange(question.id, checked)}
            />
            <Label htmlFor={question.id} className="text-sm">
              {question.placeholder || "Yes, I agree"}
            </Label>
          </div>
        )

      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      strategy: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      configuration: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      integration: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      metrics: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      personal: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      goals: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    }
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }

  if (!agentGoal || agentGoal.length < 15) {
    return (
      <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <RoleIcon className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            I'm Ready to Help as Your {templateName}!
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Once you provide your goal above (at least 15 characters), I'll ask you personalized questions to understand
            exactly how I can help you succeed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Role Introduction */}
      {showRoleIntro && (
        <Card className="border-l-4 border-l-[#007AFF] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <RoleIcon className="h-8 w-8 text-[#007AFF]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Your {templateName} Speaking
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">{rolePersonality.greeting}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">My approach: {rolePersonality.tone}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRoleIntro(false)}
                  className="mt-3 text-[#007AFF] hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  Let's get started! →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#007AFF]" />
            Personalized Configuration Questions
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Help me understand your specific needs so I can serve you better as your {templateName.toLowerCase()}.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#007AFF] mr-2" />
              <span className="text-gray-600 dark:text-gray-400">
                Generating personalized questions as your {templateName.toLowerCase()}...
              </span>
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className={getCategoryColor(question.category)}>
                          {question.category}
                        </Badge>
                        {question.required && <Badge variant="destructive">Required</Badge>}
                      </div>
                      <Label className="text-base font-medium text-gray-800 dark:text-gray-200">
                        {index + 1}. {question.question}
                      </Label>
                      {question.roleContext && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">{question.roleContext}</p>
                      )}
                    </div>
                  </div>
                  {renderQuestion(question)}
                </div>
              ))}

              {questions.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Perfect! I now understand how to help you as your {templateName.toLowerCase()}.
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your answers will help me provide personalized assistance tailored to your specific needs and goals.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                I'm ready to ask you personalized questions, but I need a bit more detail in your goal first.
              </p>
              <Button onClick={generateQuestions} variant="outline" className="mt-4" disabled={agentGoal.length < 15}>
                Generate Questions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
