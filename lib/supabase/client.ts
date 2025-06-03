import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ConnectionManager } from "./connection-manager"

let supabaseClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  // Return existing client if available
  if (supabaseClient) {
    return supabaseClient
  }

  const connectionManager = ConnectionManager.getInstance()

  if (!connectionManager.isConfigured()) {
    console.log("🔄 Using mock Supabase browser client - environment not configured")
    supabaseClient = connectionManager.getMockClient()
    return supabaseClient
  }

  try {
    const config = connectionManager.getConfig()

    supabaseClient = createBrowserClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

    console.log("✅ Real Supabase browser client initialized")
    return supabaseClient
  } catch (error) {
    console.error("❌ Failed to initialize Supabase browser client:", error)
    supabaseClient = connectionManager.getMockClient()
    return supabaseClient
  }
}

// Reset client function for testing or when switching environments
export function resetSupabaseClient() {
  supabaseClient = null
}
