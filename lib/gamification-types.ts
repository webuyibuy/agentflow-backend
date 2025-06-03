import type React from "react"

export interface Badge {
  name: string
  threshold: number // XP required to earn this badge
  icon: React.ElementType
  colorClasses: string // Tailwind CSS classes for background, text, border
  description: string
}

export type XPAwardType =
  | "task_completion"
  | "agent_deployment"
  | "dependency_completion"
  | "milestone_reached"
  | "daily_login"
  | "profile_completion"
  | "first_agent"
  | "custom" 