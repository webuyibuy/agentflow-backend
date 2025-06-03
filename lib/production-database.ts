import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"

export interface UserProfile {
  id: string
  display_name?: string
  role?: string
  industry?: string
  company_size?: string
  goals: string[]
  onboarding_completed: boolean
  onboarding_step: number
  experience_level: "beginner" | "intermediate" | "advanced"
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto"
  language: string
  timezone: string
  notification_settings: Record<string, any>
  dashboard_layout: Record<string, any>
  feature_flags: Record<string, any>
}

export class ProductionDatabase {
  private static instance: ProductionDatabase
  private supabase = getSupabaseFromServer()
  private supabaseAdmin = getSupabaseAdmin()

  static getInstance(): ProductionDatabase {
    if (!ProductionDatabase.instance) {
      ProductionDatabase.instance = new ProductionDatabase()
    }
    return ProductionDatabase.instance
  }

  // Enhanced user profile management
  async createOrUpdateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            ...profileData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select()
        .single()

      if (error) {
        console.error("Error creating/updating user profile:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in createOrUpdateUserProfile:", error)
      return null
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // First check if any profiles exist for this user
      const { data, error } = await this.supabase.from("profiles").select("*").eq("id", userId).limit(2) // Get up to 2 to check if there are multiple

      if (error) {
        console.error("Error fetching user profile:", error)
        return null
      }

      // Handle case where multiple profiles exist
      if (data && data.length > 1) {
        console.warn(`Multiple profiles found for user ${userId}. Using the first one.`)
        // Log this issue for later cleanup
        this.trackUserActivity(userId, "data_issue", "profiles", userId, {
          issue: "multiple_profiles",
          count: data.length,
        })
        return data[0]
      }

      // Handle case where no profile exists
      if (!data || data.length === 0) {
        console.log("No profile found, creating default profile for user:", userId)
        const defaultProfile = {
          id: userId,
          display_name: "",
          onboarding_step: 1,
          onboarding_completed: false,
          experience_level: "beginner" as const,
          goals: [],
        }

        // Create the profile
        const { data: newProfile, error: createError } = await this.supabaseAdmin
          .from("profiles")
          .upsert(defaultProfile)
          .select()

        if (createError) {
          console.error("Error creating default profile:", createError)
          return defaultProfile // Return the default even if save failed
        }

        return newProfile?.[0] || defaultProfile
      }

      // Normal case - exactly one profile found
      return data[0]
    } catch (error) {
      console.error("Error in getUserProfile:", error)
      // Return a fallback profile to prevent breaking the UI
      return {
        id: userId,
        display_name: "",
        onboarding_step: 1,
        onboarding_completed: false,
        experience_level: "beginner",
        goals: [],
      }
    }
  }

  // User preferences management
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await this.supabase.from("user_preferences").select("*").eq("user_id", userId).single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error
        console.error("Error fetching user preferences:", error)
        return null
      }

      return data || this.getDefaultPreferences()
    } catch (error) {
      console.error("Error in getUserPreferences:", error)
      return this.getDefaultPreferences()
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const { error } = await this.supabaseAdmin.from("user_preferences").upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

      if (error) {
        console.error("Error updating user preferences:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in updateUserPreferences:", error)
      return false
    }
  }

  // Activity tracking
  async trackUserActivity(
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabaseAdmin.from("user_activity").insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error tracking user activity:", error)
    }
  }

  // Agent metrics
  async recordAgentMetric(
    agentId: string,
    metricType: string,
    metricValue: number,
    metricUnit?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabaseAdmin.from("agent_metrics").insert({
        agent_id: agentId,
        metric_type: metricType,
        metric_value: metricValue,
        metric_unit: metricUnit,
        metadata: metadata || {},
        recorded_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error recording agent metric:", error)
    }
  }

  // Task execution logging
  async logTaskExecution(
    taskId: string,
    executionStep: string,
    status: "started" | "in_progress" | "completed" | "failed" | "cancelled",
    durationMs?: number,
    errorMessage?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabaseAdmin.from("task_execution_logs").insert({
        task_id: taskId,
        execution_step: executionStep,
        status,
        duration_ms: durationMs,
        error_message: errorMessage,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error logging task execution:", error)
    }
  }

  // Business intelligence queries
  async getUserEngagementMetrics(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from("user_engagement_metrics")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error fetching user engagement metrics:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in getUserEngagementMetrics:", error)
      return null
    }
  }

  async getAgentPerformanceSummary(agentId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from("agent_performance_summary")
        .select("*")
        .eq("agent_id", agentId)
        .single()

      if (error) {
        console.error("Error fetching agent performance summary:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in getAgentPerformanceSummary:", error)
      return null
    }
  }

  // Onboarding management
  async updateOnboardingProgress(userId: string, step: number, completed = false): Promise<boolean> {
    try {
      const { error } = await this.supabaseAdmin
        .from("profiles")
        .update({
          onboarding_step: step,
          onboarding_completed: completed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) {
        console.error("Error updating onboarding progress:", error)
        return false
      }

      // Track the activity
      await this.trackUserActivity(userId, "onboarding_progress", "onboarding", undefined, {
        step,
        completed,
      })

      return true
    } catch (error) {
      console.error("Error in updateOnboardingProgress:", error)
      return false
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: "light",
      language: "en",
      timezone: "UTC",
      notification_settings: {
        email: true,
        push: true,
        inApp: true,
        frequency: "immediate",
      },
      dashboard_layout: {
        widgets: [],
        columns: 3,
      },
      feature_flags: {},
    }
  }
}
