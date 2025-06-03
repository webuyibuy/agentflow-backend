import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import ApiKeyManager from "@/components/api-key-manager"
import ProfileSettingsForm from "@/components/profile-settings-form"
import { Suspense } from "react"
import BadgeShowcase from "@/components/badge-showcase"
import { badges as allBadgesConfig, type Badge as UserBadgeType } from "@/lib/gamification"

export const metadata: Metadata = {
  title: "Settings - AgentFlow",
}

async function ProfileDataFetcher() {
  try {
    const supabase = getSupabaseFromServer()

    // Get user with proper error handling
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("Error getting user:", userError)
      redirect("/login?message=Authentication error. Please sign in again.")
    }

    if (!user) {
      console.log("No user found, redirecting to login")
      redirect("/login?message=Please sign in to access your profile.")
    }

    // Get profile with error handling
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile:", profileError)
      // Continue with null display name if profile doesn't exist
    }

    return <ProfileSettingsForm email={user.email || ""} currentDisplayName={profile?.display_name || null} />
  } catch (error) {
    console.error("ProfileDataFetcher error:", error)
    redirect("/login?message=Unable to load profile. Please sign in again.")
  }
}

async function BadgeDataFetcher() {
  try {
    const supabase = getSupabaseFromServer()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Badge fetcher - user error:", userError)
      return <BadgeShowcase currentXp={0} earnedBadges={[]} />
    }

    // Try to fetch XP data with fallback handling
    let totalXp = 0

    try {
      // Check if xp_logs table exists, if not use xp_log
      const { data: xpData, error: xpError } = await supabase
        .from("xp_logs")
        .select("points_awarded")
        .eq("user_id", user.id)

      if (xpError) {
        // Try alternative table name
        const { data: altXpData, error: altXpError } = await supabase
          .from("xp_log")
          .select("points")
          .eq("owner_id", user.id)

        if (altXpError) {
          console.log("No XP data found, using default:", altXpError.message)
          totalXp = 0
        } else {
          totalXp = altXpData?.reduce((sum, entry) => sum + (entry.points || 0), 0) || 0
        }
      } else {
        totalXp = xpData?.reduce((sum, entry) => sum + (entry.points_awarded || 0), 0) || 0
      }
    } catch (xpFetchError) {
      console.log("XP fetch error, using default:", xpFetchError)
      totalXp = 0
    }

    const earnedBadges: UserBadgeType[] = []
    if (allBadgesConfig && Array.isArray(allBadgesConfig)) {
      for (const badge of allBadgesConfig) {
        if (totalXp >= badge.threshold) {
          earnedBadges.push(badge)
        }
      }
    }

    return <BadgeShowcase currentXp={totalXp} earnedBadges={earnedBadges} />
  } catch (error) {
    console.error("BadgeDataFetcher error:", error)
    return <BadgeShowcase currentXp={0} earnedBadges={[]} />
  }
}

export default async function ProfileSettingsPage() {
  try {
    const supabase = getSupabaseFromServer()

    // Initial auth check with proper error handling
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Profile page auth error:", authError)
      redirect("/login?message=Authentication error. Please sign in again.")
    }

    if (!user) {
      console.log("Profile page - no user found")
      redirect("/login?message=Please sign in to access your profile.")
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Settings</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your account settings, profile information, and integrations.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your display name. Your email address cannot be changed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="max-w-md space-y-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 bg-blue-200 rounded w-24"></div>
                  </div>
                </div>
              }
            >
              <ProfileDataFetcher />
            </Suspense>
          </CardContent>
        </Card>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>API Keys & Model Preferences</CardTitle>
                <CardDescription>Loading API key management...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-20 flex items-center justify-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
        >
          <ApiKeyManager />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Your Badges & Achievements</CardTitle>
                <CardDescription>Loading your badge progress...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-20 flex items-center justify-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
        >
          <BadgeDataFetcher />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("Profile settings page error:", error)
    redirect("/login?message=Unable to load settings. Please sign in again.")
  }
}
