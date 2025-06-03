import { Suspense } from "react"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProductionDatabase } from "@/lib/production-database"
import EnhancedGeneralAgentChat from "@/components/enhanced-general-agent-chat"
import { Loader2 } from "lucide-react"

async function GeneralAgentChecker() {
  const supabase = getSupabaseFromServer()
  const db = ProductionDatabase.getInstance()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  // Check user's onboarding progress
  const profile = await db.getUserProfile(user.id)

  if (!profile) {
    redirect("/onboarding/name")
  }

  if (profile.onboarding_step < 2) {
    redirect("/onboarding/name")
  }

  if (profile.onboarding_completed) {
    redirect("/dashboard")
  }

  return <EnhancedGeneralAgentChat />
}

export default function GeneralAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading General Agent...</p>
          </div>
        </div>
      }
    >
      <GeneralAgentChecker />
    </Suspense>
  )
}
