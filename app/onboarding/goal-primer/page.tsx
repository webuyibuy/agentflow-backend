import { getSupabaseFromServer } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import GoalPrimerForm from "@/components/goal-primer-form"
import { Suspense } from "react"

async function UserProfileAndGoalFetcher() {
  const supabase = getSupabaseFromServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single()

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error fetching profile for goal primer:", profileError)
    redirect("/login?message=Error fetching profile")
  }

  if (!profile?.display_name) {
    // User hasn't set their name yet, redirect them to that step first.
    redirect("/onboarding/name")
  }

  // In the future, we might check if a goal for the initial agent is already set
  // and redirect to /onboarding/agent-suggestion or /dashboard accordingly.
  // For now, we assume this is a linear flow.

  return <GoalPrimerForm userName={profile.display_name} />
}

export default async function OnboardingGoalPrimerPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Suspense
        fallback={
          <div className="text-center">
            <p>Loading your next step...</p>
          </div>
        }
      >
        <UserProfileAndGoalFetcher />
      </Suspense>
    </div>
  )
}
