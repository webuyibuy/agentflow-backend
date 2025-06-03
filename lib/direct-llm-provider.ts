import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { decrypt } from "@/lib/encryption"

export interface DirectLLMProvider {
  generateText(options: {
    prompt: string
    maxTokens?: number
    temperature?: number
  }): Promise<string>
}

export async function getDirectLLMProvider(userId?: string): Promise<DirectLLMProvider | null> {
  try {
    console.log("🔍 Getting direct LLM provider for user:", userId)

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

    // Get API keys directly from database
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

    // Find the first available provider and decrypt its key
    let selectedProvider: string | null = null
    let decryptedApiKey: string | null = null

    for (const apiKey of apiKeys) {
      try {
        const decrypted = decrypt(apiKey.encrypted_key)
        if (decrypted && decrypted.length > 10) {
          selectedProvider = apiKey.provider
          decryptedApiKey = decrypted
          console.log("✅ Successfully decrypted API key for:", selectedProvider)
          break
        }
      } catch (decryptError) {
        console.error(`❌ Failed to decrypt key for ${apiKey.provider}:`, decryptError)
        continue
      }
    }

    if (!selectedProvider || !decryptedApiKey) {
      console.error("❌ No valid API keys could be decrypted")
      return null
    }

    // Return a direct provider based on the selected provider
    return {
      generateText: async (options: {
        prompt: string
        maxTokens?: number
        temperature?: number
      }) => {
        console.log("🤖 Generating text with direct LLM provider")
        console.log("🔧 Provider:", selectedProvider)
        console.log("📝 Prompt preview:", options.prompt.substring(0, 100) + "...")

        try {
          if (selectedProvider === "openai") {
            return await callOpenAI(decryptedApiKey!, options)
          } else if (selectedProvider === "anthropic") {
            return await callAnthropic(decryptedApiKey!, options)
          } else if (selectedProvider === "groq") {
            return await callGroq(decryptedApiKey!, options)
          } else if (selectedProvider === "xai") {
            return await callXAI(decryptedApiKey!, options)
          } else {
            throw new Error(`Unsupported provider: ${selectedProvider}`)
          }
        } catch (error) {
          console.error("❌ Error calling LLM provider:", error)
          throw error
        }
      },
    }
  } catch (error) {
    console.error("❌ Error getting direct LLM provider:", error)
    return null
  }
}

async function callOpenAI(
  apiKey: string,
  options: { prompt: string; maxTokens?: number; temperature?: number },
): Promise<string> {
  console.log("🔵 Calling OpenAI API...")

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that generates structured responses.",
        },
        {
          role: "user",
          content: options.prompt,
        },
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error("❌ OpenAI API error:", response.status, errorData)
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  console.log("✅ OpenAI response received")

  return data.choices[0]?.message?.content || ""
}

async function callAnthropic(
  apiKey: string,
  options: { prompt: string; maxTokens?: number; temperature?: number },
): Promise<string> {
  console.log("🟣 Calling Anthropic API...")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      messages: [
        {
          role: "user",
          content: options.prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error("❌ Anthropic API error:", response.status, errorData)
    throw new Error(`Anthropic API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  console.log("✅ Anthropic response received")

  return data.content[0]?.text || ""
}

async function callGroq(
  apiKey: string,
  options: { prompt: string; maxTokens?: number; temperature?: number },
): Promise<string> {
  console.log("🟢 Calling Groq API...")

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that generates structured responses.",
        },
        {
          role: "user",
          content: options.prompt,
        },
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error("❌ Groq API error:", response.status, errorData)
    throw new Error(`Groq API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  console.log("✅ Groq response received")

  return data.choices[0]?.message?.content || ""
}

async function callXAI(
  apiKey: string,
  options: { prompt: string; maxTokens?: number; temperature?: number },
): Promise<string> {
  console.log("🔴 Calling xAI API...")

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-beta",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that generates structured responses.",
        },
        {
          role: "user",
          content: options.prompt,
        },
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error("❌ xAI API error:", response.status, errorData)
    throw new Error(`xAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  console.log("✅ xAI response received")

  return data.choices[0]?.message?.content || ""
}
