"use server"

import { getDefaultUserId } from "@/lib/default-user"
import { AIOperations } from "@/lib/ai-operations"

interface ConversationRequest {
  templateSlug: string
  templateName: string
  agentGoal: string
  messageHistory: Array<{ role: string; content: string }>
  userMessage?: string
  isInitial?: boolean
  currentAnswers?: Record<string, any>
}

interface ConversationResponse {
  success: boolean
  message?: string
  extractedData?: Record<string, any>
  setupComplete?: boolean
  plan?: any
  error?: string
}

export async function generateConversationalResponse(request: ConversationRequest): Promise<ConversationResponse> {
  try {
    const {
      templateSlug,
      templateName,
      agentGoal,
      messageHistory,
      userMessage,
      isInitial,
      currentAnswers = {},
    } = request

    // Get the user ID for AI operations
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      console.error("Error getting user ID:", error)
      return {
        success: false,
        error: "Authentication error",
      }
    }

    // Generate initial greeting and first question
    if (isInitial) {
      const initialPrompt = `
You are a ${templateName} having a friendly conversation with a user who wants help with: "${agentGoal}".

Start with a warm, personalized greeting that shows you understand their goal. Then ask ONE specific question to begin understanding their needs better.

Your greeting should:
1. Be warm and conversational
2. Acknowledge their goal
3. Show your expertise as a ${templateName}
4. End with ONE specific, open-ended question to start the conversation

Keep your response concise (3-5 sentences maximum).
`

      const systemPrompt = `You are an expert ${templateName} having a natural conversation. Be friendly, professional, and focused on understanding the user's needs through conversation.`

      try {
        const { AIOperations } = await import("@/lib/ai-operations")

        const response = await AIOperations.generateConversationalResponse(
          initialPrompt,
          [],
          {
            userName: "User",
            agentRole: templateName,
            templateSlug: templateSlug,
          },
          userId,
        )

        return {
          success: true,
          message: response || getDefaultGreeting(templateName, agentGoal),
          extractedData: { goal: agentGoal },
        }
      } catch (error) {
        console.error("Error generating initial greeting:", error)
        return {
          success: true,
          message: getDefaultGreeting(templateName, agentGoal),
          extractedData: { goal: agentGoal },
        }
      }
    }

    // Handle ongoing conversation
    if (userMessage) {
      // Determine if we have enough information to complete setup
      const shouldGeneratePlan = shouldCreatePlan(messageHistory, currentAnswers)

      let prompt: string
      let extractionPrompt: string

      if (shouldGeneratePlan) {
        prompt = `
Based on our conversation so far, I now have enough information to create a personalized plan for you as your ${templateName}.

Summarize what you've learned about the user's needs related to "${agentGoal}" and create a structured plan with:
1. A clear title for the plan
2. A brief description of your approach
3. 3-5 specific action steps
4. A positive, encouraging conclusion

Let the user know you're creating tasks based on this plan and will help them implement it.
`
        extractionPrompt = `
Extract all relevant information from the conversation history into a structured format.
Also create a plan object with:
- title: A catchy title for the plan
- description: A brief overview of the approach
- steps: An array of specific action steps
- category: The primary focus area (strategy, implementation, etc.)

Return a JSON object with:
{
  "extractedData": {
    // All key user information organized by topic
  },
  "plan": {
    "title": "Plan title",
    "description": "Plan overview",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "category": "strategy"
  },
  "setupComplete": true
}
`
      } else {
        // Continue the conversation naturally
        prompt = `
Continue this conversation as a ${templateName} helping with: "${agentGoal}".

Based on what you know so far, ask the MOST IMPORTANT question to better understand their needs.

Your response should:
1. Acknowledge their last message
2. Show understanding of their situation
3. Ask ONE specific question to gather critical information you're still missing
4. Be conversational and natural

Keep your response concise (2-4 sentences).
`
        extractionPrompt = `
Extract any new information from the user's last message.
Return a JSON object with:
{
  "extractedData": {
    // Any new information learned, as key-value pairs
  },
  "setupComplete": false
}
`
      }

      try {
        // Generate the conversational response
        const conversationHistory = messageHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }))

        const response = await AIOperations.generateConversationalResponse(
          userMessage,
          conversationHistory,
          {
            userName: "User",
            agentRole: templateName,
            templateSlug: templateSlug,
            userGoals: [agentGoal],
          },
          userId,
        )

        // Extract structured data and determine if setup is complete
        const extractionResult = await extractDataFromConversation(
          conversationHistory,
          userMessage,
          extractionPrompt,
          userId,
          shouldGeneratePlan,
        )

        return {
          success: true,
          message: response || getFallbackResponse(templateName, userMessage, shouldGeneratePlan),
          extractedData: extractionResult.extractedData || {},
          setupComplete: extractionResult.setupComplete || shouldGeneratePlan,
          plan: extractionResult.plan || (shouldGeneratePlan ? getDefaultPlan(templateName, agentGoal) : null),
        }
      } catch (error) {
        console.error("Error in conversation:", error)
        return {
          success: true,
          message: getFallbackResponse(templateName, userMessage, shouldGeneratePlan),
          setupComplete: shouldGeneratePlan,
          plan: shouldGeneratePlan ? getDefaultPlan(templateName, agentGoal) : null,
        }
      }
    }

    return {
      success: false,
      error: "Invalid request parameters",
    }
  } catch (error) {
    console.error("Error in generateConversationalResponse:", error)
    return {
      success: false,
      error: "Failed to generate response",
    }
  }
}

// Helper function to determine if we should create a plan
function shouldCreatePlan(
  messageHistory: Array<{ role: string; content: string }>,
  currentAnswers: Record<string, any>,
): boolean {
  // Count meaningful exchanges (pairs of user and assistant messages)
  const meaningfulExchanges = Math.floor(messageHistory.filter((msg) => msg.role === "user").length)

  // Check if we have enough information based on message count and answers collected
  const hasEnoughMessages = meaningfulExchanges >= 3
  const hasEnoughAnswers = Object.keys(currentAnswers).length >= 3

  return hasEnoughMessages && hasEnoughAnswers
}

// Extract structured data from conversation
async function extractDataFromConversation(
  conversationHistory: Array<{ role: string; content: string }>,
  latestUserMessage: string,
  extractionPrompt: string,
  userId: string,
  isGeneratingPlan: boolean,
): Promise<any> {
  try {
    // Prepare the conversation context for extraction
    const conversationContext = conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n")

    const prompt = `
${extractionPrompt}

Conversation history:
${conversationContext}

Latest user message: "${latestUserMessage}"
`

    const systemPrompt = `You are a data extraction assistant. Extract structured information from conversations and return only valid JSON.`

    // Use the LLM provider to generate JSON
    const { UserLLMProvider } = await import("@/lib/user-llm-provider")

    const extractionResult = await UserLLMProvider.generateJSON(prompt, userId, {
      systemPrompt,
      temperature: 0.3, // Lower temperature for more consistent extraction
      maxTokens: 1500,
    })

    if (!extractionResult) {
      return {
        extractedData: {},
        setupComplete: isGeneratingPlan,
        plan: isGeneratingPlan ? getDefaultPlan("Assistant", "your goal") : null,
      }
    }

    return extractionResult
  } catch (error) {
    console.error("Error extracting data from conversation:", error)
    return {
      extractedData: {},
      setupComplete: isGeneratingPlan,
      plan: isGeneratingPlan ? getDefaultPlan("Assistant", "your goal") : null,
    }
  }
}

// Default greeting fallbacks by template type
function getDefaultGreeting(templateName: string, agentGoal: string): string {
  const greetings: Record<string, string> = {
    "Mental Peace Coach": `Hello! I'm your Mental Peace Coach, and I'm here to help you with "${agentGoal}". Mindfulness and mental wellness are journeys we'll take together. To start, could you tell me what's been causing you stress lately?`,

    "Fitness Trainer": `Hi there! I'm your personal Fitness Trainer, ready to help you achieve "${agentGoal}". Everyone's fitness journey is unique, and I'm excited to customize a plan just for you. What's your current fitness level and what types of exercise do you enjoy?`,

    "Sales Lead Generator": `Hello! As your Sales Lead Generator, I'm ready to supercharge your outreach for "${agentGoal}". Let's build a strategy that delivers results. To get started, could you tell me about your ideal customer profile?`,

    "Marketing Content Manager": `Hi there! I'm your Marketing Content Manager, excited to help with "${agentGoal}". Great content starts with understanding your audience. Who are you trying to reach with your content?`,
  }

  return (
    greetings[templateName] ||
    `Hello! I'm your ${templateName}, and I'm here to help you with "${agentGoal}". To get started, could you tell me more about your specific needs and challenges?`
  )
}

// Fallback responses when AI generation fails
function getFallbackResponse(templateName: string, userMessage: string, isGeneratingPlan: boolean): string {
  if (isGeneratingPlan) {
    return `Thank you for sharing all that information! Based on what you've told me, I can now create a personalized plan to help with your goals as your ${templateName}. I'll set up some initial tasks and recommendations to get you started right away.`
  }

  // Simple keyword matching for contextual responses
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes("stress") || lowerMessage.includes("anxiety") || lowerMessage.includes("worry")) {
    return `I understand dealing with stress can be challenging. Could you tell me more about when these feelings are strongest for you? This will help me suggest the most effective techniques.`
  }

  if (lowerMessage.includes("exercise") || lowerMessage.includes("workout") || lowerMessage.includes("fitness")) {
    return `Exercise is so important! What kind of workout schedule would realistically fit into your weekly routine? This helps me create a sustainable plan.`
  }

  if (lowerMessage.includes("sales") || lowerMessage.includes("leads") || lowerMessage.includes("customers")) {
    return `Growing your customer base is crucial. What sales channels have been most effective for you so far? Understanding this helps me optimize your lead generation strategy.`
  }

  // Generic follow-up questions
  const followUps = [
    `That's helpful to know. What would you say is your biggest challenge related to this goal?`,
    `I see. What have you tried before to address this need?`,
    `Thanks for sharing. What would success look like for you in this area?`,
    `Interesting. What timeline are you working with to achieve these results?`,
    `Got it. What resources do you currently have available to work on this?`,
  ]

  return followUps[Math.floor(Math.random() * followUps.length)]
}

// Default plan when AI generation fails
function getDefaultPlan(templateName: string, agentGoal: string): any {
  const plans: Record<string, any> = {
    "Mental Peace Coach": {
      title: "Personalized Mindfulness & Stress Reduction Plan",
      description:
        "A customized approach to help you find mental peace through proven mindfulness techniques and stress management strategies.",
      steps: [
        "Daily 10-minute guided meditation practice",
        "Stress trigger identification and management",
        "Mindful breathing exercises for acute stress",
        "Weekly reflection and progress tracking",
        "Gradual expansion of mindfulness into daily activities",
      ],
      category: "wellness",
    },

    "Fitness Trainer": {
      title: "Custom Fitness Achievement Program",
      description:
        "A balanced fitness plan designed to help you reach your goals through sustainable exercise and progress tracking.",
      steps: [
        "Initial fitness assessment and goal setting",
        "Customized workout schedule based on preferences",
        "Progressive intensity increases for optimal results",
        "Form guidance and technique optimization",
        "Regular progress measurements and plan adjustments",
      ],
      category: "fitness",
    },

    "Sales Lead Generator": {
      title: "Strategic Lead Generation Blueprint",
      description: "A comprehensive approach to identify, engage, and convert high-quality leads for your business.",
      steps: [
        "Ideal customer profile refinement",
        "Multi-channel outreach strategy implementation",
        "Automated follow-up sequence creation",
        "Lead qualification process optimization",
        "Performance tracking and conversion analysis",
      ],
      category: "sales",
    },
  }

  return (
    plans[templateName] || {
      title: `Personalized ${templateName} Action Plan`,
      description: `A strategic approach to help you achieve "${agentGoal}" through targeted actions and continuous improvement.`,
      steps: [
        "Situation assessment and goal clarification",
        "Strategy development based on your specific needs",
        "Implementation of targeted techniques and approaches",
        "Progress monitoring and performance tracking",
        "Refinement and optimization based on results",
      ],
      category: "strategy",
    }
  )
}
