"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, User, Loader2, ArrowRight } from "lucide-react"
import { NavigationManager } from "@/lib/production-ready-navigation"
import { UserExperienceManager } from "@/lib/user-experience-manager"

interface OnboardingState {
  currentStep: number
  totalSteps: number
  userData: {
    name: string
    role: string
    industry: string
    goals: string[]
  }
  isLoading: boolean
  error: string | null
  success: boolean
}

export default function ProductionReadyOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    totalSteps: 3,
    userData: {
      name: "",
      role: "",
      industry: "",
      goals: [],
    },
    isLoading: false,
    error: null,
    success: false,
  })

  const router = useRouter()
  const navigationManager = NavigationManager.getInstance()
  const uxManager = UserExperienceManager.getInstance()

  const handleStepComplete = async (stepData: any) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Update user data
      setState((prev) => ({
        ...prev,
        userData: { ...prev.userData, ...stepData },
      }))

      // Save to database
      await saveUserData(stepData)

      // Move to next step or complete onboarding
      if (state.currentStep < state.totalSteps) {
        setState((prev) => ({
          ...prev,
          currentStep: prev.currentStep + 1,
          isLoading: false,
        }))
      } else {
        // Complete onboarding
        setState((prev) => ({ ...prev, success: true, isLoading: false }))

        // Navigate to dashboard with robust navigation
        const success = await navigationManager.navigateWithFallback("/dashboard", {
          method: "both",
          timeout: 5000,
          retryOnFailure: true,
          onSuccess: () => {
            console.log("Successfully navigated to dashboard")
          },
          onError: (error) => {
            console.error("Navigation failed:", error)
            setState((prev) => ({
              ...prev,
              error: "Navigation failed. Please try refreshing the page.",
            }))
          },
        })

        if (!success) {
          // Show manual navigation option
          setState((prev) => ({
            ...prev,
            error: "Automatic navigation failed. Please click the button below to continue.",
          }))
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to save your information. Please try again.",
      }))
    }
  }

  const saveUserData = async (data: any) => {
    // Implementation to save user data
    return new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <NameStep onComplete={handleStepComplete} isLoading={state.isLoading} />
      case 2:
        return <RoleStep onComplete={handleStepComplete} isLoading={state.isLoading} />
      case 3:
        return <GoalsStep onComplete={handleStepComplete} isLoading={state.isLoading} />
      default:
        return <CompletionStep />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to AgentFlow</CardTitle>
          <p className="text-muted-foreground">Let's get you set up in just a few steps</p>

          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>
                Step {state.currentStep} of {state.totalSteps}
              </span>
              <span>{Math.round((state.currentStep / state.totalSteps) * 100)}%</span>
            </div>
            <Progress value={(state.currentStep / state.totalSteps) * 100} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          {state.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{state.error}</AlertDescription>
              {state.error.includes("click the button") && (
                <Button className="mt-2 w-full" onClick={() => (window.location.href = "/dashboard")}>
                  Go to Dashboard
                </Button>
              )}
            </Alert>
          )}

          {state.success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">All Set!</h3>
              <p className="text-muted-foreground">Your account is ready. Redirecting to your dashboard...</p>
              <Button onClick={() => (window.location.href = "/dashboard")} className="w-full">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            renderStep()
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Individual step components
function NameStep({ onComplete, isLoading }: { onComplete: (data: any) => void; isLoading: boolean }) {
  const [name, setName] = useState("")

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">What's your name?</h3>
        <p className="text-sm text-muted-foreground">This helps us personalize your experience</p>
      </div>

      <Input
        placeholder="Enter your full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
      />

      <Button onClick={() => onComplete({ name })} disabled={!name.trim() || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}

function RoleStep({ onComplete, isLoading }: { onComplete: (data: any) => void; isLoading: boolean }) {
  const [role, setRole] = useState("")
  const [industry, setIndustry] = useState("")

  const roles = [
    "Business Owner",
    "Manager",
    "Developer",
    "Marketer",
    "Sales Professional",
    "HR Professional",
    "Consultant",
    "Other",
  ]

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Retail",
    "Manufacturing",
    "Services",
    "Other",
  ]

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Tell us about yourself</h3>
        <p className="text-sm text-muted-foreground">This helps us recommend the right agents for you</p>
      </div>

      <div>
        <label className="text-sm font-medium">Your Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full mt-1 p-2 border rounded-md"
          disabled={isLoading}
        >
          <option value="">Select your role</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Industry</label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full mt-1 p-2 border rounded-md"
          disabled={isLoading}
        >
          <option value="">Select your industry</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={() => onComplete({ role, industry })}
        disabled={!role || !industry || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}

function GoalsStep({ onComplete, isLoading }: { onComplete: (data: any) => void; isLoading: boolean }) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  const goals = [
    "Automate repetitive tasks",
    "Improve customer service",
    "Generate more leads",
    "Streamline operations",
    "Enhance productivity",
    "Better data analysis",
    "Content creation",
    "Project management",
  ]

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]))
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">What are your main goals?</h3>
        <p className="text-sm text-muted-foreground">Select all that apply (you can change these later)</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {goals.map((goal) => (
          <button
            key={goal}
            onClick={() => toggleGoal(goal)}
            disabled={isLoading}
            className={`p-3 text-sm border rounded-lg transition-colors ${
              selectedGoals.includes(goal)
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            {goal}
          </button>
        ))}
      </div>

      <Button
        onClick={() => onComplete({ goals: selectedGoals })}
        disabled={selectedGoals.length === 0 || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up your account...
          </>
        ) : (
          <>
            Complete Setup <CheckCircle className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}

function CompletionStep() {
  return (
    <div className="text-center space-y-4">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h3 className="text-xl font-semibold">Welcome to AgentFlow!</h3>
      <p className="text-muted-foreground">Your account is ready. Let's start building your first AI agent.</p>
    </div>
  )
}
