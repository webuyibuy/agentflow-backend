"use server"

import { getSupabaseAdmin, getSupabaseFromServer } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDefaultUserId } from "@/lib/default-user"
import { GeneralAgentAI, type TaskSuggestion } from "@/lib/general-agent-ai"

export interface GeneralAgentState {
  message?: string
  error?: string
  response?: string
  taskSuggestions?: TaskSuggestion[]
  goals?: string[]
  conversationId?: string
}

export async function getOrCreateConversation(): Promise<{ conversationId: string | null; userName: string | null }> {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { conversationId: null, userName: null }
    }

    // Get user's display name
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

    // Check for existing active conversation
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("agent_type", "general")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (existingConversation) {
      return {
        conversationId: existingConversation.id,
        userName: profile?.display_name || null,
      }
    }

    // Create new conversation
    const generalAgent = new GeneralAgentAI(user.id)
    await generalAgent.initialize()
    const conversationId = await generalAgent.createConversation()

    return {
      conversationId,
      userName: profile?.display_name || null,
    }
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error)
    return { conversationId: null, userName: null }
  }
}

export async function getConversationMessages(conversationId: string): Promise<any[]> {
  try {
    const supabase = getSupabaseFromServer()
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
      return []
    }

    return messages || []
  } catch (error) {
    console.error("Error in getConversationMessages:", error)
    return []
  }
}

export async function sendMessageToGeneralAgent(
  prevState: GeneralAgentState | undefined,
  formData: FormData,
): Promise<GeneralAgentState> {
  try {
    const userId = await getDefaultUserId()
    const userMessage = formData.get("message") as string
    const userName = formData.get("userName") as string
    const conversationId = formData.get("conversationId") as string

    if (!userMessage?.trim()) {
      return { error: "Please enter a message" }
    }

    // Initialize General Agent AI with existing conversation if available
    const generalAgent = new GeneralAgentAI(userId, conversationId || null)
    const initialized = await generalAgent.initialize()

    if (!initialized) {
      return {
        error: "OpenAI API key not configured. Please add your API key in settings.",
        response: "I need an OpenAI API key to help you. Please configure it in your settings first.",
      }
    }

    // Send message and get response
    const result = await generalAgent.sendMessage(userMessage.trim(), userName)

    if (result.error) {
      return {
        error: result.error,
        response: result.response,
        conversationId: generalAgent.getConversationId() || undefined,
      }
    }

    // If we have task suggestions, create them automatically
    if (result.analysis?.taskSuggestions && result.analysis.taskSuggestions.length > 0) {
      await createTasksFromSuggestions(result.analysis.taskSuggestions, userId, generalAgent.getConversationId())
    }

    return {
      response: result.response,
      taskSuggestions: result.analysis?.taskSuggestions || [],
      goals: result.analysis?.goals || [],
      message: "Message sent successfully",
      conversationId: generalAgent.getConversationId() || undefined,
    }
  } catch (error) {
    console.error("Error in General Agent conversation:", error)
    return {
      error: "Failed to process your message. Please try again.",
      response: "I'm having trouble right now. Please try again in a moment.",
    }
  }
}

async function createTasksFromSuggestions(
  suggestions: TaskSuggestion[],
  userId: string,
  conversationId: string | null,
) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    // First, ensure we have a General Agent created for this user
    const generalAgentId = await getOrCreateGeneralAgent(userId)

    // Create tasks from suggestions
    const tasksToCreate = suggestions.map((suggestion) => ({
      agent_id: generalAgentId,
      title: suggestion.title,
      description: suggestion.description,
      status: suggestion.isDependency ? "blocked" : "todo",
      is_dependency: suggestion.isDependency,
      blocked_reason: suggestion.isDependency ? suggestion.blockedReason || "Requires human review and approval" : null,
      priority: suggestion.priority,
      estimated_hours: suggestion.estimatedHours || null,
      category: suggestion.category,
      conversation_id: conversationId,
      auto_generated: true,
      requires_approval: suggestion.isDependency,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin.from("tasks").insert(tasksToCreate)

    if (error) {
      console.error("Error creating tasks from suggestions:", error)
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/dependencies")
  } catch (error) {
    console.error("Error in createTasksFromSuggestions:", error)
  }
}

async function getOrCreateGeneralAgent(userId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin()

  // Check if General Agent already exists
  const { data: existingAgent } = await supabaseAdmin
    .from("agents")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", "General Agent")
    .single()

  if (existingAgent) {
    return existingAgent.id
  }

  // Create General Agent
  const { data: newAgent, error } = await supabaseAdmin
    .from("agents")
    .insert({
      owner_id: userId,
      name: "General Agent",
      description: "Your intelligent assistant that helps break down goals into actionable tasks",
      template_slug: "general-assistant",
      status: "active",
      goal: "Help users achieve their objectives by creating and managing tasks intelligently",
      behavior_description: "Conversational AI that understands goals and creates actionable task plans",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating General Agent:", error)
    throw new Error("Failed to create General Agent")
  }

  return newAgent.id
}

export async function completeGeneralAgentOnboarding(): Promise<void> {
  try {
    const userId = await getDefaultUserId()

    // Mark onboarding as complete and redirect to dashboard
    redirect("/dashboard")
  } catch (error) {
    console.error("Error completing General Agent onboarding:", error)
    throw new Error("Failed to complete onboarding")
  }
}
