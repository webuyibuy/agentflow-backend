import { getDecryptedApiKey } from "@/app/dashboard/settings/profile/api-key-actions"

export interface LLMProvider {
  id: string
  name: string
  baseUrl: string
  models: string[]
  defaultModel: string
  supportsStreaming: boolean
  maxTokens: number
}

export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model?: string
  finishReason?: string
}

export interface LLMError {
  error: string
  provider: string
  statusCode?: number
}

// Supported LLM providers configuration
export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4-turbo-preview",
      "gpt-4",
      "gpt-4-0613",
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-0125",
    ],
    defaultModel: "gpt-4o-mini",
    supportsStreaming: true,
    maxTokens: 4096,
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
    defaultModel: "claude-3-sonnet-20240229",
    supportsStreaming: true,
    maxTokens: 4096,
  },
  groq: {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"],
    defaultModel: "llama3-70b-8192",
    supportsStreaming: true,
    maxTokens: 8192,
  },
  xai: {
    id: "xai",
    name: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    models: ["grok-beta"],
    defaultModel: "grok-beta",
    supportsStreaming: true,
    maxTokens: 4096,
  },
}

export class MultiLLMProvider {
  private availableProviders: string[] = []
  private preferredProvider: string | null = null

  constructor() {
    this.detectAvailableProviders()
  }

  async detectAvailableProviders(): Promise<void> {
    const providers = Object.keys(LLM_PROVIDERS)
    const available: string[] = []

    for (const providerId of providers) {
      try {
        const apiKey = await getDecryptedApiKey(providerId)
        if (apiKey) {
          available.push(providerId)
        }
      } catch (error) {
        // Provider not available
        console.log(`Provider ${providerId} not available:`, error)
      }
    }

    this.availableProviders = available
    this.preferredProvider = available[0] || null
  }

  async sendMessage(
    messages: LLMMessage[],
    options: {
      provider?: string
      model?: string
      temperature?: number
      maxTokens?: number
      stream?: boolean
      userId?: string
    } = {},
  ): Promise<LLMResponse | LLMError> {
    console.log("🤖 Starting LLM request with options:", options)

    await this.detectAvailableProviders()

    if (this.availableProviders.length === 0) {
      return {
        error: "No LLM providers configured. Please add an API key in Settings → Profile → API Keys.",
        provider: "none",
      }
    }

    const providerId = options.provider || this.preferredProvider || this.availableProviders[0]
    const provider = LLM_PROVIDERS[providerId]

    if (!provider) {
      return {
        error: `Provider ${providerId} not supported`,
        provider: providerId,
      }
    }

    try {
      console.log(`🔑 Getting API key for provider: ${providerId}`)
      const apiKey = await getDecryptedApiKey(providerId, options.userId)
      if (!apiKey) {
        return {
          error: `API key not found for ${provider.name}. Please add one in Settings → Profile → API Keys.`,
          provider: providerId,
        }
      }

      // Get user's preferred model or use the provided model or default
      const { getPreferredModel } = await import("@/app/dashboard/settings/profile/api-key-actions")
      const preferredModel = await getPreferredModel(providerId, options.userId)
      const model = options.model || preferredModel || provider.defaultModel

      const temperature = options.temperature ?? 0.7
      const maxTokens = options.maxTokens || provider.maxTokens

      console.log(`🚀 Calling ${provider.name} with model: ${model}`)

      switch (providerId) {
        case "openai":
        case "groq":
          return await this.callOpenAICompatible(provider, apiKey, messages, {
            model,
            temperature,
            maxTokens,
          })

        case "anthropic":
          return await this.callAnthropic(provider, apiKey, messages, {
            model,
            temperature,
            maxTokens,
          })

        case "xai":
          return await this.callXAI(provider, apiKey, messages, {
            model,
            temperature,
            maxTokens,
          })

        default:
          return {
            error: `Provider ${providerId} implementation not found`,
            provider: providerId,
          }
      }
    } catch (error) {
      console.error(`❌ Error calling ${provider.name}:`, error)
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        provider: providerId,
      }
    }
  }

  private async callOpenAICompatible(
    provider: LLMProvider,
    apiKey: string,
    messages: LLMMessage[],
    options: { model: string; temperature: number; maxTokens: number },
  ): Promise<LLMResponse | LLMError> {
    console.log(`📡 Making request to ${provider.name} API...`)

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`❌ ${provider.name} API error:`, response.status, errorData)
        return {
          error: `${provider.name} API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`,
          provider: provider.id,
          statusCode: response.status,
        }
      }

      const data = await response.json()
      console.log(`✅ ${provider.name} response received successfully`)

      return {
        content: data.choices[0]?.message?.content || "",
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        model: data.model,
        finishReason: data.choices[0]?.finish_reason,
      }
    } catch (error) {
      console.error(`❌ Network error calling ${provider.name}:`, error)
      return {
        error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        provider: provider.id,
      }
    }
  }

  private async callAnthropic(
    provider: LLMProvider,
    apiKey: string,
    messages: LLMMessage[],
    options: { model: string; temperature: number; maxTokens: number },
  ): Promise<LLMResponse | LLMError> {
    console.log(`📡 Making request to ${provider.name} API...`)

    // Convert messages format for Anthropic
    const systemMessage = messages.find((m) => m.role === "system")?.content || ""
    const conversationMessages = messages.filter((m) => m.role !== "system")

    try {
      const response = await fetch(`${provider.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          system: systemMessage,
          messages: conversationMessages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          error: `${provider.name} API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`,
          provider: provider.id,
          statusCode: response.status,
        }
      }

      const data = await response.json()
      console.log(`✅ ${provider.name} response received successfully`)

      return {
        content: data.content[0]?.text || "",
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
              totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            }
          : undefined,
        model: data.model,
        finishReason: data.stop_reason,
      }
    } catch (error) {
      console.error(`❌ Network error calling ${provider.name}:`, error)
      return {
        error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        provider: provider.id,
      }
    }
  }

  private async callXAI(
    provider: LLMProvider,
    apiKey: string,
    messages: LLMMessage[],
    options: { model: string; temperature: number; maxTokens: number },
  ): Promise<LLMResponse | LLMError> {
    // xAI uses OpenAI-compatible format
    return this.callOpenAICompatible(provider, apiKey, messages, options)
  }

  getAvailableProviders(): string[] {
    return [...this.availableProviders]
  }

  getProviderInfo(providerId: string): LLMProvider | null {
    return LLM_PROVIDERS[providerId] || null
  }

  setPreferredProvider(providerId: string): boolean {
    if (this.availableProviders.includes(providerId)) {
      this.preferredProvider = providerId
      return true
    }
    return false
  }

  getPreferredProvider(): string | null {
    return this.preferredProvider
  }

  async testProvider(providerId: string): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now()

    try {
      const result = await this.sendMessage(
        [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say 'Hello' in one word." },
        ],
        { provider: providerId, maxTokens: 10 },
      )

      const latency = Date.now() - startTime

      if ("error" in result) {
        return { success: false, error: result.error, latency }
      }

      return { success: true, latency }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
      }
    }
  }

  async getUserPreferredModel(providerId: string, userId?: string): Promise<string | null> {
    try {
      const { getPreferredModel } = await import("@/app/dashboard/settings/profile/api-key-actions")
      return await getPreferredModel(providerId, userId)
    } catch (error) {
      console.error("Error getting user preferred model:", error)
      return null
    }
  }
}

// Singleton instance
export const multiLLMProvider = new MultiLLMProvider()
