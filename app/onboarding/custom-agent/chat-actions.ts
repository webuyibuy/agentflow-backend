"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { LLMService } from "@/lib/llm-service"

interface CustomChatRequest {
  userId: string
  messageHistory?: Array<{ role: string; content: string }>
  userMessage?: string
  isInitial?: boolean
  currentAgentData?: Record<string, any>
}

interface CustomChatResponse {
  success: boolean
  message?: string
  agentData?: Record<string, any>
  setupComplete?: boolean
  error?: string
}

export async function generateCustomChatResponse(request: CustomChatRequest): Promise<CustomChatResponse> {
  try {
    const { userId, messageHistory = [], userMessage, isInitial = false, currentAgentData = {} } = request

    console.log(`[CustomChatActions] Processing custom agent request, isInitial: ${isInitial}`)

    // Generate initial greeting for custom agent using AI
    if (isInitial) {
      console.log(`[CustomChatActions] Generating initial greeting for custom agent`)

      const availableProviders = await LLMService.getAvailableProviders(userId)
      console.log(`[CustomChatActions] Available providers: ${availableProviders.join(", ")}`)

      if (availableProviders.length === 0) {
        return {
          success: true,
          message: getCustomAgentGreeting(),
          agentData: { isCustom: true },
        }
      }

      try {
        const initialPrompt = `You are an AI agent creation specialist helping someone build a completely custom AI agent from scratch.

You're excited about the possibilities of custom AI and understand that every business has unique needs that templates can't always address.

Start with an enthusiastic, warm greeting about creating something truly unique.
Then ask ONE specific, thoughtful question about their business challenge or use case.

Show genuine curiosity about what they want to build. Make them feel like they're embarking on an exciting journey to create something special.`

        const response = await LLMService.generateText(initialPrompt, {
          systemPrompt: `You are an enthusiastic AI agent creation expert. Be genuinely excited about custom solutions and ask insightful questions about their unique needs.`,
          userId,
          temperature: 0.9,
          maxTokens: 200,
        })

        if ("error" in response) {
          return {
            success: true,
            message: getCustomAgentGreeting(),
            agentData: { isCustom: true },
          }
        }

        return {
          success: true,
          message: response.content,
          agentData: { isCustom: true },
        }
      } catch (error) {
        console.error("[CustomChatActions] Error generating initial greeting:", error)
        return {
          success: true,
          message: getCustomAgentGreeting(),
          agentData: { isCustom: true },
        }
      }
    }

    // Handle ongoing conversation with AI
    if (userMessage && messageHistory.length > 0) {
      console.log(`[CustomChatActions] Processing user message: ${userMessage.substring(0, 50)}...`)

      const availableProviders = await LLMService.getAvailableProviders(userId)

      if (availableProviders.length > 0) {
        try {
          // Use AI for intelligent custom agent conversation
          const conversationHistory = messageHistory.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }))

          const systemPrompt = `You are an AI agent creation specialist helping someone build a custom AI agent.

Your goal is to understand their unique requirements through natural conversation:
- What specific problem or challenge they want to solve
- What industry or domain they work in
- What they want to name their agent
- What personality or style they prefer
- Any specific tools or integrations they need

Current information gathered:
${
  Object.entries(currentAgentData)
    .filter(([key, value]) => value && key !== "isCustom")
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n") || "None yet"
}

Guidelines:
1. Ask ONE thoughtful question at a time
2. Show genuine interest in their unique use case
3. Be encouraging about the possibilities
4. Build on their previous answers naturally
5. When you have enough information (purpose, industry, name), let them know you're ready to create their custom agent

Be enthusiastic about custom solutions and make them feel like they're creating something special.`

          const response = await LLMService.generateConversation(
            [{ role: "system", content: systemPrompt }, ...conversationHistory, { role: "user", content: userMessage }],
            {
              userId,
              temperature: 0.9,
              maxTokens: 250,
            },
          )

          if ("error" in response) {
            console.log(`[CustomChatActions] AI conversation failed: ${response.error}`)
            return handleCustomFallbackConversation(userMessage, messageHistory, currentAgentData)
          }

          // Extract information using AI
          const extractedData = await extractCustomInfoWithAI(userMessage, messageHistory, currentAgentData, userId)
          const updatedAgentData = { ...currentAgentData, ...extractedData }

          // Check if setup is complete
          const setupComplete = isCustomSetupComplete(updatedAgentData, [])

          return {
            success: true,
            message: response.content,
            agentData: updatedAgentData,
            setupComplete,
          }
        } catch (error) {
          console.error("[CustomChatActions] Error in AI conversation:", error)
          return handleCustomFallbackConversation(userMessage, messageHistory, currentAgentData)
        }
      } else {
        return handleCustomFallbackConversation(userMessage, messageHistory, currentAgentData)
      }
    }

    return {
      success: false,
      error: "Invalid request parameters",
    }
  } catch (error) {
    console.error("Error in generateCustomChatResponse:", error)
    return {
      success: false,
      error: "Failed to generate response",
    }
  }
}

export async function completeCustomAgentSetup(request: { agentData: any; userId: string }): Promise<{
  success: boolean
  redirectUrl?: string
  error?: string
}> {
  try {
    const { agentData, userId } = request
    const supabase = getSupabaseAdmin()

    // Validate required fields for custom agent
    if (!agentData.name) {
      agentData.name = "Custom AI Agent"
    }

    if (!agentData.purpose) {
      return {
        success: false,
        error: "Missing agent purpose",
      }
    }

    console.log(`[CompleteCustomAgentSetup] Creating custom agent for user ${userId}:`, agentData)

    // Create the custom agent in the database
    const { data: agent, error } = await supabase
      .from("agents")
      .insert({
        name: agentData.name,
        goal: agentData.purpose,
        behavior: agentData.behavior || agentData.personality || "",
        owner_id: userId,
        template_slug: "custom-agent",
        template_name: "Custom Agent",
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating custom agent:", error)
      return {
        success: false,
        error: "Failed to create custom agent",
      }
    }

    if (!agent) {
      return {
        success: false,
        error: "Failed to create custom agent",
      }
    }

    // Store additional custom data
    const { error: customDataError } = await supabase.from("agent_custom_data").insert({
      agent_id: agent.id,
      owner_id: userId,
      custom_data: {
        ...agentData,
        isCustom: true,
        createdVia: "custom_chat_setup",
      },
      configuration_method: "custom_chat_setup",
      created_at: new Date().toISOString(),
    })

    if (customDataError) {
      console.error("Error storing custom data:", customDataError)
    }

    // Create initial custom tasks based on the agent's purpose
    await createCustomInitialTasks(agent.id, agentData, userId)

    // Log creation
    await supabase.from("agent_logs").insert({
      agent_id: agent.id,
      log_type: "milestone",
      message: `🚀 Custom agent "${agentData.name}" created and ready for action!`,
      metadata: {
        isCustom: true,
        created_via: "custom_chat_setup",
        purpose: agentData.purpose,
        industry: agentData.industry,
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")

    return {
      success: true,
      redirectUrl: `/dashboard/agents/${agent.id}?custom=true`,
    }
  } catch (error) {
    console.error("Error in completeCustomAgentSetup:", error)
    return {
      success: false,
      error: "Failed to complete custom setup",
    }
  }
}

// Helper functions for custom agent creation
function determineCustomNeededInfo(
  messageHistory: Array<{ role: string; content: string }>,
  currentData: Record<string, any>,
): string[] {
  const neededInfo = []

  if (!currentData.purpose) neededInfo.push("purpose")
  if (!currentData.industry) neededInfo.push("industry")
  if (!currentData.name) neededInfo.push("name")
  if (!currentData.personality && messageHistory.length >= 6) neededInfo.push("personality")
  if (!currentData.tools && messageHistory.length >= 8) neededInfo.push("tools")

  return neededInfo
}

function isCustomSetupComplete(currentData: Record<string, any>, neededInfo: string[]): boolean {
  return currentData.purpose && currentData.industry && currentData.name && neededInfo.length <= 1
}

function extractCustomInfoFromMessage(
  userMessage: string,
  previousQuestion: string,
  currentData: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {}
  const lowerMessage = userMessage.toLowerCase()
  const lowerPrevious = previousQuestion.toLowerCase()

  // Extract purpose/use case
  if (
    !currentData.purpose &&
    (lowerPrevious.includes("solve") ||
      lowerPrevious.includes("purpose") ||
      lowerPrevious.includes("tasks") ||
      lowerPrevious.includes("help") ||
      lowerPrevious.includes("do"))
  ) {
    result.purpose = userMessage
  }

  // Extract industry/domain
  if (
    !currentData.industry &&
    (lowerPrevious.includes("industry") ||
      lowerPrevious.includes("field") ||
      lowerPrevious.includes("domain") ||
      lowerPrevious.includes("business"))
  ) {
    result.industry = userMessage
  }

  // Extract name
  if (!currentData.name && (lowerPrevious.includes("name") || lowerPrevious.includes("call"))) {
    result.name = userMessage
  }

  // Extract personality/behavior
  if (
    !currentData.personality &&
    (lowerPrevious.includes("personality") ||
      lowerPrevious.includes("behave") ||
      lowerPrevious.includes("style") ||
      lowerPrevious.includes("approach"))
  ) {
    result.personality = userMessage
  }

  // Extract tools/capabilities
  if (
    !currentData.tools &&
    (lowerPrevious.includes("tools") ||
      lowerPrevious.includes("capabilities") ||
      lowerPrevious.includes("features") ||
      lowerPrevious.includes("integrate"))
  ) {
    result.tools = userMessage
  }

  // If this is the first message, assume it's the purpose
  if (!currentData.purpose && Object.keys(result).length === 0) {
    result.purpose = userMessage
  }

  return result
}

function createCustomNextPrompt(
  userMessage: string,
  neededInfo: string[],
  setupComplete: boolean,
  agentData: Record<string, any>,
): string {
  if (setupComplete) {
    return `The user has provided all the information needed for their custom agent. Thank them enthusiastically and let them know you're ready to create their unique agent. Mention something specific about what makes their agent special based on their requirements.`
  }

  const nextNeeded = neededInfo[0] || "additional_details"

  const contextInfo = `
Current information about their custom agent:
${agentData.purpose ? `- Purpose: ${agentData.purpose}` : ""}
${agentData.industry ? `- Industry: ${agentData.industry}` : ""}
${agentData.name ? `- Name: ${agentData.name}` : ""}
${agentData.personality ? `- Personality: ${agentData.personality}` : ""}
${agentData.tools ? `- Tools: ${agentData.tools}` : ""}
`

  const prompts: Record<string, string> = {
    purpose: `Based on their initial response, ask a follow-up question to better understand their specific use case or the problems they want their custom agent to solve. Be curious and encouraging. ${contextInfo}`,
    industry: `Ask about their industry, field, or domain to better understand the context where their agent will work. This will help tailor the agent's knowledge and approach. ${contextInfo}`,
    name: `Ask what they'd like to name their custom agent. Suggest that a good name can reflect the agent's purpose or personality. ${contextInfo}`,
    personality: `Ask about the personality or communication style they want their agent to have. Should it be formal, casual, friendly, professional, etc? ${contextInfo}`,
    tools: `Ask about any specific tools, integrations, or capabilities they want their agent to have. This could include APIs, databases, or specific software. ${contextInfo}`,
    additional_details: `Ask if there are any other specific requirements, constraints, or features they want for their custom agent. ${contextInfo}`,
  }

  return prompts[nextNeeded]
}

function getCustomNextQuestion(neededInfo: string): string {
  const questions: Record<string, string> = {
    purpose: "What specific tasks or problems would you like your custom agent to help you solve?",
    industry: "What industry or field will your agent be working in?",
    name: "What would you like to name your custom agent?",
    personality: "What personality or communication style should your agent have?",
    tools: "Are there any specific tools or integrations you'd like your agent to use?",
  }

  return questions[neededInfo] || "Is there anything else specific you'd like your custom agent to do?"
}

function getCustomAgentGreeting(): string {
  return "Hi there! I'm excited to help you create a completely custom AI agent tailored to your unique needs. What specific tasks or challenges would you like your custom agent to help you with?"
}

// Create initial tasks for custom agent
async function createCustomInitialTasks(agentId: string, agentData: any, userId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

    // Try to generate custom tasks using AI if available
    const availableProviders = await LLMService.getAvailableProviders(userId)

    if (availableProviders.length > 0) {
      try {
        const taskPrompt = `Create 3-4 initial setup tasks for a custom AI agent with these specifications:

Purpose: ${agentData.purpose}
Industry: ${agentData.industry || "General"}
Name: ${agentData.name}
Personality: ${agentData.personality || "Professional"}
Tools: ${agentData.tools || "Standard tools"}

Return a JSON array of task objects:
[
  {
    "title": "Task title",
    "description": "Detailed task description",
    "priority": "high|medium|low",
    "status": "todo",
    "category": "setup|research|implementation|testing"
  }
]

Focus on setup, configuration, and initial implementation tasks specific to this custom agent's purpose.`

        const systemPrompt = `You are a task planning assistant for custom AI agents. Create practical, specific tasks that will help set up and configure the agent for its intended purpose. Return only valid JSON.`

        const result = await LLMService.generateJSON({
          prompt: taskPrompt,
          systemPrompt,
          userId,
        })

        if (result.success && result.data && Array.isArray(result.data)) {
          console.log(`[CreateCustomInitialTasks] Generated ${result.data.length} custom tasks with AI`)

          for (const task of result.data) {
            await supabase.from("tasks").insert({
              agent_id: agentId,
              title: task.title,
              description: task.description,
              priority: task.priority || "medium",
              status: task.status || "todo",
              category: task.category || "setup",
              created_at: new Date().toISOString(),
            })
          }

          return
        }
      } catch (error) {
        console.error("[CreateCustomInitialTasks] Error generating tasks with AI:", error)
      }
    }

    // Fallback: Create basic custom agent tasks
    console.log("[CreateCustomInitialTasks] Using fallback custom task creation")

    const fallbackTasks = [
      {
        title: `Configure ${agentData.name} for ${agentData.industry || "your domain"}`,
        description: `Set up the agent's knowledge base and configure it for ${agentData.purpose}`,
        priority: "high",
        category: "setup",
      },
      {
        title: "Define custom workflows and processes",
        description: `Create specific workflows tailored to ${agentData.purpose}`,
        priority: "medium",
        category: "implementation",
      },
      {
        title: "Test agent capabilities and responses",
        description: "Validate that the agent performs as expected for your use case",
        priority: "medium",
        category: "testing",
      },
    ]

    for (const task of fallbackTasks) {
      await supabase.from("tasks").insert({
        agent_id: agentId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: "todo",
        category: task.category,
        created_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error creating custom initial tasks:", error)
  }
}

async function extractCustomInfoWithAI(
  userMessage: string,
  messageHistory: Array<{ role: string; content: string }>,
  currentData: Record<string, any>,
  userId: string,
): Promise<Record<string, any>> {
  try {
    const extractionPrompt = `Analyze this conversation about creating a custom AI agent and extract any new information.

Previous conversation:
${messageHistory
  .slice(-4)
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join("\n")}

Latest user message: "${userMessage}"

Current agent data:
${JSON.stringify(currentData, null, 2)}

Extract and return ONLY new information in this JSON format:
{
  "purpose": "what they want the agent to do/solve",
  "industry": "their industry or domain",
  "name": "what they want to name the agent",
  "personality": "communication style preferences",
  "tools": "specific tools or integrations mentioned"
}

Only include fields where new information was provided. Return empty object {} if no new information.`

    const result = await LLMService.generateJSON({
      prompt: extractionPrompt,
      systemPrompt:
        "You are a data extraction assistant for custom AI agent creation. Extract only new, relevant information. Return valid JSON.",
      userId,
    })

    if (result.success && result.data) {
      console.log("[ExtractCustomInfo] AI extraction successful:", result.data)
      return result.data
    }
  } catch (error) {
    console.error("[ExtractCustomInfo] AI extraction failed:", error)
  }

  // Fallback to simple extraction
  return extractCustomInfoFromMessage(
    userMessage,
    messageHistory[messageHistory.length - 2]?.content || "",
    currentData,
  )
}

function handleCustomFallbackConversation(
  userMessage: string,
  messageHistory: Array<{ role: string; content: string }>,
  currentAgentData: Record<string, any>,
): CustomChatResponse {
  const neededInfo = determineCustomNeededInfo(messageHistory, currentAgentData)
  const extractedData = extractCustomInfoFromMessage(
    userMessage,
    messageHistory[messageHistory.length - 2]?.content || "",
    currentAgentData,
  )

  const updatedAgentData = { ...currentAgentData, ...extractedData }
  const setupComplete = isCustomSetupComplete(updatedAgentData, neededInfo)

  const nextMessage = setupComplete
    ? "Excellent! I have all the details I need to create your custom agent. Ready to bring it to life?"
    : getCustomNextQuestion(neededInfo[0])

  return {
    success: true,
    message: nextMessage,
    agentData: updatedAgentData,
    setupComplete,
  }
}
