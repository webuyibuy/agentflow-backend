"use server"

import { getSupabaseFromServer } from "@/lib/supabase/server"
import { ProductionDatabase } from "@/lib/production-database"
import { revalidatePath } from "next/cache"

interface ActionResult {
  error?: string
  success?: boolean
  message?: string
  shouldNavigate?: boolean
}

export async function updateDisplayNameEnhanced(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const db = ProductionDatabase.getInstance()

  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "You must be logged in to update your name." }
    }

    const displayName = formData.get("displayName") as string

    if (!displayName || displayName.trim().length < 2) {
      return { error: "Display name must be at least 2 characters long." }
    }

    if (displayName.trim().length > 50) {
      return { error: "Display name cannot exceed 50 characters." }
    }

    // Update user profile with enhanced data
    const profileData = {
      display_name: displayName.trim(),
      onboarding_step: 2,
      experience_level: "beginner" as const,
      goals: [],
    }

    const updatedProfile = await db.createOrUpdateUserProfile(user.id, profileData)

    if (!updatedProfile) {
      return { error: "Failed to update your profile. Please try again." }
    }

    // Track the onboarding activity
    await db.trackUserActivity(user.id, "name_onboarding_completed", "onboarding", undefined, {
      display_name: displayName.trim(),
      step: 1,
    })

    // Update onboarding progress
    await db.updateOnboardingProgress(user.id, 2, false)

    // Revalidate paths
    revalidatePath("/onboarding/name")
    revalidatePath("/onboarding/general-agent")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Welcome ${displayName.trim()}! Setting up your General Agent...`,
      shouldNavigate: true,
    }
  } catch (error) {
    console.error("Unexpected error in updateDisplayNameEnhanced:", error)

    // Track the error
    try {
      const supabase = getSupabaseFromServer()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await db.trackUserActivity(user.id, "name_onboarding_error", "onboarding", undefined, {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    } catch (trackingError) {
      console.error("Error tracking activity:", trackingError)
    }

    return { error: "An unexpected error occurred. Please try again." }
  }
}
