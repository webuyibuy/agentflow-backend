import { getSupabaseFromServer } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AgentSuggestionForm from "@/components/agent-suggestion-form"
import { Suspense } from "react"

async function CheckAuthAndProfile() {
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
    console.error("Error fetching profile for agent suggestion:", profileError)
    redirect("/login?message=Error fetching profile")
  }

  if (!profile?.display_name) {
    // User hasn't set their name yet, redirect them to that step first.
    redirect("/onboarding/name")
  }

  // We could also check if they've defined a goal if that state was persisted.
  // For now, we assume linear flow from /onboarding/goal-primer.

  return <AgentSuggestionForm />
}

export default async function OnboardingAgentSuggestionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Suspense
        fallback={
          <div className="text-center">
            <p>Loading agent options...</p>
          </div>
        }
      >
        <CheckAuthAndProfile />
      </Suspense>
    </div>
  )
}
