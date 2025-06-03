import { aiTester } from "./ai-function-tester"
import { multiLLMProvider } from "./multi-llm-provider"

export interface ValidationResult {
  isReady: boolean
  score: number
  criticalIssues: string[]
  warnings: string[]
  recommendations: string[]
  testResults: any[]
}

export class AISystemValidator {
  async validateForLaunch(): Promise<ValidationResult> {
    console.log("🔍 Starting AI system validation for launch...")

    try {
      // Run comprehensive AI tests
      const healthReport = await aiTester.runComprehensiveTest()

      // Calculate readiness score
      const totalTests = healthReport.testResults.length
      const successfulTests = healthReport.testResults.filter((r) => r.status === "success").length
      const warningTests = healthReport.testResults.filter((r) => r.status === "warning").length
      const errorTests = healthReport.testResults.filter((r) => r.status === "error").length

      // Score calculation: Success = 100%, Warning = 50%, Error = 0%
      const score = Math.round(((successfulTests + warningTests * 0.5) / totalTests) * 100)

      // Determine if ready for launch
      const isReady = errorTests === 0 && healthReport.availableProviders.length > 0

      // Extract critical issues
      const criticalIssues = healthReport.testResults
        .filter((r) => r.status === "error")
        .map((r) => `${r.functionName}: ${r.message}`)

      // Extract warnings
      const warnings = healthReport.testResults
        .filter((r) => r.status === "warning")
        .map((r) => `${r.functionName}: ${r.message}`)

      return {
        isReady,
        score,
        criticalIssues,
        warnings,
        recommendations: healthReport.recommendedActions,
        testResults: healthReport.testResults,
      }
    } catch (error) {
      console.error("❌ AI system validation failed:", error)

      return {
        isReady: false,
        score: 0,
        criticalIssues: [`System validation failed: ${error instanceof Error ? error.message : "Unknown error"}`],
        warnings: [],
        recommendations: [
          "🚨 Fix system validation errors before launch",
          "🔑 Ensure user has configured at least one LLM provider",
          "🔧 Check database connectivity and authentication",
        ],
        testResults: [],
      }
    }
  }

  async quickHealthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Quick check: Can we detect providers?
      await multiLLMProvider.detectAvailableProviders()
      const providers = multiLLMProvider.getAvailableProviders()

      if (providers.length === 0) {
        return {
          healthy: false,
          message: "No LLM providers configured. User needs to add API keys.",
        }
      }

      // Quick check: Can we make a simple request?
      const result = await multiLLMProvider.sendMessage([{ role: "user", content: "Test" }], { maxTokens: 10 })

      if ("error" in result) {
        return {
          healthy: false,
          message: `AI system error: ${result.error}`,
        }
      }

      return {
        healthy: true,
        message: `AI system healthy with ${providers.length} provider(s)`,
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }
}

export const aiValidator = new AISystemValidator()
