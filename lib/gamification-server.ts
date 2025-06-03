import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { getCurrentBadge, getNextBadge } from "@/lib/gamification-client"
import type { Badge, XPAwardType } from "@/lib/gamification-types"

// Award XP to a user
export async function awardXP(
  userId: string,
  points: number,
  type: XPAwardType,
  description: string,
  metadata?: Record<string, any>,
): Promise<{ success: boolean; newTotal?: number; error?: string }> {
  try {
    console.log(`🎯 Awarding ${points} XP to user ${userId} for ${type}: ${description}`)

    const supabase = getSupabaseAdmin()

    // Get current user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, xp")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("❌ Error fetching user profile for XP award:", profileError)
      return { success: false, error: "Failed to fetch user profile" }
    }

    const currentXP = profile.xp || 0
    const newXP = currentXP + points

    // Update user's XP
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        xp: newXP,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) {
      console.error("❌ Error updating user XP:", updateError)
      return { success: false, error: "Failed to update XP" }
    }

    // Log the XP award
    const { error: logError } = await supabase.from("xp_logs").insert({
      user_id: userId,
      points_awarded: points,
      award_type: type,
      description,
      metadata: metadata || {},
      previous_xp: currentXP,
      new_xp: newXP,
      created_at: new Date().toISOString(),
    })

    if (logError) {
      console.warn("⚠️ Failed to log XP award (but XP was still awarded):", logError)
      // Don't fail the operation if logging fails
    }

    console.log(`✅ Successfully awarded ${points} XP. New total: ${newXP}`)

    return {
      success: true,
      newTotal: newXP,
    }
  } catch (error) {
    console.error("❌ Unexpected error awarding XP:", error)
    return {
      success: false,
      error: "Unexpected error occurred while awarding XP",
    }
  }
}

// Get user's current XP and badge
export async function getUserXPData(userId?: string): Promise<{
  xp: number
  currentBadge: Badge | null
  nextBadge: Badge | null
  progress: number
}> {
  try {
    const actualUserId = userId || (await getDefaultUserId())
    const supabase = getSupabaseAdmin()

    const { data: profile, error } = await supabase.from("profiles").select("xp").eq("id", actualUserId).single()

    if (error) {
      console.error("❌ Error fetching user XP:", error)
      return { xp: 0, currentBadge: null, nextBadge: null, progress: 0 }
    }

    const xp = profile.xp || 0
    const currentBadge = getCurrentBadge(xp)
    const nextBadge = getNextBadge(xp)

    // Calculate progress to next badge
    let progress = 0
    if (nextBadge) {
      const currentThreshold = currentBadge?.threshold || 0
      const nextThreshold = nextBadge.threshold
      const progressInRange = xp - currentThreshold
      const totalRange = nextThreshold - currentThreshold
      progress = Math.min(100, Math.max(0, (progressInRange / totalRange) * 100))
    } else {
      progress = 100 // All badges earned
    }

    return { xp, currentBadge, nextBadge, progress }
  } catch (error) {
    console.error("❌ Error getting user XP data:", error)
    return { xp: 0, currentBadge: null, nextBadge: null, progress: 0 }
  }
}

// Check if user earned a new badge
export function checkBadgeEarned(previousXP: number, newXP: number): Badge | null {
  const previousBadge = getCurrentBadge(previousXP)
  const newBadge = getCurrentBadge(newXP)

  if (!previousBadge && newBadge) {
    return newBadge // First badge earned
  }

  if (previousBadge && newBadge && newBadge.threshold > previousBadge.threshold) {
    return newBadge // New higher badge earned
  }

  return null // No new badge
} 