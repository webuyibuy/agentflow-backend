"use client"

import { useActionState, useEffect, useState } from "react"
import { updateDisplayName } from "@/app/onboarding/name/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, User, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NameOnboardingForm({ currentName }: { currentName?: string | null }) {
  const [state, formAction, isPending] = useActionState(updateDisplayName, undefined)
  const [displayName, setDisplayName] = useState(currentName || "")
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (state?.success && !state?.error) {
      console.log("Navigation triggered - success state detected")
      setIsNavigating(true)

      // Multiple navigation attempts to ensure it works
      const navigate = () => {
        try {
          // Try Next.js router first
          router.push("/onboarding/general-agent")

          // Fallback to window.location after a short delay
          setTimeout(() => {
            if (window.location.pathname === "/onboarding/name") {
              console.log("Router navigation failed, using window.location")
              window.location.href = "/onboarding/general-agent"
            }
          }, 1000)
        } catch (error) {
          console.error("Navigation error:", error)
          window.location.href = "/onboarding/general-agent"
        }
      }

      navigate()
    }
  }, [state, router])

  const isLoading = isPending || isNavigating

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <User className="mx-auto h-12 w-12 text-[#007AFF]" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">👋 Hi! I'm your General Agent.</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">What should I call you?</p>
      </div>

      <form
        action={async (formData) => {
          console.log("Form submitted with name:", formData.get("displayName"))
          try {
            const result = await formAction(formData)
            console.log("Form action result:", result)
          } catch (error) {
            console.error("Form submission error:", error)
          }
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="displayName" className="sr-only">
            Your Name
          </Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="e.g., Alex Smith"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            className="mt-1 text-center text-lg"
            aria-describedby="name-error"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white text-lg py-3"
          disabled={isLoading || !displayName.trim()}
          onClick={() => {
            // This is just a fallback, the form action should handle submission
            if (isNavigating) {
              window.location.href = "/onboarding/general-agent"
            }
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isNavigating ? "Starting conversation..." : "Saving..."}
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>

      {state?.error && (
        <Alert variant="destructive" id="name-error">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Oops!</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.success && !state.error && (
        <div className="space-y-4">
          <Alert variant="default" className="bg-green-50 border-green-200 text-green-700">
            <Terminal className="h-4 w-4 !text-green-700" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>Welcome {displayName}! Preparing your agent...</AlertDescription>
          </Alert>
          <Button
            onClick={() => {
              console.log("Manual navigation triggered")
              window.location.href = "/onboarding/general-agent"
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Continue to General Agent →
          </Button>
        </div>
      )}
    </div>
  )
}
