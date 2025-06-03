import { getSupabaseAdmin } from "@/lib/supabase/server"

export interface SystemHealthMetrics {
  total_users: number
  total_profiles: number
  users_without_profiles: number
  duplicate_profiles: number
  onboarding_completion_rate: number
  active_conversations: number
  total_tasks: number
  completed_tasks: number
  pending_dependencies: number
}

export interface ProfileCleanupResult {
  user_id: string
  duplicate_count: number
  action_taken: string
}

export class AdminDatabaseOperations {
  private supabaseAdmin = getSupabaseAdmin()

  async getSystemHealthMetrics(): Promise<SystemHealthMetrics | null> {
    try {
      const { data, error } = await this.supabaseAdmin.rpc("get_system_health_metrics")

      if (error) {
        console.error("Error fetching system health metrics:", error)
        return null
      }

      return data as SystemHealthMetrics
    } catch (error) {
      console.error("Error in getSystemHealthMetrics:", error)
      return null
    }
  }

  async cleanupDuplicateProfiles(): Promise<ProfileCleanupResult[] | null> {
    try {
      const { data, error } = await this.supabaseAdmin.rpc("cleanup_duplicate_profiles")

      if (error) {
        console.error("Error cleaning up duplicate profiles:", error)
        return null
      }

      return data as ProfileCleanupResult[]
    } catch (error) {
      console.error("Error in cleanupDuplicateProfiles:", error)
      return null
    }
  }

  async createMissingProfiles(): Promise<{ created: number; errors: number }> {
    try {
      // Get users without profiles
      const { data: usersWithoutProfiles, error: fetchError } = await this.supabaseAdmin
        .from("auth.users")
        .select("id")
        .not("id", "in", this.supabaseAdmin.from("profiles").select("id"))

      if (fetchError) {
        console.error("Error fetching users without profiles:", fetchError)
        return { created: 0, errors: 1 }
      }

      if (!usersWithoutProfiles || usersWithoutProfiles.length === 0) {
        return { created: 0, errors: 0 }
      }

      // Create default profiles for users without them
      const defaultProfiles = usersWithoutProfiles.map((user) => ({
        id: user.id,
        display_name: "",
        onboarding_step: 1,
        onboarding_completed: false,
        experience_level: "beginner",
        goals: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: insertError } = await this.supabaseAdmin.from("profiles").insert(defaultProfiles)

      if (insertError) {
        console.error("Error creating missing profiles:", insertError)
        return { created: 0, errors: 1 }
      }

      return { created: defaultProfiles.length, errors: 0 }
    } catch (error) {
      console.error("Error in createMissingProfiles:", error)
      return { created: 0, errors: 1 }
    }
  }

  async getDetailedUserAnalytics(limit = 100): Promise<any[] | null> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from("user_engagement_metrics")
        .select("*")
        .order("last_activity", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Error fetching detailed user analytics:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in getDetailedUserAnalytics:", error)
      return null
    }
  }

  async getAgentPerformanceAnalytics(): Promise<any[] | null> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from("agent_performance_summary")
        .select("*")
        .order("total_tasks", { ascending: false })

      if (error) {
        console.error("Error fetching agent performance analytics:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in getAgentPerformanceAnalytics:", error)
      return null
    }
  }
}
