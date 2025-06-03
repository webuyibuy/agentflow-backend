import { getDecryptedApiKey } from "@/app/dashboard/settings/profile/api-key-actions"
import { getDefaultUserId } from "@/lib/default-user"

export interface BrainDumpAnalysis {
  extractedGoal?: string
  extractedBehavior?: string
  suggestedAnswers?: Record<string, any>
  error?: string
  errorType?: string // Add errorType to differentiate error types
}

export class AgentTemplateManager {
  /**
   * Process brain dump text using OpenAI to extract agent configuration
   */
  static async processBrainDump(text: string, templateId: string): Promise<BrainDumpAnalysis> {
    try {
      // Get current user ID
      const userId = await getDefaultUserId()

      // Get the OpenAI API key from encrypted storage
      const openaiApiKey = await getDecryptedApiKey("openai", userId)

      if (!openaiApiKey) {
        console.warn("OpenAI API key not found for user:", userId)
        return {
          error:
            "OpenAI API key not configured. Please add your OpenAI API key in Settings → Profile → API Keys to enable AI analysis.",
          errorType: "api_key_missing", // Distinct error type for API key issues
        }
      }

      const prompt = this.buildBrainDumpPrompt(text, templateId)

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert AI agent configuration assistant. Analyze the provided business document and extract:
          1. A clear, actionable agent goal (10-200 characters)
          2. Specific agent behavior instructions
          3. Suggested answers for configuration questions
          
          Return only valid JSON with the exact structure requested.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`

        console.error("OpenAI API error in brain dump analysis:", {
          status: response.status,
          error: errorData,
          userId,
        })

        if (response.status === 401 || errorMessage.includes("Incorrect API key provided")) {
          return {
            error: "Invalid OpenAI API key. Please check your API key in Settings → Profile → API Keys.",
            errorType: "api_key_invalid",
          }
        }

        throw new Error(`OpenAI API error: ${errorMessage}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error("No content received from OpenAI")
      }

      // Parse the JSON response
      let analysis: any
      try {
        analysis = JSON.parse(content)
      } catch (parseError) {
        console.error("Failed to parse OpenAI brain dump response:", content)
        throw new Error("Invalid response format from OpenAI")
      }

      // Validate and return the analysis
      return {
        extractedGoal: analysis.extractedGoal || "",
        extractedBehavior: analysis.extractedBehavior || "",
        suggestedAnswers: analysis.suggestedAnswers || {},
      }
    } catch (error) {
      console.error("Error in brain dump analysis:", error)
      return {
        error: error instanceof Error ? error.message : "Failed to analyze document",
      }
    }
  }

  /**
   * Build the prompt for brain dump analysis
   */
  private static buildBrainDumpPrompt(text: string, templateId: string): string {
    const templateContext = this.getTemplateContext(templateId)

    return `
Analyze this business document and extract agent configuration for a ${templateContext.name}:

DOCUMENT:
${text}

TEMPLATE CONTEXT:
${templateContext.description}

Extract and return JSON with this exact structure:
{
"extractedGoal": "Clear, actionable goal for the agent (10-200 chars)",
"extractedBehavior": "Specific behavior instructions based on the document",
"suggestedAnswers": {
"key1": "suggested answer based on document analysis",
"key2": "another suggested answer"
}
}

Focus on:
- Extracting the main objective/goal from the document
- Identifying specific behaviors, processes, or approaches mentioned
- Suggesting practical configuration values based on the content
- Making the goal concise but comprehensive
- Ensuring behavior instructions are actionable

The goal should be between 10-200 characters and clearly state what the agent should accomplish.
`
  }

  /**
   * Get template-specific context for analysis
   */
  private static getTemplateContext(templateId: string): { name: string; description: string } {
    const templates: Record<string, { name: string; description: string }> = {
      "sales-lead-generator": {
        name: "Sales Lead Generator",
        description: "Focuses on lead generation, qualification, outreach strategies, and sales processes.",
      },
      "marketing-content-manager": {
        name: "Marketing Content Manager",
        description: "Handles content creation, brand voice, audience targeting, and content distribution strategies.",
      },
      "developer-assistant": {
        name: "Developer Assistant",
        description:
          "Assists with development workflows, code quality, deployment processes, and technical documentation.",
      },
      "hr-recruitment-specialist": {
        name: "HR Recruitment Specialist",
        description: "Manages recruitment processes, candidate sourcing, screening, and hiring workflows.",
      },
      "customer-support-agent": {
        name: "Customer Support Agent",
        description:
          "Handles customer inquiries, support processes, escalation procedures, and satisfaction management.",
      },
      "research-analyst": {
        name: "Research Analyst",
        description: "Conducts research, data analysis, market studies, and generates insights and reports.",
      },
      "productivity-optimizer": {
        name: "Productivity Optimizer",
        description: "Optimizes workflows, automates processes, and improves team productivity and efficiency.",
      },
      "custom-agent": {
        name: "Custom Agent",
        description: "A flexible agent that can be configured for specific business needs and custom workflows.",
      },
    }

    return (
      templates[templateId] || {
        name: "Custom Agent",
        description: "A flexible agent for custom business requirements.",
      }
    )
  }

  /**
   * Get fallback analysis if OpenAI fails
   */
  static getFallbackAnalysis(text: string, templateId: string): BrainDumpAnalysis {
    // Simple keyword extraction for fallback
    const words = text.toLowerCase().split(/\s+/)
    const goalKeywords = ["goal", "objective", "target", "achieve", "accomplish", "focus"]
    const hasGoalKeywords = goalKeywords.some((keyword) => words.includes(keyword))

    const templateContext = this.getTemplateContext(templateId)

    let extractedGoal: string
    if (hasGoalKeywords) {
      extractedGoal = `Optimize ${templateContext.name.toLowerCase()} processes based on provided strategy`
    } else {
      extractedGoal = `Enhance ${templateContext.name.toLowerCase()} performance and outcomes`
    }

    return {
      extractedGoal: extractedGoal,
      extractedBehavior: `Implement key strategies and adapt best practices to improve ${templateContext.name.toLowerCase()} workflows.`,
      suggestedAnswers: {
        primary_focus: "Strategic improvements",
        approach: "Adaptive implementation",
        success_metrics: "Performance and outcome improvements",
      },
    }
  }
}
