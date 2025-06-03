import DashboardLayoutClient from "@/components/dashboard-layout"
import type React from "react"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import type { Badge as UserBadgeType } from "@/lib/gamification"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseFromServer()

  // Try to get the actual user data
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  let profile = { display_name: "Default User" }
  let userData = { id: "00000000-0000-0000-0000-000000000000", email: "user@example.dev" }

  if (user && !userError) {
    // Use real user data
    userData = { id: user.id, email: user.email || "user@example.dev" }

    // Try to fetch profile data
    const { data: profileData } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

    if (profileData?.display_name) {
      profile = { display_name: profileData.display_name }
    } else {
      // Fallback to email username if no display name set
      profile = { display_name: user.email?.split("@")[0] || "User" }
    }
  } else {
    // For users without authentication, try to get from profiles table anyway
    const { data: profileData } = await supabase.from("profiles").select("display_name").limit(1).single()

    if (profileData?.display_name) {
      profile = { display_name: profileData.display_name }
    }
  }

  // Set default XP and badge values (no Supabase call)
  const totalXp = 0
  const currentBadge: UserBadgeType | null = null

  // Updated to use the new agent creation route
  const newAgentHref = "/dashboard/agents/new"

  return (
    <DashboardLayoutClient
      user={userData}
      profile={profile}
      totalXp={totalXp}
      currentBadge={currentBadge}
      newAgentHref={newAgentHref}
    >
      {children}
    </DashboardLayoutClient>
  )
}
