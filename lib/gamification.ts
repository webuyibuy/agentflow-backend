// WARNING: This file exports both client-safe and server-only functions.
// - badges, getNextBadge, getCurrentBadge, POINTS_PER_TASK_COMPLETION are CLIENT-SAFE.
// - awardXP, getUserXPData are SERVER-ONLY (use Supabase server logic, do NOT import in client components).
// If you need to use XP logic in a client component, call an API route instead.

import type React from "react"
import { Award, Shield, Star, Zap, Crown } from "lucide-react"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"

export interface Badge {
  name: string
  threshold: number // XP required to earn this badge
  icon: React.ElementType
  colorClasses: string // Tailwind CSS classes for background, text, border
  description: string
}

export const badges: Badge[] = [
  {
    name: "Legend",
    threshold: 1000,
    icon: Crown,
    colorClasses:
      "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700",
    description: "Legendary status unlocked with 1000 XP!",
  },
  {
    name: "Virtuoso",
    threshold: 500,
    icon: Zap,
    colorClasses: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900 dark:text-pink-300 dark:border-pink-700",
    description: "Truly outstanding! 500 XP achieved.",
  },
  {
    name: "Prodigy",
    threshold: 300,
    icon: Star,
    colorClasses:
      "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700",
    description: "Becoming a master of automation with 300 XP!",
  },
  {
    name: "Contributor",
    threshold: 150,
    icon: Shield,
    colorClasses: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700",
    description: "Making good progress with 150 XP!",
  },
  {
    name: "Rookie",
    threshold: 50,
    icon: Award,
    colorClasses:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
    description: "Completed your first few tasks and earned 50 XP!",
  },
].sort((a, b) => b.threshold - a.threshold) // Sort by highest threshold first (important for getCurrentBadge)

export function getNextBadge(xp: number): Badge | null {
  const sortedByThresholdAsc = [...badges].sort((a, b) => a.threshold - b.threshold)
  for (const badge of sortedByThresholdAsc) {
    if (xp < badge.threshold) {
      return badge
    }
  }
  return null // All badges earned
}

export function getCurrentBadge(xp: number): Badge | null {
  for (const badge of badges) {
    // Assumes badges are sorted descending by threshold
    if (xp >= badge.threshold) {
      return badge
    }
  }
  return null
}

export const POINTS_PER_TASK_COMPLETION = 10 // Consistent with dependency action

// XP Award Types
export type XPAwardType =
  | "task_completion"
  | "agent_deployment"
  | "dependency_completion"
  | "milestone_reached"
  | "daily_login"
  | "profile_completion"
  | "first_agent"
  | "custom"

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
