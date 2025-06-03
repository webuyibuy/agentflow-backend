export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000" // A fixed, known UUID
export const DEFAULT_USER_DISPLAY_NAME = "Default User"

export async function getDefaultUserId(): Promise<string> {
  // Simply return the default user ID without any Supabase calls
  return DEFAULT_USER_ID
}

// Remove the problematic admin client functions that cause connection errors
export function getAdminSupabaseClient(): never {
  throw new Error("Admin Supabase client disabled to prevent connection errors")
}

// Mock admin client that doesn't actually connect
export const mockAdminSupabase = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  auth: {
    admin: {
      createUser: () => Promise.resolve({ data: null, error: null }),
      getUserById: () => Promise.resolve({ data: null, error: null }),
    },
  },
}
