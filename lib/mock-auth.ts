export interface MockUser {
  id: string
  email: string
  user_metadata: {
    display_name?: string
  }
}

export interface MockSession {
  user: MockUser
  access_token: string
  refresh_token: string
  expires_at: number
}

// Mock user data
const MOCK_USER: MockUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "demo@agentflow.com",
  user_metadata: {
    display_name: "Demo User",
  },
}

// Mock session data
const MOCK_SESSION: MockSession = {
  user: MOCK_USER,
  access_token: "mock_access_token",
  refresh_token: "mock_refresh_token",
  expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
}

export function getMockUser(): MockUser {
  return MOCK_USER
}

export function getMockSession(): MockSession {
  return MOCK_SESSION
}

export function getMockAuth() {
  return {
    getUser: async () => ({
      data: { user: MOCK_USER },
      error: null,
    }),
    getSession: async () => ({
      data: { session: MOCK_SESSION },
      error: null,
    }),
    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      // Immediately call with signed in state
      setTimeout(() => callback("SIGNED_IN", MOCK_SESSION), 0)

      // Return unsubscribe function
      return {
        data: { subscription: { unsubscribe: () => {} } },
      }
    },
  }
}
