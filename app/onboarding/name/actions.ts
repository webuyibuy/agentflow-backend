"use server"

import { getSupabaseFromServer } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface ActionResult {
  error?: string
  success?: boolean
  message?: string
}

export async function updateDisplayName(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
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

    // Update the profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error updating display name:", updateError)
      return { error: `Failed to update display name: ${updateError.message}` }
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard")
    revalidatePath("/onboarding/name")
    revalidatePath("/onboarding/general-agent")

    // IMPORTANT: Return success without redirect to allow client-side navigation
    return {
      success: true,
      message: `Welcome ${displayName.trim()}! Setting up your General Agent...`,
    }
  } catch (error) {
    console.error("Unexpected error in updateDisplayName:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}
