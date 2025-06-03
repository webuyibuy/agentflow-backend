import { Suspense } from "react"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProductionDatabase } from "@/lib/production-database"
import { Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

async function OnboardingChecker() {
  const supabase = getSupabaseFromServer()
  const db = ProductionDatabase.getInstance()

  try {
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("No authenticated user found, redirecting to login")
      redirect("/login")
    }

    // Get user profile with enhanced error handling
    const profile = await db.getUserProfile(user.id)

    // Track user activity
    await db.trackUserActivity(user.id, "onboarding_name_page_visit", "onboarding", undefined, {
      timestamp: new Date().toISOString(),
      userAgent: "server-side",
    })

    // Check onboarding progress
    if (profile?.onboarding_step && profile.onboarding_step > 1) {
      if (profile.onboarding_completed) {
        redirect("/dashboard")
      } else {
        redirect("/onboarding/general-agent")
      }
    }

    return null
  } catch (error) {
    console.error("Critical error in OnboardingChecker:", error)

    // Log the error for monitoring
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await db.trackUserActivity(user.id, "onboarding_error", "error", undefined, {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (logError) {
      console.error("Failed to log error:", logError)
    }

    // Return error fallback UI
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Something went wrong during setup. Please refresh the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
}

export default function NameOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Preparing your onboarding experience...</p>
          </div>
        </div>
      }
    >
      <OnboardingChecker />
    </Suspense>
  )
}
