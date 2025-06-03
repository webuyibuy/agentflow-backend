import { Award, Shield, Star, Zap, Crown } from "lucide-react"
import type { Badge } from "@/lib/gamification-types"

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
].sort((a, b) => b.threshold - a.threshold) // Sort by highest threshold first

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