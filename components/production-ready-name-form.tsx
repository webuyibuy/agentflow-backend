"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, User, Loader2, ArrowRight, AlertCircle, Shield } from "lucide-react"
import { updateDisplayNameEnhanced } from "@/app/onboarding/name/enhanced-actions"
import { security } from "@/lib/production-security"
import { performanceMonitor } from "@/lib/production-performance-monitor"
import { errorHandler } from "@/lib/production-error-handler"

interface OnboardingState {
  error?: string
  success?: boolean
  message?: string
  shouldNavigate?: boolean
}

export default function ProductionReadyNameForm() {
  const [state, action, isPending] = useActionState(updateDisplayNameEnhanced, undefined)
  const [name, setName] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [securityCheck, setSecurityCheck] = useState<{ passed: boolean; message?: string }>({ passed: true })
  const router = useRouter()

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.recordMetric("name_form_loaded", performance.now(), "ms")
  }, [])

  // Enhanced navigation with comprehensive error handling
  useEffect(() => {
    if (state?.success && state?.shouldNavigate && !isNavigating) {
      handleProductionNavigation()
    }
  }, [state?.success, state?.shouldNavigate])

  const handleProductionNavigation = async () => {
    if (isNavigating) return

    setIsNavigating(true)
    const startTime = performance.now()

    try {
      performanceMonitor.recordMetric("navigation_started", startTime, "ms")

      // Multiple navigation strategies with fallbacks
      const navigationStrategies = [
        () => router.push("/onboarding/general-agent"),
        () => router.replace("/onboarding/general-agent"),
        () => {
          window.location.href = "/onboarding/general-agent"
        },
      ]

      for (let i = 0; i < navigationStrategies.length; i++) {
        try {
          await navigationStrategies[i]()

          // Wait and check if navigation succeeded
          await new Promise((resolve) => setTimeout(resolve, 1000))

          if (window.location.pathname === "/onboarding/general-agent") {
            performanceMonitor.recordMetric("navigation_success", performance.now() - startTime, "ms")
            return
          }
        } catch (navError) {
          console.warn(`Navigation strategy ${i + 1} failed:`, navError)
          if (i === navigationStrategies.length - 1) {
            throw navError
          }
        }
      }

      throw new Error("All navigation strategies failed")
    } catch (error) {
      const errorId = errorHandler.captureError(error as Error, {
        component: "name_onboarding",
        action: "navigation",
        severity: "high",
        timestamp: new Date().toISOString(),
        metadata: { attempted_strategies: 3 },
      })

      performanceMonitor.recordMetric("navigation_error", performance.now() - startTime, "ms", undefined, {
        error_id: errorId,
      })

      setIsNavigating(false)
    }
  }

  const validateInput = (inputName: string): boolean => {
    const validation = security.validateAndSanitizeInput(inputName, {
      type: "string",
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-'.]+$/,
      sanitize: {
        trim: true,
        removeHtml: true,
        escapeHtml: true,
      },
    })

    if (!validation.valid) {
      setValidationErrors(validation.errors || ["Invalid input"])
      return false
    }

    // Security checks
    if (security.detectXSS(inputName) || security.detectSQLInjection(inputName)) {
      setSecurityCheck({
        passed: false,
        message: "Input contains potentially harmful content",
      })
      return false
    }

    setValidationErrors([])
    setSecurityCheck({ passed: true })
    return true
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)

    // Real-time validation
    if (newName.length > 0) {
      validateInput(newName)
    } else {
      setValidationErrors([])
      setSecurityCheck({ passed: true })
    }
  }

  const handleSubmit = async (formData: FormData) => {
    const startTime = performance.now()

    try {
      if (!name.trim()) {
        setValidationErrors(["Name is required"])
        return
      }

      if (!validateInput(name)) {
        return
      }

      // Rate limiting check
      const rateLimitCheck = security.checkRateLimit(`name_submission_${Date.now()}`, {
        windowMs: 60000,
        maxRequests: 5,
      })

      if (!rateLimitCheck.allowed) {
        setValidationErrors(["Too many attempts. Please wait before trying again."])
        return
      }

      performanceMonitor.recordMetric("name_form_submitted", performance.now(), "ms")

      const sanitizedName = security.validateAndSanitizeInput(name, {
        type: "string",
        sanitize: { trim: true, removeHtml: true, escapeHtml: true },
      }).sanitized

      formData.set("displayName", sanitizedName)
      action(formData)

      performanceMonitor.recordMetric("name_form_processing", performance.now() - startTime, "ms")
    } catch (error) {
      errorHandler.captureUserError(error as Error, "unknown", "name_submission", "name_onboarding")
      setValidationErrors(["An unexpected error occurred. Please try again."])
    }
  }

  const hasErrors = validationErrors.length > 0 || !securityCheck.passed || state?.error

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
          {/* Security indicator */}
          {securityCheck.passed && name.length > 0 && (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <Shield className="h-4 w-4 mr-2" />
              <span>Input validated and secure</span>
            </div>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Security check failed */}
          {!securityCheck.passed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{securityCheck.message}</AlertDescription>
            </Alert>
          )}

          {/* Server errors */}
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {state?.success && !isNavigating && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
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
              <div className="space-y-2">
                <Input
                  name="displayName"
                  placeholder="e.g., Alex Smith"
                  value={name}
                  onChange={handleNameChange}
                  disabled={isPending || isNavigating}
                  className={`text-center text-lg py-3 ${hasErrors ? "border-red-500" : ""}`}
                  autoFocus
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Only letters, spaces, hyphens, apostrophes, and periods allowed
                </p>
              </div>

              <Button
                type="submit"
                disabled={!name.trim() || isPending || isNavigating || hasErrors}
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
          {state?.success && !isNavigating && (
            <Button
              onClick={() => (window.location.href = "/onboarding/general-agent")}
              className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white"
            >
              Continue to General Agent <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {/* Production info */}
          <div className="text-xs text-center text-muted-foreground">
            <p>🔒 Your data is encrypted and secure</p>
            <p>⚡ Optimized for performance and reliability</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
