import { createClient } from "@supabase/supabase-js"

// Function to check if the application is running in a production environment
export const isProduction = () => process.env.NODE_ENV === "production"

// Function to validate required environment variables
export const validateEnvVars = () => {
  const requiredEnvVars = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  }

  for (const key in requiredEnvVars) {
    if (!requiredEnvVars[key]) {
      throw new Error(`Missing environment variable: ${key}`)
    }
  }

  return true
}

// Function to check Supabase connection
export const checkSupabaseConnection = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Supabase URL or Anon Key not found, skipping connection test.")
      return false
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.from("users").select("*").limit(1) // Attempt a simple query

    if (error) {
      console.error("Supabase connection error:", error)
      return false
    }

    console.log("Supabase connection successful.")
    return true
  } catch (error) {
    console.error("Error checking Supabase connection:", error)
    return false
  }
}

// Main function to check production deployment status
export const checkProductionDeployment = async () => {
  if (!isProduction()) {
    console.log("Not running in a production environment. Skipping production deployment checks.")
    return
  }

  try {
    console.log("Running production deployment checks...")

    validateEnvVars()
    console.log("Environment variables validated.")

    const supabaseConnected = await checkSupabaseConnection()
    if (!supabaseConnected) {
      throw new Error("Failed to connect to Supabase.")
    }

    console.log("Production deployment checks passed!")
  } catch (error: any) {
    console.error("Production deployment checks failed:", error.message)
    process.exit(1) // Exit with a non-zero code to indicate failure
  }
}
