import { multiLLMProvider } from "@/lib/multi-llm-provider"
import { getDefaultUserId } from "@/lib/default-user"

export interface AITestResult {
  functionName: string
  status: "success" | "error" | "warning"
  message: string
  executionTime: number
  details?: any
}

export interface AISystemHealth {
  overallStatus: "healthy" | "degraded" | "critical"
  testResults: AITestResult[]
  availableProviders: string[]
  recommendedActions: string[]
}

export class AIFunctionTester {
  private userId: string | null = null

  async initialize(): Promise<void> {
    try {
      this.userId = await getDefaultUserId()
      console.log("✅ AI Function Tester initialized with user:", this.userId)
    } catch (error) {
      console.error("❌ Failed to initialize AI Function Tester:", error)
      throw new Error("Authentication required for AI testing")
    }
  }

  async runComprehensiveTest(): Promise<AISystemHealth> {
    if (!this.userId) {
      await this.initialize()
    }

    const testResults: AITestResult[] = []
    const startTime = Date.now()

    console.log("🧪 Starting comprehensive AI function tests...")

    // Test 1: Multi-LLM Provider Detection
    testResults.push(await this.testProviderDetection())

    // Test 2: Basic Text Generation
    testResults.push(await this.testBasicTextGeneration())

    // Test 3: Agent Task Generation
    testResults.push(await this.testAgentTaskGeneration())

    // Test 4: Question Generation
    testResults.push(await this.testQuestionGeneration())

    // Test 5: Conversation Handling
    testResults.push(await this.testConversationHandling())

    // Test 6: JSON Generation
    testResults.push(await this.testJSONGeneration())

    // Test 7: Error Handling
    testResults.push(await this.testErrorHandling())

    const totalTime = Date.now() - startTime
    console.log(`🏁 AI tests completed in ${totalTime}ms`)

    // Analyze results
    const successCount = testResults.filter((r) => r.status === "success").length
    const errorCount = testResults.filter((r) => r.status === "error").length
    const warningCount = testResults.filter((r) => r.status === "warning").length

    let overallStatus: "healthy" | "degraded" | "critical"
    if (errorCount === 0 && warningCount === 0) {
      overallStatus = "healthy"
    } else if (errorCount === 0 && warningCount > 0) {
      overallStatus = "degraded"
    } else {
      overallStatus = "critical"
    }

    // Get available providers
    await multiLLMProvider.detectAvailableProviders()
    const availableProviders = multiLLMProvider.getAvailableProviders()

    // Generate recommendations
    const recommendedActions = this.generateRecommendations(testResults, availableProviders)

    return {
      overallStatus,
      testResults,
      availableProviders,
      recommendedActions,
    }
  }

  private async testProviderDetection(): Promise<AITestResult> {
    const startTime = Date.now()
    try {
      console.log("🔍 Testing provider detection...")

      await multiLLMProvider.detectAvailableProviders()
      const providers = multiLLMProvider.getAvailableProviders()

      if (providers.length === 0) {
        return {
          functionName: "Provider Detection",
          status: "error",
          message: "No LLM providers configured. User needs to add API keys.",
          executionTime: Date.now() - startTime,
          details: { configuredProviders: 0 },
        }
      }

      return {
        functionName: "Provider Detection",
        status: "success",
        message: `Found ${providers.length} configured provider(s): ${providers.join(", ")}`,
        executionTime: Date.now() - startTime,
        details: { providers, count: providers.length },
      }
    } catch (error) {
      return {
        functionName: "Provider Detection",
        status: "error",
        message: `Provider detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  private async testBasicTextGeneration(): Promise<AITestResult> {
    const startTime = Date.now()
    try {
      console.log("📝 Testing basic text generation...")

      const result = await multiLLMProvider.sendMessage(
        [
          { role: "system", content: "You are a helpful assistant. Respond concisely." },
          { role: "user", content: "Say 'Hello, AI system is working!' in exactly those words." },
        ],
        {
          maxTokens: 50,
          temperature: 0.1,
          userId: this.userId!,
        },
      )

      if ("error" in result) {
        return {
          functionName: "Basic Text Generation",
          status: "error",
          message: `Text generation failed: ${result.error}`,
          executionTime: Date.now() - startTime,
          details: { error: result.error, provider: result.provider },
        }
      }

      const expectedResponse = "Hello, AI system is working!"
      const isCorrect = result.content.includes("Hello") && result.content.includes("working")

      return {
        functionName: "Basic Text Generation",
        status: isCorrect ? "success" : "warning",
        message: isCorrect
          ? "Text generation working correctly"
          : `Unexpected response: ${result.content.substring(0, 100)}`,
        executionTime: Date.now() - startTime,
        details: { response: result.content, tokensUsed: result.usage?.totalTokens },
      }
    } catch (error) {
      return {
        functionName: "Basic Text Generation",
        status: "error",
        message: `Text generation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  private async testAgentTaskGeneration(): Promise<AITestResult> {
    const startTime = Date.now()
    try {
      console.log("🤖 Testing agent task generation...")

      const prompt = `Generate 3 business tasks for a sales agent with the goal "Increase lead generation by 30%". 
      Return as JSON array with format: [{"title": "Task title", "description": "Task description", "priority": "high|medium|low"}]`

      const result = await multiLLMProvider.sendMessage(
        [
          { role: "system", content: "You are a business task generator. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        {
          maxTokens: 500,
          temperature: 0.7,
          userId: this.userId!,
        },
      )

      if ("error" in result) {
        return {
          functionName: "Agent Task Generation",
          status: "error",
          message: `Task generation failed: ${result.error}`,
          executionTime: Date.now() - startTime,
          details: { error: result.error },
        }
      }

      // Try to parse JSON
      try {
        const tasks = JSON.parse(result.content)
        if (Array.isArray(tasks) && tasks.length > 0 && tasks[0].title) {
          return {
            functionName: "Agent Task Generation",
            status: "success",
            message: `Generated ${tasks.length} valid tasks`,
            executionTime: Date.now() - startTime,
            details: { tasks, count: tasks.length },
          }
        } else {
          return {
            functionName: "Agent Task Generation",
            status: "warning",
            message: "Generated tasks but format may be incorrect",
            executionTime: Date.now() - startTime,
            details: { response: result.content },
          }
        }
      } catch (parseError) {
        return {
          functionName: "Agent Task Generation",
          status: "warning",
          message: "Generated response but not valid JSON",
          executionTime: Date.now() - startTime,
          details: { response: result.content.substring(0, 200) },
        }
      }
    } catch (error) {
      return {
        functionName: "Agent Task Generation",
        status: "error",
        message: `Task generation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  private async testQuestionGeneration(): Promise<AITestResult> {
    const startTime = Date.now()
    try {
      console.log("❓ Testing question generation...")

      const prompt = `Generate 2 clarification questions for configuring a customer service agent. 
      Return as JSON: [{"id": "q1", "question": "Question text", "type": "multiple_choice", "options": ["A", "B"], "required": true}]`

      const result = await multiLLMProvider.sendMessage(
        [
          { role: "system", content: "You are a question generator. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        {
          maxTokens: 400,
          temperature: 0.5,
          userId: this.userId!,
        },
      )

      if ("error" in result) {
        return {
          functionName: "Question Generation",
          status: "error",
          message: `Question generation failed: ${result.error}`,
          executionTime: Date.now() - startTime,
          details: { error: result.error },
        }
      }

      try {
        const questions = JSON.parse(result.content)
        if (Array.isArray(questions) && questions.length > 0 && questions[0].question) {
          return {
            functionName: "Question Generation",
            status: "success",
            message: `Generated ${questions.length} valid questions`,
            executionTime: Date.now() - startTime,
            details: { questions, count: questions.length },
          }
        } else {
          return {
            functionName: "Question Generation",
            status: "warning",
            message: "Generated questions but format may be incorrect",
            executionTime: Date.now() - startTime,
            details: { response: result.content },
          }
        }
      } catch (parseError) {
        return {
          functionName: "Question Generation",
          status: "warning",
          message: "Generated response but not valid JSON",
          executionTime: Date.now() - startTime,
          details: { response: result.content.substring(0, 200) },
        }
      }
    } catch (error) {
      return {
        functionName: "Question Generation",
        status: "error",
        message: `Question generation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  private async testConversationHandling(): Promise<AITestResult> {
    const startTime = Date.now()
    try {
      console.log("💬 Testing conversation handling...")

      const messages = [
        { role: "system" as const, content: "You are a helpful business assistant." },
        { role: "user" as const, content: "What are the benefits of automation?" },
        { role: "assistant" as const, content: "Automation provides efficiency, cost savings, and accuracy." },
        { role: "user" as const, content: "Can you give me one specific example?" },
      ]

      const result = await multiLLMProvider.sendMessage(messages, {
        maxTokens: 200,
        temperature: 0.7,
        userId: this.userId!,
      })

      if ("error" in result) {
        return {
          functionName: "Conversation Handling",
          status: "error",
          message: `Conversation failed: ${result.error}`,
          executionTime: Date.now() - startTime,
          details: { error: result.error },
        }
      }

      const hasRelevantResponse =
        result.content.length > 10 && (result.content.includes("example") || result.content.includes("automation"))

      return {
        functionName: "Conversation Handling",
        status: hasRelevantResponse ? "success" : "warning",
        message: hasRelevantResponse
          ? "Conversation handling working correctly"
          : "Response may not be contextually relevant",
        executionTime: Date.now() - startTime,
        details: { response: result.content.substring(0, 150) },
      }
    } catch (error) {
      return {
        functionName: "Conversation Handling",
        status: "error",
        message: `Conversation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  private async testJSONGeneration(): Promise<AITestResult> {
    const startTime = Date.now()
    try {
      console.log("📋 Testing JSON generation...")

      const prompt = `Create a business analysis report in JSON format:
      {"analysis": "Brief analysis", "recommendations": ["rec1", "rec2"], "priority": "high|medium|low"}`

      const result = await multiLLMProvider.sendMessage(
        [
          { role: "system", content: "You are a JSON generator. Return only valid JSON, no other text." },
          { role: "user", content: prompt },
        ],
        {
          maxTokens: 300,
          temperature: 0.3,
          userId: this.userId!,
        },
      )

      if ("error" in result) {
        return {
          functionName: "JSON Generation",
          status: "error",
          message: `JSON generation failed: ${result.error}`,
          executionTime: Date.now() - startTime,
          details: { error: result.error },
        }
      }

      try {
        const jsonData = JSON.parse(result.content)
        if (jsonData.analysis && jsonData.recommendations && jsonData.priority) {
          return {
            functionName: "JSON Generation",
            status: "success",
            message: "JSON generation working correctly",
            executionTime: Date.now() - startTime,
            details: { generatedJSON: jsonData },
          }
        } else {
          return {
            functionName: "JSON Generation",
            status: "warning",
            message: "Generated JSON but missing expected fields",
            executionTime: Date.now() - startTime,
            details: { generatedJSON: jsonData },
          }
        }
      } catch (parseError) {
        return {
          functionName: "JSON Generation",
          status: "error",
          message: "Generated response is not valid JSON",
          executionTime: Date.now() - startTime,
          details: { response: result.content.substring(0, 200) },
        }
      }
    } catch (error) {
      return {
        functionName: "JSON Generation",
        status: "error",
        message: `JSON generation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        executionTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  private async testErrorHandling(): Promise<AITestResult> {
    const startTime = Date.now()
    try {
      console.log("⚠️ Testing error handling...")

      // Test with invalid provider
      const result = await multiLLMProvider.sendMessage([{ role: "user", content: "Test message" }], {
        provider: "invalid_provider",
        userId: this.userId!,
      })

      if ("error" in result) {
        return {
          functionName: "Error Handling",
          status: "success",
          message: "Error handling working correctly - invalid provider rejected",
          executionTime: Date.now() - startTime,
          details: { expectedError: result.error },
        }
      } else {
        return {
          functionName: "Error Handling",
          status: "warning",
          message: "Error handling may not be working - invalid provider accepted",
          executionTime: Date.now() - startTime,
          details: { unexpectedSuccess: result.content },
        }
      }
    } catch (error) {
      return {
        functionName: "Error Handling",
        status: "success",
        message: "Error handling working correctly - exception caught",
        executionTime: Date.now() - startTime,
        details: { caughtError: error instanceof Error ? error.message : "Unknown error" },
      }
    }
  }

  private generateRecommendations(testResults: AITestResult[], availableProviders: string[]): string[] {
    const recommendations: string[] = []

    // Check for critical issues
    const criticalErrors = testResults.filter((r) => r.status === "error")
    if (criticalErrors.length > 0) {
      recommendations.push("🚨 CRITICAL: Fix all error-status functions before launch")
      criticalErrors.forEach((error) => {
        recommendations.push(`   - Fix ${error.functionName}: ${error.message}`)
      })
    }

    // Check provider availability
    if (availableProviders.length === 0) {
      recommendations.push("🔑 Add at least one LLM provider API key in Settings → Profile → API Keys")
    } else if (availableProviders.length === 1) {
      recommendations.push("🔄 Consider adding a backup LLM provider for redundancy")
    }

    // Check warnings
    const warnings = testResults.filter((r) => r.status === "warning")
    if (warnings.length > 0) {
      recommendations.push("⚠️ Review warning-status functions for optimal performance")
      warnings.forEach((warning) => {
        recommendations.push(`   - Review ${warning.functionName}: ${warning.message}`)
      })
    }

    // Performance recommendations
    const slowTests = testResults.filter((r) => r.executionTime > 5000)
    if (slowTests.length > 0) {
      recommendations.push("⏱️ Some AI functions are slow - consider optimizing prompts or switching providers")
    }

    // Success recommendations
    if (criticalErrors.length === 0 && warnings.length === 0) {
      recommendations.push("✅ All AI functions are working correctly - ready for launch!")
      recommendations.push("🚀 Consider setting up monitoring for production usage")
    }

    return recommendations
  }
}

export const aiTester = new AIFunctionTester()
