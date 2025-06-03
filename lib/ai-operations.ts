import { UserLLMProvider } from "@/lib/user-llm-provider"

/**
 * Centralized AI operations that use user-configured LLM providers
 * Enhanced with role adoption and personalized interactions
 */
export class AIOperations {
  /**
   * Generate agent configuration questions with role adoption
   */
  static async generateAgentQuestions(
    agentType: string,
    roleSpecificPrompt: string,
    templateSlug: string,
    userId: string,
  ): Promise<{
    success: boolean
    questions?: any[]
    error?: string
    usedFallback?: boolean
  }> {
    const hasProviders = await UserLLMProvider.hasConfiguredProviders(userId)

    if (!hasProviders) {
      return {
        success: false,
        error: "No LLM providers configured. Please add an API key in Settings → Profile → API Keys.",
        usedFallback: true,
      }
    }

    const systemPrompt = `You are a professional ${agentType} who truly cares about helping users succeed. You're having a consultation to understand their specific needs.

Your personality traits:
- Genuinely interested in their success
- Ask follow-up questions that show expertise
- Use language appropriate to your role
- Focus on actionable information gathering
- Be warm but professional

Generate 5-6 personalized questions that help you understand exactly how to help them. Return only valid JSON array of question objects.`

    try {
      const questions = await UserLLMProvider.generateJSON(roleSpecificPrompt, userId, {
        systemPrompt,
        temperature: 0.8, // Higher temperature for more creative, personalized questions
        maxTokens: 2000,
      })

      if (!questions || !Array.isArray(questions)) {
        throw new Error("Invalid response format")
      }

      // Validate and enhance questions
      const validatedQuestions = questions
        .filter((q: any) => q.question && q.type)
        .map((q: any, index: number) => ({
          id: q.id || `question_${index + 1}`,
          question: q.question,
          type: q.type || "text",
          options: q.options || [],
          required: q.required !== false, // Default to true
          category: q.category || "configuration",
          placeholder: q.placeholder || "",
          roleContext: q.roleContext || `This helps me understand your needs better.`,
        }))

      return {
        success: true,
        questions: validatedQuestions,
        usedFallback: false,
      }
    } catch (error) {
      console.error("Error generating role-specific questions:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate questions",
        usedFallback: false,
      }
    }
  }

  /**
   * Analyze user input and generate tasks with role context
   */
  static async analyzeAndGenerateTasks(
    userInput: string,
    agentGoal: string,
    agentType: string,
    userId: string,
    roleContext?: string,
    existingTasks?: any[],
  ): Promise<{
    success: boolean
    tasks?: any[]
    dependencies?: any[]
    userNeedAnalysis?: string
    recommendedFlow?: string[]
    roleInsights?: string
    error?: string
  }> {
    const hasProviders = await UserLLMProvider.hasConfiguredProviders(userId)

    if (!hasProviders) {
      return {
        success: false,
        error: "No LLM providers configured. Please add an API key in Settings → Profile → API Keys.",
      }
    }

    const existingTasksContext = existingTasks?.length
      ? `\nExisting tasks: ${existingTasks.map((t) => `- ${t.title} (${t.status})`).join("\n")}`
      : ""

    const prompt = `
As a professional ${agentType}, analyze this user input and create a comprehensive action plan:

User Input: "${userInput}"
Agent Goal: "${agentGoal}"
Agent Type: "${agentType}"
Role Context: "${roleContext || "Standard professional consultation"}"${existingTasksContext}

Provide a JSON response with this structure:
{
  "userNeedAnalysis": "Professional analysis of what the user needs from your expertise as a ${agentType}",
  "roleInsights": "Specific insights you have as a ${agentType} that will help them succeed",
  "recommendedFlow": ["Step 1 from your professional perspective", "Step 2", "Step 3"],
  "tasks": [
    {
      "title": "Task title that reflects your ${agentType} expertise",
      "description": "Detailed description with your professional insights",
      "priority": "low|medium|high|urgent",
      "status": "todo|blocked",
      "isDependency": true/false,
      "blockedReason": "Professional reason why this needs attention first",
      "dependsOnTaskId": "reference to prerequisite task",
      "estimatedHours": 2,
      "category": "strategy|research|implementation|review|communication",
      "roleSpecificNotes": "Your professional notes as a ${agentType}",
      "metadata": {
        "aiGenerated": true,
        "roleContext": "${agentType}",
        "userInput": "original user input",
        "complexity": "low|medium|high"
      }
    }
  ],
  "dependencies": [
    {
      "title": "Dependency that requires your ${agentType} expertise",
      "description": "What needs professional guidance or approval",
      "priority": "high|urgent",
      "status": "blocked",
      "isDependency": true,
      "blockedReason": "Requires ${agentType} professional input",
      "category": "review|communication",
      "metadata": {
        "requiresExpertApproval": true,
        "dependencyType": "professional_guidance|approval|decision"
      }
    }
  ]
}
`

    const systemPrompt = `You are a professional ${agentType} with deep expertise in your field. Analyze user needs from your professional perspective and create actionable plans that leverage your specific knowledge and experience. Always return valid JSON.`

    try {
      const analysis = await UserLLMProvider.generateJSON(prompt, userId, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 3500,
      })

      if (!analysis) {
        throw new Error("No response from LLM provider")
      }

      return {
        success: true,
        tasks: analysis.tasks || [],
        dependencies: analysis.dependencies || [],
        userNeedAnalysis: analysis.userNeedAnalysis || "Analysis not available",
        recommendedFlow: Array.isArray(analysis.recommendedFlow) ? analysis.recommendedFlow : [],
        roleInsights: analysis.roleInsights || "Professional insights not available",
      }
    } catch (error) {
      console.error("Error analyzing tasks with role context:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze tasks",
      }
    }
  }

  /**
   * Generate conversational AI response with role adoption
   */
  static async generateConversationResponse(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    context: {
      userName: string
      userRole?: string
      userIndustry?: string
      userGoals?: string[]
      agentRole?: string // New field for agent role
      templateSlug?: string // New field for template context
    },
    userId: string,
  ): Promise<string | null> {
    const hasProviders = await UserLLMProvider.hasConfiguredProviders(userId)

    if (!hasProviders) {
      // Return a helpful fallback message with role context
      const roleContext = context.agentRole ? ` as your ${context.agentRole}` : ""
      return `I'd love to help you${roleContext}, but I need you to configure an AI provider first. Please go to Settings → Profile → API Keys to add your preferred AI service.`
    }

    const rolePersonality = context.agentRole
      ? `You are ${context.userName}'s ${context.agentRole}. Embody this role completely - use appropriate language, expertise, and personality traits that match this profession.`
      : `You are a helpful assistant for ${context.userName}.`

    const systemPrompt = `${rolePersonality}${context.userRole ? ` They work as a ${context.userRole}` : ""}${
      context.userIndustry ? ` in ${context.userIndustry}` : ""
    }.

Your role-specific responsibilities:
1. Provide expert advice from your professional perspective
2. Use terminology and insights appropriate to your role
3. Show genuine interest in their success
4. Ask follow-up questions that demonstrate your expertise
5. Be encouraging and supportive while maintaining professionalism

User's goals: ${context.userGoals?.length ? context.userGoals.join(", ") : "Not specified yet"}

Stay in character as their ${context.agentRole || "assistant"} and provide responses that reflect your professional expertise and caring nature.`

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.slice(-10).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: userMessage },
    ]

    try {
      const result = await UserLLMProvider.sendMessage(messages, userId, {
        maxTokens: 600,
        temperature: 0.8, // Higher temperature for more personality
      })

      if ("error" in result) {
        console.error("Conversation generation error:", result.error)
        const roleContext = context.agentRole ? ` as your ${context.agentRole}` : ""
        return `I'm having trouble connecting to the AI service right now${roleContext}. Please try again in a moment.`
      }

      return result.content || null
    } catch (error) {
      console.error("Error generating conversation response:", error)
      return "I encountered an error while processing your message. Please try again."
    }
  }
}
