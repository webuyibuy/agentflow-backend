"use server"

import { EnhancedGeneralAgent } from "@/lib/enhanced-general-agent"
import { ProductionDatabase } from "@/lib/production-database"
import { getSupabaseFromServer } from "@/lib/supabase/server"

export async function initializeGeneralAgentConversation() {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Authentication required" }
    }

    const agent = new EnhancedGeneralAgent()
    const conversationId = await agent.initializeConversation(user.id)

    if (!conversationId) {
      return { error: "Failed to initialize conversation" }
    }

    return { success: true, conversationId }
  } catch (error) {
    console.error("Error initializing conversation:", error)
    return { error: "Failed to initialize General Agent" }
  }
}

export async function sendMessageToGeneralAgent(conversationId: string, message: string) {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Authentication required" }
    }

    if (!message.trim()) {
      return { error: "Message cannot be empty" }
    }

    const agent = new EnhancedGeneralAgent()
    const response = await agent.sendMessage(conversationId, message.trim())

    if (!response) {
      return { error: "Failed to get response from General Agent" }
    }

    return { success: true, response }
  } catch (error) {
    console.error("Error sending message:", error)
    return { error: "Failed to send message" }
  }
}

export async function getConversationHistory(conversationId: string) {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Authentication required" }
    }

    const agent = new EnhancedGeneralAgent()
    const messages = await agent.getConversationHistory(conversationId)

    return { success: true, messages }
  } catch (error) {
    console.error("Error getting conversation history:", error)
    return { error: "Failed to load conversation history" }
  }
}

export async function completeOnboarding() {
  try {
    const supabase = getSupabaseFromServer()
    const db = ProductionDatabase.getInstance()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Authentication required" }
    }

    // Mark onboarding as completed
    const success = await db.updateOnboardingProgress(user.id, 3, true)

    if (!success) {
      return { error: "Failed to complete onboarding" }
    }

    // Track completion
    await db.trackUserActivity(user.id, "onboarding_completed", "onboarding", undefined, {
      completed_at: new Date().toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error completing onboarding:", error)
    return { error: "Failed to complete onboarding" }
  }
}
