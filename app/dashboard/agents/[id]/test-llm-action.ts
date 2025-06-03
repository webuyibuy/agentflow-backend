"use server"

import { LLMService } from "@/lib/llm-service"
import { getDefaultUserId } from "@/lib/default-user"

export interface TestLLMResult {
  success: boolean
  response?: string
  error?: string
  provider?: string
  model?: string
  latency?: number
}

export async function testLLMConnection(): Promise<TestLLMResult> {
  console.log("🧪 Testing LLM connection...")

  try {
    const userId = await getDefaultUserId()
    const startTime = Date.now()

    const result = await LLMService.generateText("Say 'Hello from AgentFlow!' in exactly those words.", {
      systemPrompt: "You are a helpful assistant. Respond exactly as requested.",
      temperature: 0.1,
      maxTokens: 50,
      userId,
    })

    const latency = Date.now() - startTime

    if ("error" in result) {
      console.error("❌ LLM test failed:", result.error)
      return {
        success: false,
        error: result.error,
        provider: result.provider,
        latency,
      }
    }

    console.log("✅ LLM test successful:", result.content)
    return {
      success: true,
      response: result.content,
      model: result.model,
      latency,
    }
  } catch (error) {
    console.error("❌ Unexpected error in LLM test:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
