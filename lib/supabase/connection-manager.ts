import type { SupabaseClient } from "@supabase/supabase-js"

interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
}

export class ConnectionManager {
  private static instance: ConnectionManager
  private connectionStatus: "unknown" | "connected" | "failed" = "unknown"
  private config: SupabaseConfig | null = null
  private mockClient: any = null

  private constructor() {
    this.initializeConfig()
    this.createMockClient()
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager()
    }
    return ConnectionManager.instance
  }

  private initializeConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (url && anonKey && url !== "" && anonKey !== "") {
      this.config = { url, anonKey, serviceRoleKey }
      console.log("✅ Supabase configuration found")
    } else {
      console.log("⚠️ Supabase configuration missing or empty")
    }
  }

  private createMockClient() {
    this.mockClient = {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => Promise.resolve({ error: null }),
        admin: {
          createUser: () => Promise.resolve({ data: null, error: null }),
          getUserById: () =>
            Promise.resolve({
              data: {
                user: {
                  id: "00000000-0000-0000-0000-000000000000",
                  email: "mock@example.com",
                  created_at: new Date().toISOString(),
                },
              },
              error: null,
            }),
        },
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => Promise.resolve({ data: null, error: null }),
            order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
            limit: (count: number) => Promise.resolve({ data: [], error: null }),
          }),
          order: (column: string, options?: any) => ({
            limit: (count: number) => Promise.resolve({ data: [], error: null }),
          }),
          limit: (count: number) => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          or: (query: string) => Promise.resolve({ data: [], error: null }),
        }),
        insert: (data: any) => ({
          select: (columns?: string) => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: `mock_${Date.now()}`,
                  ...data,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
          }),
        }),
        update: (data: any) => ({
          eq: (column: string, value: any) => Promise.resolve({ data: null, error: null, count: 1 }),
        }),
        delete: () => ({
          eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
        }),
        upsert: (data: any) => Promise.resolve({ data: null, error: null }),
      }),
      channel: (name: string) => ({
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {},
        unsubscribe: () => {},
      }),
      removeChannel: () => {},
      removeAllChannels: () => {},
    }
  }

  isConfigured(): boolean {
    return this.config !== null
  }

  isAdminConfigured(): boolean {
    return this.config !== null && !!this.config.serviceRoleKey
  }

  getConfig(): SupabaseConfig {
    if (!this.config) {
      throw new Error("Supabase configuration not available")
    }
    return this.config
  }

  getMockClient(): any {
    return this.mockClient
  }

  async testConnection(client: SupabaseClient): Promise<boolean> {
    try {
      // Simple test query to verify connection
      const { data, error } = await client.from("profiles").select("id").limit(1)

      if (error) {
        console.warn("⚠️ Connection test failed:", error.message)
        this.connectionStatus = "failed"
        return false
      }

      console.log("✅ Connection test successful")
      this.connectionStatus = "connected"
      return true
    } catch (error) {
      console.error("❌ Connection test error:", error)
      this.connectionStatus = "failed"
      return false
    }
  }

  getConnectionStatus(): "unknown" | "connected" | "failed" {
    return this.connectionStatus
  }

  setConnectionStatus(status: "unknown" | "connected" | "failed") {
    this.connectionStatus = status
  }
}
