import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"

/**
 * Simple LLM provider interface for user-configured providers
 */
export interface UserLLMProvider {
  generateText(options: {
    prompt: string
    maxTokens?: number
    temperature?: number
    provider?: string
    model?: string
  }): Promise<string>
}

/**
 * Get user's LLM provider instance
 */
export async function getUserLLMProvider(userId?: string): Promise<UserLLMProvider | null> {
  try {
    console.log("🔍 Getting user LLM provider for user:", userId)

    // Get the actual user ID if not provided
    let actualUserId = userId
    if (!actualUserId) {
      try {
        actualUserId = await getDefaultUserId()
        console.log("✅ Got default user ID:", actualUserId)
      } catch (error) {
        console.error("❌ Failed to get user ID:", error)
        return null
      }
    }

    // Check if user has API keys configured directly
    const supabase = getSupabaseFromServer()
    const { data: apiKeys, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", actualUserId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching API keys:", error)
      return null
    }

    if (!apiKeys || apiKeys.length === 0) {
      console.log("❌ No API keys found for user:", actualUserId)
      return null
    }

    console.log(
      "✅ Found API keys for providers:",
      apiKeys.map((k) => k.provider),
    )

    // Import the multi-LLM provider
    const { multiLLMProvider } = await import("@/lib/multi-llm-provider")

    // Return a provider that uses the actual multi-LLM system
    return {
      generateText: async (options: {
        prompt: string
        maxTokens?: number
        temperature?: number
        provider?: string
        model?: string
      }) => {
        console.log("🤖 Generating text with LLM provider...")
        console.log("👤 User ID:", actualUserId)
        console.log("🔧 Provider requested:", options.provider || "auto")
        console.log("📝 Prompt preview:", options.prompt.substring(0, 100) + "...")

        try {
          // Force detection of available providers with the specific user ID
          await multiLLMProvider.detectAvailableProviders()
          const availableProviders = multiLLMProvider.getAvailableProviders()

          console.log("🔍 Available providers after detection:", availableProviders)

          if (availableProviders.length === 0) {
            throw new Error("No LLM providers available. Please check your API key configuration.")
          }

          // Use the first available provider if none specified
          const targetProvider = options.provider || availableProviders[0]
          console.log("🎯 Using provider:", targetProvider)

          const result = await multiLLMProvider.sendMessage(
            [
              { role: "system", content: "You are a helpful AI assistant that generates structured responses." },
              { role: "user", content: options.prompt },
            ],
            {
              provider: targetProvider,
              model: options.model,
              temperature: options.temperature || 0.7,
              maxTokens: options.maxTokens || 2000,
              userId: actualUserId, // Pass the actual user ID
            },
          )

          if ("error" in result) {
            console.error("❌ LLM Provider error:", result.error)
            throw new Error(`LLM Provider Error: ${result.error}`)
          }

          console.log("✅ LLM response received successfully")
          console.log("📊 Response length:", result.content.length)
          return result.content
        } catch (error) {
          console.error("❌ Error in generateText:", error)

          // Provide more specific error messages
          if (error instanceof Error) {
            if (error.message.includes("API key not found")) {
              throw new Error(
                `API key not found for the selected provider. Please add an API key in Settings → Profile → API Keys.`,
              )
            }
            throw error
          }

          throw new Error("Unknown error occurred while generating text")
        }
      },
    }
  } catch (error) {
    console.error("❌ Error getting user LLM provider:", error)
    return null
  }
}
