// This file is for SERVER-SIDE Supabase usage only.
// Uses next/headers and cookies().
// Only import this in Server Components, Server Actions, or API routes in /app.
// Do NOT import into Client Components or shared code that runs on the client.
// For client-side logic, use /lib/supabase/client.ts instead.
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ConnectionManager } from "./connection-manager"

export function getSupabaseFromServer() {
  const connectionManager = ConnectionManager.getInstance()

  if (!connectionManager.isConfigured()) {
    console.log("🔄 Using mock Supabase server client - environment not configured")
    return connectionManager.getMockClient()
  }

  try {
    const config = connectionManager.getConfig()
    const cookieStore = cookies()

    const client = createServerClient(config.url, config.anonKey, {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value
          } catch (error) {
            console.warn("Could not get cookie:", name, error)
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.warn("Could not set cookie:", name, error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch (error) {
            console.warn("Could not remove cookie:", name, error)
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })

    console.log("✅ Real Supabase server client initialized")
    return client
  } catch (error) {
    console.error("❌ Failed to initialize Supabase server client:", error)
    return connectionManager.getMockClient()
  }
}

export function getSupabaseAdmin(): SupabaseClient {
  const connectionManager = ConnectionManager.getInstance()

  if (!connectionManager.isAdminConfigured()) {
    console.log("🔄 Using mock Supabase admin client - service role not configured")
    return connectionManager.getMockClient()
  }

  try {
    const config = connectionManager.getConfig()

    // Create admin client with service role key (bypasses RLS)
    const adminClient = createClient(config.url, config.serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })

    console.log("✅ Real Supabase admin client initialized with service role")
    return adminClient
  } catch (error) {
    console.error("❌ Failed to initialize Supabase admin client:", error)
    return connectionManager.getMockClient()
  }
}
