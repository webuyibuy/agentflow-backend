"use server"

import { z } from "zod"
import { getDefaultUserId } from "@/lib/default-user"
import { getTemplateById } from "@/lib/agent-templates"
import { ClientTemplateManager } from "@/lib/client-template-manager"

export interface AgentConfigState {
  success?: boolean
  errors?: {
    agentName?: string[]
    agentGoal?: string[]
    agentBehavior?: string[]
    _form?: string[]
  }
  message?: string
  redirectTo?: string
}

const agentConfigSchema = z.object({
  templateSlug: z.string(),
  agentName: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be at most 50 characters"),
  agentGoal: z.string().min(10, "Goal must be at least 10 characters").max(500, "Goal must be at most 500 characters"),
  agentBehavior: z.string().max(1000, "Behavior must be at most 1000 characters").optional(),
  customAnswers: z.string().optional(),
})

export async function storeAgentConfiguration(
  prevState: AgentConfigState,
  formData: FormData,
): Promise<AgentConfigState> {
  try {
    // Get user ID
    let userId: string
    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return {
        success: false,
        message: "You must be logged in to configure an agent.",
        errors: {
          _form: ["Authentication error. Please log in again."],
        },
      }
    }

    // Parse and validate form data
    const rawData = {
      templateSlug: formData.get("templateSlug") as string,
      agentName: formData.get("agentName") as string,
      agentGoal: formData.get("agentGoal") as string,
      agentBehavior: formData.get("agentBehavior") as string,
      customAnswers: formData.get("customAnswers") as string,
    }

    // Get template info
    const template =
      getTemplateById(rawData.templateSlug) || ClientTemplateManager.getBasicTemplateConfiguration(rawData.templateSlug)

    // If template is custom, behavior is required
    const validationSchema =
      rawData.templateSlug === "custom-agent" ? agentConfigSchema.required({ agentBehavior: true }) : agentConfigSchema

    const validationResult = validationSchema.safeParse(rawData)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        message: "Please fix the errors in the form.",
        errors: {
          agentName: errors.agentName,
          agentGoal: errors.agentGoal,
          agentBehavior: errors.agentBehavior,
        },
      }
    }

    // Store in session for next step
    const sessionData = {
      templateSlug: rawData.templateSlug,
      templateName: template?.name || "Custom Agent",
      agentName: rawData.agentName.trim(),
      agentGoal: rawData.agentGoal.trim(),
      agentBehavior: rawData.agentBehavior?.trim() || "",
      customAnswers: rawData.customAnswers || "{}",
      userId,
    }

    // In a real implementation, you'd store this in a session or database
    // For now, we'll just redirect to the review page with query params
    const queryParams = new URLSearchParams({
      template: sessionData.templateSlug,
      name: sessionData.agentName,
      // We'll use a simplified approach for demo purposes
    })

    return {
      success: true,
      message: "Configuration saved successfully!",
      redirectTo: `/onboarding/review-deploy?${queryParams.toString()}`,
    }
  } catch (error) {
    console.error("Error storing agent configuration:", error)
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
      errors: {
        _form: ["Server error. Please try again later."],
      },
    }
  }
}
