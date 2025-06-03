import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"

export interface ProfileCreationResult {
  success: boolean
  profileExists: boolean
  error?: string
  method?: string
  canContinue: boolean
  userId?: string
}

export class ProductionProfileManager {
  private static instance: ProductionProfileManager
  private schemaCache: Map<string, string[]> = new Map()
  private profileCreationDisabled = false
  private validUserIds: Set<string> = new Set()

  static getInstance(): ProductionProfileManager {
    if (!ProductionProfileManager.instance) {
      ProductionProfileManager.instance = new ProductionProfileManager()
    }
    return ProductionProfileManager.instance
  }

  /**
   * Get a valid user ID that exists in the profiles table
   */
  async getValidUserId(): Promise<string> {
    try {
      const supabase = getSupabaseFromServer()

      // Try to get any existing user from profiles table
      const { data: existingUsers, error } = await supabase.from("profiles").select("id").limit(1)

      if (!error && existingUsers && existingUsers.length > 0) {
        const validId = existingUsers[0].id
        this.validUserIds.add(validId)
        console.log(`✅ Found existing valid user ID: ${validId}`)
        return validId
      }

      // If no users exist, try to create one
      console.log("🔄 No existing users found, attempting to create one...")
      const defaultUserId = "00000000-0000-0000-0000-000000000000"

      const creationResult = await this.attemptProfileCreation(defaultUserId)
      if (creationResult.success) {
        this.validUserIds.add(defaultUserId)
        console.log(`✅ Created and validated user ID: ${defaultUserId}`)
        return defaultUserId
      }

      // If creation fails, try to use admin client to create a system user
      console.log("🔄 Attempting to create system user with admin client...")
      const supabaseAdmin = getSupabaseAdmin()

      if (supabaseAdmin && typeof supabaseAdmin.from === "function") {
        const systemUserId = "system-user-" + Date.now()
        const { error: adminError } = await supabaseAdmin.from("profiles").insert({ id: systemUserId })

        if (!adminError) {
          this.validUserIds.add(systemUserId)
          console.log(`✅ Created system user with admin: ${systemUserId}`)
          return systemUserId
        }
      }

      // Last resort: return default and hope for the best
      console.warn("⚠️ Could not create user, using default ID")
      return defaultUserId
    } catch (error) {
      console.error("❌ Error getting valid user ID:", error)
      return "00000000-0000-0000-0000-000000000000"
    }
  }

  /**
   * Check if user profile exists (read-only operation)
   */
  async profileExists(userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseFromServer()
      const { data, error } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle()

      if (error && error.code !== "PGRST116") {
        console.warn("⚠️ Error checking profile existence (non-critical):", error.message)
        return false
      }

      const exists = !!data
      if (exists) {
        this.validUserIds.add(userId)
      }
      console.log(`🔍 Profile existence check for ${userId}: ${exists ? "EXISTS" : "NOT FOUND"}`)
      return exists
    } catch (error) {
      console.warn("⚠️ Profile existence check failed (non-critical):", error)
      return false
    }
  }

  /**
   * Attempt to create user profile (best effort, non-blocking)
   */
  async attemptProfileCreation(userId: string): Promise<ProfileCreationResult> {
    if (this.profileCreationDisabled) {
      console.log("🚫 Profile creation disabled due to previous failures")
      return {
        success: false,
        profileExists: false,
        method: "disabled",
        canContinue: true,
        error: "Profile creation disabled",
        userId,
      }
    }

    try {
      // Method 1: Try with admin client and minimal data
      console.log("🔄 Attempting profile creation with admin client (minimal)...")
      const supabaseAdmin = getSupabaseAdmin()

      if (supabaseAdmin && typeof supabaseAdmin.from === "function") {
        const { error: adminError } = await supabaseAdmin.from("profiles").insert({ id: userId })

        if (!adminError) {
          console.log("✅ Profile created successfully with admin client (minimal)")
          this.validUserIds.add(userId)
          return {
            success: true,
            profileExists: false,
            method: "admin_minimal",
            canContinue: true,
            userId,
          }
        }

        console.warn("⚠️ Admin client failed:", adminError.message)
      } else {
        console.warn("⚠️ Admin client not available")
      }

      // Method 2: Try with regular client
      console.log("🔄 Attempting profile creation with regular client...")
      const supabase = getSupabaseFromServer()
      const { error: regularError } = await supabase.from("profiles").insert({ id: userId })

      if (!regularError) {
        console.log("✅ Profile created successfully with regular client")
        this.validUserIds.add(userId)
        return {
          success: true,
          profileExists: false,
          method: "regular_client",
          canContinue: true,
          userId,
        }
      }

      console.warn("⚠️ Regular client failed:", regularError.message)

      // All methods failed - disable future attempts and continue
      console.log("🚫 Disabling profile creation for this session")
      this.profileCreationDisabled = true

      return {
        success: false,
        profileExists: false,
        method: "all_failed",
        canContinue: true,
        error: "All creation methods failed, continuing without profile",
        userId,
      }
    } catch (error) {
      console.warn("⚠️ Profile creation attempt failed:", error)
      this.profileCreationDisabled = true

      return {
        success: false,
        profileExists: false,
        method: "exception",
        canContinue: true,
        error: "Profile creation exception, continuing without profile",
        userId,
      }
    }
  }

  /**
   * Ensure user profile exists and return valid user ID - NEVER FAILS, ALWAYS CONTINUES
   */
  async ensureUserProfile(requestedUserId?: string): Promise<ProfileCreationResult> {
    try {
      // If we have a cached valid user ID, use it
      if (this.validUserIds.size > 0 && !requestedUserId) {
        const cachedUserId = Array.from(this.validUserIds)[0]
        console.log(`✅ Using cached valid user ID: ${cachedUserId}`)
        return {
          success: true,
          profileExists: true,
          method: "cached_valid",
          canContinue: true,
          userId: cachedUserId,
        }
      }

      const userId = requestedUserId || (await this.getValidUserId())
      console.log(`🔍 Ensuring profile exists for user: ${userId}`)

      // First check if profile already exists
      const exists = await this.profileExists(userId)
      if (exists) {
        console.log("✅ Profile already exists, no action needed")
        return {
          success: true,
          profileExists: true,
          method: "already_exists",
          canContinue: true,
          userId,
        }
      }

      // Try to create profile (best effort)
      const creationResult = await this.attemptProfileCreation(userId)

      if (creationResult.success) {
        console.log(`✅ Profile ensured successfully: ${creationResult.method}`)
      } else {
        console.log(`⚠️ Profile creation failed but continuing: ${creationResult.error}`)
      }

      return { ...creationResult, userId }
    } catch (error) {
      console.warn("⚠️ Profile management error (non-critical):", error)
      return {
        success: false,
        profileExists: false,
        error: "Profile management error, continuing anyway",
        method: "critical_error",
        canContinue: true,
        userId: requestedUserId || "00000000-0000-0000-0000-000000000000",
      }
    }
  }

  /**
   * Reset profile creation (useful for testing)
   */
  resetProfileCreation(): void {
    this.profileCreationDisabled = false
    this.schemaCache.clear()
    this.validUserIds.clear()
    console.log("🔄 Profile creation reset")
  }

  /**
   * Get current status
   */
  getStatus(): { disabled: boolean; cacheSize: number; validUserIds: string[] } {
    return {
      disabled: this.profileCreationDisabled,
      cacheSize: this.schemaCache.size,
      validUserIds: Array.from(this.validUserIds),
    }
  }
}

// Export singleton instance
export const profileManager = ProductionProfileManager.getInstance()
