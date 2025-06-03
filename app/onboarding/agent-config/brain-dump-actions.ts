"use server"

import { AgentTemplateManager } from "@/lib/agent-template-manager"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"

export interface BrainDumpResult {
  success: boolean
  extractedGoal?: string
  extractedBehavior?: string
  suggestedAnswers?: Record<string, any>
  error?: string
}

export async function processBrainDump(templateId: string, text: string): Promise<BrainDumpResult> {
  try {
    // Validate input
    if (!text || text.trim().length < 50) {
      return {
        success: false,
        error: "Please provide more text for analysis (minimum 50 characters).",
      }
    }

    if (!templateId) {
      return {
        success: false,
        error: "Template ID is required for analysis.",
      }
    }

    // Get current user
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return {
        success: false,
        error:
          "Authentication required. Please log in and configure your OpenAI API key in Settings → Profile → API Keys to use AI analysis.",
      }
    }

    console.log("Processing brain dump for user:", userId, "template:", templateId)

    // Process with AI
    const result = await AgentTemplateManager.processBrainDump(text, templateId)

    if (result.error) {
      console.warn("AI analysis failed, using fallback:", result.error)

      if (result.error.includes("OPENAI_API_KEY")) {
        return {
          success: false,
          error: "OpenAI API key is not configured. Please configure it in Settings → Profile → API Keys.",
        }
      }

      // Use fallback analysis if AI fails
      const fallbackResult = AgentTemplateManager.getFallbackAnalysis(text, templateId)

      return {
        success: true,
        extractedGoal: fallbackResult.extractedGoal,
        extractedBehavior: fallbackResult.extractedBehavior,
        suggestedAnswers: fallbackResult.suggestedAnswers,
      }
    }

    console.log("Brain dump analysis successful")

    return {
      success: true,
      extractedGoal: result.extractedGoal,
      extractedBehavior: result.extractedBehavior,
      suggestedAnswers: result.suggestedAnswers,
    }
  } catch (error) {
    console.error("Error in processBrainDump action:", error)

    // Provide fallback even on unexpected errors
    try {
      const fallbackResult = AgentTemplateManager.getFallbackAnalysis(text, templateId)
      return {
        success: true,
        extractedGoal: fallbackResult.extractedGoal,
        extractedBehavior: fallbackResult.extractedBehavior,
        suggestedAnswers: fallbackResult.suggestedAnswers,
      }
    } catch (fallbackError) {
      return {
        success: false,
        error: "Analysis failed. Please try again or configure your OpenAI API key in Settings.",
      }
    }
  }
}

export async function saveTemplateConfiguration(
  templateId: string,
  configuration: {
    goal: string
    behavior: string
    customAnswers: Record<string, any>
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId()
    const supabase = getSupabaseFromServer()

    const { error } = await supabase.from("template_configurations").upsert({
      template_id: templateId,
      user_id: userId,
      goal: configuration.goal,
      behavior: configuration.behavior,
      custom_answers: configuration.customAnswers,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Failed to save template configuration:", error)
      throw new Error(`Failed to save template configuration: ${error.message}`)
    }

    console.log("Template configuration saved successfully")
    return { success: true }
  } catch (error) {
    console.error("Error saving template configuration:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
