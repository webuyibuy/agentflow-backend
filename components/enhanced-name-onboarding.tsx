"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, User, Loader2, ArrowRight, AlertCircle } from "lucide-react"
import { updateDisplayNameEnhanced } from "@/app/onboarding/name/enhanced-actions"

interface OnboardingState {
  error?: string
  success?: boolean
  message?: string
  shouldNavigate?: boolean
}

export default function EnhancedNameOnboarding() {
  const [state, action, isPending] = useActionState(updateDisplayNameEnhanced, undefined)
  const [name, setName] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationAttempts, setNavigationAttempts] = useState(0)
  const router = useRouter()

  // Enhanced navigation with multiple fallbacks
  useEffect(() => {
    if (state?.success && state?.shouldNavigate && !isNavigating) {
      handleNavigation()
    }
  }, [state?.success, state?.shouldNavigate])

  const handleNavigation = async () => {
    if (isNavigating) return

    setIsNavigating(true)
    console.log("Starting navigation to General Agent...")

    try {
      // Method 1: Next.js router push
      console.log("Attempting router.push...")
      await router.push("/onboarding/general-agent")

      // Wait a bit to see if navigation worked
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if we're still on the same page
      if (window.location.pathname === "/onboarding/name") {
        console.log("Router.push failed, trying router.replace...")
        await router.replace("/onboarding/general-agent")
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // If still on same page, use window.location
      if (window.location.pathname === "/onboarding/name") {
        console.log("Router methods failed, using window.location...")
        window.location.href = "/onboarding/general-agent"
      }
    } catch (error) {
      console.error("Navigation error:", error)
      setNavigationAttempts((prev) => prev + 1)

      // If all methods fail, show manual navigation
      if (navigationAttempts >= 2) {
        setIsNavigating(false)
      } else {
        // Retry after a delay
        setTimeout(() => {
          setIsNavigating(false)
          handleNavigation()
        }, 2000)
      }
    }
  }

  const handleSubmit = async (formData: FormData) => {
    if (!name.trim()) return

    console.log("Submitting name:", name)
    formData.set("displayName", name.trim())
    action(formData)
  }

  const handleManualNavigation = () => {
    console.log("Manual navigation triggered")
    window.location.href = "/onboarding/general-agent"
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
          <CardTitle className="text-2xl font-bold">👋 Hi! I'm your General Agent.</CardTitle>
          <p className="text-muted-foreground">What should I call you?</p>

          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step 1 of 2</span>
              <span>50%</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error handling */}
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {state?.success && !isNavigating && navigationAttempts >= 2 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {state.message} Click the button below to continue to your General Agent.
              </AlertDescription>
            </Alert>
          )}

          {/* Navigation in progress */}
          {isNavigating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Setting up your General Agent... Please wait.</AlertDescription>
            </Alert>
          )}

          {/* Name input form */}
          {!state?.success && (
            <form action={handleSubmit} className="space-y-4">
              <Input
                name="displayName"
                placeholder="e.g., Alex Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending || isNavigating}
                className="text-center text-lg py-3"
                autoFocus
              />

              <Button
                type="submit"
                disabled={!name.trim() || isPending || isNavigating}
                className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white py-3 text-lg"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          )}

          {/* Manual navigation button */}
          {state?.success && !isNavigating && navigationAttempts >= 2 && (
            <Button onClick={handleManualNavigation} className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white">
              Continue to General Agent <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {/* Debug information in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>Navigation attempts: {navigationAttempts}</div>
              <div>Is navigating: {isNavigating.toString()}</div>
              <div>Current path: {typeof window !== "undefined" ? window.location.pathname : "unknown"}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
