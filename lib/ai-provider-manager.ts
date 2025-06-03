import { errorHandler } from "@/lib/error-handler"
import { getDecryptedApiKey } from "@/app/dashboard/settings/profile/api-key-actions"

export interface LLMRequest {
  prompt: string
  model?: string
  maxTokens?: number
  temperature?: number
  userId?: string
  timeout?: number
  retries?: number
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  provider: string
  model: string
  success: boolean
  error?: string
}

export class AIProviderManager {
  private static instance: AIProviderManager
  private providerStatus = new Map<string, { available: boolean; lastCheck: Date; errorCount: number }>()

  static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager()
    }
    return AIProviderManager.instance
  }

  async executeRequest(request: LLMRequest): Promise<LLMResponse> {
    const maxRetries = request.retries || 3
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const provider = await this.selectBestProvider(request)
        if (!provider) {
          throw new Error("No available AI providers")
        }

        const response = await this.callProvider(provider, request)

        // Update provider status on success
        this.updateProviderStatus(provider, true)

        return {
          ...response,
          success: true,
          provider,
        }
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries) {
          const errorId = errorHandler.captureError(lastError, {
            action: "ai_request",
            component: "ai_provider",
            userId: request.userId,
            severity: "high",
            metadata: { attempt, maxRetries, prompt: request.prompt.substring(0, 100) },
          })

          return {
            content: "",
            provider: "unknown",
            model: request.model || "unknown",
            success: false,
            error: `AI request failed after ${maxRetries} attempts. Error ID: ${errorId}`,
          }
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    return {
      content: "",
      provider: "unknown",
      model: request.model || "unknown",
      success: false,
      error: "Maximum retries exceeded",
    }
  }

  private async selectBestProvider(request: LLMRequest): Promise<string | null> {
    const providers = ["openai", "anthropic", "groq", "xai"]

    for (const provider of providers) {
      try {
        // Check if provider has valid API key
        const apiKey = await getDecryptedApiKey(provider, request.userId)
        if (!apiKey) continue

        // Check provider status
        const status = this.providerStatus.get(provider)
        if (status && !status.available) continue

        return provider
      } catch (error) {
        continue
      }
    }

    return null
  }

  private async callProvider(
    provider: string,
    request: LLMRequest,
  ): Promise<Omit<LLMResponse, "success" | "provider">> {
    const apiKey = await getDecryptedApiKey(provider, request.userId)
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${provider}`)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), request.timeout || 30000)

    try {
      let response: Response

      switch (provider) {
        case "openai":
          response = await this.callOpenAI(apiKey, request, controller.signal)
          break
        case "anthropic":
          response = await this.callAnthropic(apiKey, request, controller.signal)
          break
        case "groq":
          response = await this.callGroq(apiKey, request, controller.signal)
          break
        case "xai":
          response = await this.callXAI(apiKey, request, controller.signal)
          break
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`${provider} API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      return this.parseProviderResponse(provider, data, request.model || "default")
    } catch (error) {
      clearTimeout(timeoutId)
      this.updateProviderStatus(provider, false)
      throw error
    }
  }

  private async callOpenAI(apiKey: string, request: LLMRequest, signal: AbortSignal): Promise<Response> {
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: request.prompt },
        ],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
      }),
      signal,
    })
  }

  private async callAnthropic(apiKey: string, request: LLMRequest, signal: AbortSignal): Promise<Response> {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: request.model || "claude-3-haiku-20240307",
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        messages: [{ role: "user", content: request.prompt }],
      }),
      signal,
    })
  }

  private async callGroq(apiKey: string, request: LLMRequest, signal: AbortSignal): Promise<Response> {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: request.prompt },
        ],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
      }),
      signal,
    })
  }

  private async callXAI(apiKey: string, request: LLMRequest, signal: AbortSignal): Promise<Response> {
    return fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || "grok-beta",
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: request.prompt },
        ],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
      }),
      signal,
    })
  }

  private parseProviderResponse(provider: string, data: any, model: string): Omit<LLMResponse, "success" | "provider"> {
    switch (provider) {
      case "openai":
      case "groq":
      case "xai":
        return {
          content: data.choices?.[0]?.message?.content || "",
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
          model: data.model || model,
        }

      case "anthropic":
        return {
          content: data.content?.[0]?.text || "",
          usage: data.usage
            ? {
                promptTokens: data.usage.input_tokens,
                completionTokens: data.usage.output_tokens,
                totalTokens: data.usage.input_tokens + data.usage.output_tokens,
              }
            : undefined,
          model: data.model || model,
        }

      default:
        return {
          content: "",
          model,
          error: `Unknown provider response format: ${provider}`,
        }
    }
  }

  private updateProviderStatus(provider: string, success: boolean): void {
    const status = this.providerStatus.get(provider) || {
      available: true,
      lastCheck: new Date(),
      errorCount: 0,
    }

    if (success) {
      status.available = true
      status.errorCount = 0
    } else {
      status.errorCount++
      if (status.errorCount >= 3) {
        status.available = false
      }
    }

    status.lastCheck = new Date()
    this.providerStatus.set(provider, status)
  }

  async testProvider(
    provider: string,
    userId?: string,
  ): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now()

    try {
      const response = await this.executeRequest({
        prompt: 'Say "Hello" in one word.',
        model: this.getDefaultModel(provider),
        maxTokens: 10,
        userId,
        timeout: 10000,
        retries: 1,
      })

      const latency = Date.now() - startTime

      if (!response.success) {
        return { success: false, error: response.error, latency }
      }

      return { success: true, latency }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        latency: Date.now() - startTime,
      }
    }
  }

  private getDefaultModel(provider: string): string {
    const defaults = {
      openai: "gpt-4o-mini",
      anthropic: "claude-3-haiku-20240307",
      groq: "llama-3.1-8b-instant",
      xai: "grok-beta",
    }
    return defaults[provider as keyof typeof defaults] || "default"
  }

  getProviderStatus(): Record<string, { available: boolean; lastCheck: Date; errorCount: number }> {
    const status: Record<string, any> = {}
    this.providerStatus.forEach((value, key) => {
      status[key] = value
    })
    return status
  }
}

export const aiProvider = AIProviderManager.getInstance()
