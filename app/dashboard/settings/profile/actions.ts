"use server"

import { getSupabaseFromServer } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
// No redirect needed here, page will show message

export interface ProfileUpdateState {
  message?: string
  error?: string
  success?: boolean
  fieldErrors?: {
    displayName?: string[]
  }
}

export async function updateProfile(
  prevState: ProfileUpdateState | undefined,
  formData: FormData,
): Promise<ProfileUpdateState> {
  const supabase = getSupabaseFromServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    // This should ideally be caught by page/layout auth checks,
    // but as a safeguard for the action:
    return { error: "You must be logged in to update your profile." }
  }

  const displayName = formData.get("displayName") as string | null

  if (!displayName || displayName.trim().length < 2) {
    return {
      error: "Display name must be at least 2 characters long.",
      fieldErrors: { displayName: ["Display name must be at least 2 characters long."] },
    }
  }

  if (displayName.trim().length > 50) {
    return {
      error: "Display name cannot exceed 50 characters.",
      fieldErrors: { displayName: ["Display name cannot exceed 50 characters."] },
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    console.error("Error updating display name:", updateError)
    return { error: `Failed to update display name: ${updateError.message}` }
  }

  revalidatePath("/dashboard/settings/profile") // Revalidate this page
  revalidatePath("/dashboard") // Revalidate layout as it uses display name (e.g., in dropdown)
  revalidatePath("/dashboard/layout") // Revalidate layout as it uses display name (e.g., in dropdown)

  return { success: true, message: "Display name updated successfully!" }
}
