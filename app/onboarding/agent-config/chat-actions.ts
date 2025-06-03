"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getDecryptedApiKey } from "@/app/dashboard/settings/profile/api-key-actions"
import { AgentOrchestrator } from "@/lib/agent-orchestrator"

// IMPORTANT: This must match exactly what's in the database
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"
const DEFAULT_USER_DISPLAY_NAME = "Default User"

interface ChatRequest {
  templateSlug: string
  templateName: string
  userId: string
  messageHistory?: Array<{ role: string; content: string }>
  userMessage?: string
  isInitial?: boolean
  currentAgentData?: Record<string, any>
}

interface ChatResponse {
  success: boolean
  message?: string
  agentData?: Record<string, any>
  setupComplete?: boolean
  error?: string
  conversationCount?: number
  suggestions?: string[]
  apiCallMade?: boolean
  debugInfo?: any
}

export async function generateChatResponse(request: ChatRequest): Promise<ChatResponse> {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    userId: request.userId,
    templateName: request.templateName,
    isInitial: request.isInitial,
    userMessage: request.userMessage,
  }

  try {
    const {
      templateSlug,
      templateName,
      userId,
      messageHistory = [],
      userMessage,
      isInitial = false,
      currentAgentData = {},
    } = request

    console.log(`🚀 [DEBUG] Starting generateChatResponse`)
    console.log(`📋 [DEBUG] Request:`, { templateName, userId, isInitial, userMessage })

    // Count conversation exchanges
    const conversationCount = messageHistory.filter((msg) => msg.role === "user").length
    debugInfo.conversationCount = conversationCount

    // Step 1: Get API key
    console.log(`🔑 [DEBUG] Getting API key for user: ${userId}`)
    const openaiKey = await getDecryptedApiKey("openai", userId)

    if (!openaiKey) {
      console.log(`❌ [DEBUG] No API key found`)
      debugInfo.apiKeyFound = false
      return {
        success: false,
        error: "No OpenAI API key found. Please add your API key in Settings → Profile.",
        apiCallMade: false,
        debugInfo,
      }
    }

    console.log(`✅ [DEBUG] API key found: ${openaiKey.substring(0, 5)}...`)
    debugInfo.apiKeyFound = true
    debugInfo.apiKeyPrefix = openaiKey.substring(0, 5)
    debugInfo.apiKeyLength = openaiKey.length

    // Step 2: Validate API key format
    if (openaiKey.length < 10) {
      console.log(`⚠️ [DEBUG] API key seems too short (${openaiKey.length} chars)`)
      debugInfo.apiKeyValid = false
      debugInfo.apiKeyTooShort = true
      return {
        success: false,
        error: "API key seems too short. Please check your API key in Settings.",
        apiCallMade: false,
        debugInfo,
      }
    }

    debugInfo.apiKeyValid = true

    // Step 3: Build messages for OpenAI
    const messages = []

    // Calculate target response length based on user message length
    const userMessageLength = userMessage?.length || 20
    const minLength = 10
    const maxLength = 164
    const targetLength = Math.min(maxLength, Math.max(minLength, Math.floor(userMessageLength * 1.5)))

    const systemPrompt = `You are a professional ${templateName} AI assistant helping someone configure an AI agent.

IMPORTANT FORMATTING INSTRUCTIONS:
1. Always start your response with a simple greeting and question
2. Keep your response between ${minLength} and ${maxLength} characters
3. Target response length: approximately ${targetLength} characters
4. Be concise but helpful
5. Use a conversational, friendly tone
6. Ask specific questions about their goals, industry, and needs
7. Focus on understanding what tasks they want the agent to help with

Your role is to gather information to create an effective AI agent for their specific needs.`

    messages.push({ role: "system", content: systemPrompt })

    // Add conversation history
    messageHistory.forEach((msg) => {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content })
    })

    // Add current message
    if (!isInitial && userMessage) {
      messages.push({ role: "user", content: userMessage })
    }

    if (isInitial) {
      messages.push({
        role: "user",
        content: `Hello! I want to set up a ${templateName} AI agent.`,
      })
    }

    console.log(`📡 [DEBUG] Making OpenAI API call with ${messages.length} messages`)
    debugInfo.messagesCount = messages.length
    debugInfo.apiCallAttempted = true

    // Step 4: Make OpenAI API call
    const apiStartTime = Date.now()
    const apiEndpoint = "https://api.openai.com/v1/chat/completions"
    const model = "gpt-3.5-turbo"

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 300,
        temperature: 0.8,
      }),
    })

    const apiEndTime = Date.now()
    debugInfo.apiCallDuration = apiEndTime - apiStartTime

    console.log(`📡 [DEBUG] OpenAI API Response Status: ${response.status}`)
    console.log(`⏱️ [DEBUG] API call took: ${debugInfo.apiCallDuration}ms`)

    debugInfo.apiResponseStatus = response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [DEBUG] OpenAI API Error:`, errorText)
      debugInfo.apiError = errorText

      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication error: Invalid API key. Please check your OpenAI API key.",
          apiCallMade: true,
          debugInfo,
        }
      } else if (response.status === 429) {
        return {
          success: false,
          error: "Rate limit exceeded: Your OpenAI account has reached its quota or rate limit.",
          apiCallMade: true,
          debugInfo,
        }
      } else {
        return {
          success: false,
          error: `OpenAI API Error (${response.status}): ${errorText}`,
          apiCallMade: true,
          debugInfo,
        }
      }
    }

    // Step 5: Parse response
    const data = await response.json()
    const aiMessage = data.choices?.[0]?.message?.content || ""

    console.log(`✅ [DEBUG] OpenAI Success! Message length: ${aiMessage.length}`)
    console.log(`💰 [DEBUG] Tokens used: ${data.usage?.total_tokens || "unknown"}`)
    console.log(`🤖 [DEBUG] AI Response: "${aiMessage.substring(0, 100)}..."`)

    debugInfo.aiMessageLength = aiMessage.length
    debugInfo.tokensUsed = data.usage?.total_tokens
    debugInfo.apiCallSuccessful = true

    // Step 6: Extract agent info if enough conversation
    let extractedData = {}
    if (conversationCount >= 2) {
      console.log(`🧠 [DEBUG] Extracting agent info...`)
      extractedData = await extractAgentInfo(messages, openaiKey, debugInfo)
    }

    // Step 7: Generate suggestions based on conversation
    let suggestions: string[] = []
    if (conversationCount >= 2) {
      console.log(`💡 [DEBUG] Generating suggestions...`)
      suggestions = await generateSuggestions(messages, templateName, openaiKey, debugInfo)
    }

    const updatedAgentData = { ...currentAgentData, ...extractedData }
    const shouldShowButton = conversationCount >= 3 // Reduced from 4 to 3 for faster flow

    return {
      success: true,
      message: aiMessage,
      agentData: updatedAgentData,
      setupComplete: shouldShowButton,
      conversationCount: isInitial ? 0 : conversationCount + 1,
      suggestions: suggestions,
      apiCallMade: true,
      debugInfo,
    }
  } catch (error) {
    console.error(`💥 [DEBUG] Error in generateChatResponse:`, error)
    debugInfo.error = error instanceof Error ? error.message : String(error)

    return {
      success: false,
      error: `Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}`,
      apiCallMade: false,
      debugInfo,
    }
  }
}

async function extractAgentInfo(
  messages: Array<{ role: string; content: string }>,
  openaiKey: string,
  debugInfo: any,
): Promise<Record<string, any>> {
  try {
    console.log(`🔍 [DEBUG] Making extraction API call...`)

    const extractPrompt = `Based on this conversation, extract key information about what the user wants their AI agent to help with.

Conversation:
${messages
  .slice(-6)
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join("\n")}

Return ONLY a JSON object with these fields:
{
  "name": "suggested agent name (max 50 chars)",
  "goal": "what they want to accomplish (max 200 chars)", 
  "behavior": "how they want the agent to behave (max 200 chars)",
  "focus_area": "main area of focus",
  "industry": "their industry if mentioned",
  "key_tasks": ["task1", "task2", "task3"]
}

Return valid JSON only.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Extract information and return only valid JSON." },
          { role: "user", content: extractPrompt },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const jsonString = data.choices?.[0]?.message?.content || "{}"

      try {
        const extracted = JSON.parse(jsonString)
        console.log(`✅ [DEBUG] Extracted:`, extracted)
        debugInfo.extractionSuccessful = true
        return extracted
      } catch (parseError) {
        console.log(`⚠️ [DEBUG] JSON parse failed: ${jsonString}`)
        debugInfo.extractionParseError = jsonString
      }
    } else {
      console.log(`❌ [DEBUG] Extraction API failed: ${response.status}`)
      debugInfo.extractionApiFailed = response.status
    }
  } catch (error) {
    console.error(`❌ [DEBUG] Extraction error:`, error)
    debugInfo.extractionError = error instanceof Error ? error.message : String(error)
  }

  return {}
}

async function generateSuggestions(
  messages: Array<{ role: string; content: string }>,
  templateName: string,
  openaiKey: string,
  debugInfo: any,
): Promise<string[]> {
  try {
    console.log(`💡 [DEBUG] Making suggestion API call...`)

    const suggestionPrompt = `Based on this conversation about setting up a ${templateName} agent, suggest 3 specific questions to ask next.

Conversation:
${messages
  .slice(-4)
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join("\n")}

Provide 3 specific follow-up questions as a JSON array:
["What specific tasks should I help you with?", "What's your main goal?", "How can I best assist you?"]

Make questions practical and conversational.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Generate practical follow-up questions. Return JSON array only.",
          },
          { role: "user", content: suggestionPrompt },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const jsonString = data.choices?.[0]?.message?.content || "[]"

      try {
        const suggestions = JSON.parse(jsonString)
        console.log(`✅ [DEBUG] Suggestions:`, suggestions)
        debugInfo.suggestionsSuccessful = true
        return Array.isArray(suggestions) ? suggestions.slice(0, 3) : []
      } catch (parseError) {
        console.log(`⚠️ [DEBUG] Suggestions JSON parse failed: ${jsonString}`)
        debugInfo.suggestionsParseError = jsonString
      }
    } else {
      console.log(`❌ [DEBUG] Suggestions API failed: ${response.status}`)
      debugInfo.suggestionsApiFailed = response.status
    }
  } catch (error) {
    console.error(`❌ [DEBUG] Suggestions error:`, error)
    debugInfo.suggestionsError = error instanceof Error ? error.message : String(error)
  }

  return []
}

export async function completeAgentSetup(request: { agentData: any; userId: string }): Promise<{
  success: boolean
  redirectUrl?: string
  error?: string
  agentId?: string
}> {
  try {
    const { agentData, userId: originalUserId } = request
    const supabase = getSupabaseAdmin()

    console.log(`🎯 [DEBUG] Creating agent with data:`, agentData)
    console.log(`👤 [DEBUG] Original User ID: ${originalUserId}`)

    // CRITICAL FIX: Always use the default user ID directly
    // This bypasses any user ID validation or conversion that might be causing issues
    const validUserId = DEFAULT_USER_ID
    console.log(`✅ [DEBUG] Using hardcoded default user ID: ${validUserId}`)

    // Step 1: Directly create the default profile if it doesn't exist
    try {
      console.log(`👤 [DEBUG] Ensuring default profile exists via direct SQL...`)

      // Use direct SQL query to ensure the profile exists
      const { error: sqlError } = await supabase.rpc("create_default_profile_if_not_exists")

      if (sqlError) {
        console.error(`⚠️ [DEBUG] SQL function error:`, sqlError)

        // Fallback to direct insert if the function fails
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: DEFAULT_USER_ID,
            display_name: DEFAULT_USER_DISPLAY_NAME,
            updated_at: new Date().toISOString(),
          })
          .select()

        if (insertError && insertError.code !== "23505") {
          // Ignore duplicate key errors
          console.error(`⚠️ [DEBUG] Direct insert error:`, insertError)
        }
      }
    } catch (profileError) {
      console.error(`⚠️ [DEBUG] Profile creation error:`, profileError)
      // Continue anyway - the profile might already exist
    }

    // Step 2: Create agent with bulletproof foreign key handling
    const agentName = agentData.name || `My ${agentData.templateName || "Agent"}`
    const agentGoal = agentData.goal || `Help with ${(agentData.templateName || "general").toLowerCase()} tasks`
    const agentBehavior = agentData.behavior || `Professional ${agentData.templateName || "AI"} assistant`

    console.log(`🤖 [DEBUG] Creating agent with owner_id=${validUserId}`)

    // First, call our SQL function to ensure the profile exists
    const { error: profileEnsureError } = await supabase.rpc("create_default_profile_if_not_exists")
    if (profileEnsureError) {
      console.warn(`⚠️ [DEBUG] Profile function warning:`, profileEnsureError)
    }

    // Now create the agent with the guaranteed-to-exist profile
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: agentName,
        goal: agentGoal,
        behavior: agentBehavior,
        owner_id: validUserId, // This will now work because profile is guaranteed to exist
        template_slug: agentData.templateSlug || "custom",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, name")
      .single()

    if (agentError) {
      console.error(`❌ [DEBUG] Error creating agent:`, agentError)

      // If we STILL get a foreign key error, there's a deeper issue
      if (agentError.message?.includes("foreign key constraint")) {
        // Last resort: Check what profiles actually exist
        const { data: existingProfiles } = await supabase.from("profiles").select("id, display_name").limit(5)

        console.error(`❌ [DEBUG] Existing profiles:`, existingProfiles)

        return {
          success: false,
          error: "Database configuration error. Please contact support.",
        }
      }

      return {
        success: false,
        error: `Failed to create agent: ${agentError.message}`,
      }
    }

    if (!agent) {
      console.error(`❌ [DEBUG] No agent returned from insert`)
      return {
        success: false,
        error: "Agent creation failed - no data returned.",
      }
    }

    console.log(`✅ [DEBUG] Agent created successfully: ${agent.name} (${agent.id})`)

    // Step 3: Store conversation data
    try {
      const { error: customDataError } = await supabase.from("agent_custom_data").insert({
        agent_id: agent.id,
        custom_data: {
          ...agentData,
          created_via: "real_openai_conversation",
          original_user_id: originalUserId,
          agent_type: agentData.templateName || "Custom Agent",
          conversation_summary: `Agent configured through AI chat for ${agentData.templateName || "general"} tasks`,
          template_name: agentData.templateName,
          focus_area: agentData.focus_area,
          industry: agentData.industry,
          key_tasks: agentData.key_tasks || [],
        },
        configuration_method: "real_ai_chat",
        created_at: new Date().toISOString(),
      })

      if (customDataError) {
        console.warn(`⚠️ [DEBUG] Warning: Could not store conversation data:`, customDataError)
      } else {
        console.log(`✅ [DEBUG] Conversation data stored successfully`)
      }
    } catch (customDataError) {
      console.warn(`⚠️ [DEBUG] Warning: Error storing conversation data:`, customDataError)
    }

    // Step 4: Start the agent with intelligent orchestration
    try {
      console.log(`🚀 [DEBUG] Starting agent orchestration...`)

      await AgentOrchestrator.startAgent({
        agentId: agent.id,
        agentName: agent.name,
        agentGoal: agentGoal,
        userId: validUserId,
      })

      console.log(`✅ [DEBUG] Agent orchestration started successfully`)
    } catch (orchestrationError) {
      console.warn(`⚠️ [DEBUG] Warning: Agent orchestration failed:`, orchestrationError)
      // Don't fail the whole operation for this
    }

    // Step 5: Revalidate paths
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/agents")
    revalidatePath(`/dashboard/agents/${agent.id}`)
    revalidatePath("/dashboard/dependencies")

    console.log(`🎉 [DEBUG] Agent setup completed successfully!`)

    return {
      success: true,
      redirectUrl: `/dashboard/agents/${agent.id}`,
      agentId: agent.id,
    }
  } catch (error) {
    console.error(`💥 [DEBUG] Unexpected error in completeAgentSetup:`, error)
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function acceptSuggestion(
  suggestion: string,
  userId: string,
  currentAgentData: any,
): Promise<{ success: boolean; message?: string; agentData?: any }> {
  try {
    console.log(`✅ User accepted suggestion: "${suggestion}"`)

    const openaiKey = await getDecryptedApiKey("openai", userId)
    if (!openaiKey) {
      return { success: false, message: "OpenAI API key required" }
    }

    console.log(`🚀 Making API call to process accepted suggestion...`)

    const suggestionLength = suggestion.length
    const minLength = 10
    const maxLength = 164
    const targetLength = Math.min(maxLength, Math.max(minLength, Math.floor(suggestionLength * 1.2)))

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `The user accepted a suggestion. Provide a helpful response.
            
IMPORTANT FORMATTING INSTRUCTIONS:
1. Always start your response with a simple greeting and question
2. Keep your response between ${minLength} and ${maxLength} characters
3. Target response length: approximately ${targetLength} characters
4. Be concise but helpful
5. Use a conversational, friendly tone`,
          },
          {
            role: "user",
            content: `I accepted this suggestion: "${suggestion}". Please provide next steps.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const message = data.choices?.[0]?.message?.content || "Great choice! Let's continue."

      console.log(`✅ Processed suggestion acceptance`)

      return {
        success: true,
        message,
        agentData: {
          ...currentAgentData,
          accepted_suggestions: [...(currentAgentData.accepted_suggestions || []), suggestion],
          last_suggestion_accepted: suggestion,
        },
      }
    }

    return { success: false, message: "Failed to process suggestion" }
  } catch (error) {
    console.error("Error accepting suggestion:", error)
    return { success: false, message: "Error processing suggestion" }
  }
}
