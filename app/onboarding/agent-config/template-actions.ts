"use server"

import { getSupabaseFromServer } from "@/lib/supabase/server"
import { agentTemplates } from "@/lib/agent-templates"

export interface TemplateConfiguration {
  id: string
  name: string
  goal: string
  behavior: string
  customQuestions: any[]
  defaultAnswers: Record<string, any>
  isEditable: boolean
  requiredFields: string[]
  optionalFields: string[]
  suggestedTools: string[]
  integrations: string[]
}

export async function getTemplateConfigurationAction(templateId: string): Promise<TemplateConfiguration | null> {
  try {
    const template = agentTemplates.find((t) => t.id === templateId)
    if (!template) {
      console.warn(`Template with id ${templateId} not found. Returning default custom agent config.`)
      return {
        id: "custom-agent",
        name: "",
        goal: "",
        behavior: "",
        customQuestions: [],
        defaultAnswers: {},
        isEditable: true,
        requiredFields: ["name", "goal", "behavior"],
        optionalFields: [],
        suggestedTools: [],
        integrations: [],
      }
    }

    // Get template-specific configuration from database if it exists
    const supabase = getSupabaseFromServer()
    const { data: templateConfig } = await supabase
      .from("template_configurations")
      .select("*")
      .eq("template_id", templateId)
      .maybeSingle()

    // Determine which fields are editable based on template type
    const isCustomTemplate = templateId === "custom-agent"

    // For pre-built templates, we provide default configurations
    // For custom templates, everything is editable and starts empty
    return {
      id: template.id,
      name: template.name,
      goal: isCustomTemplate ? "" : templateConfig?.goal || template.defaultGoal || "",
      behavior: isCustomTemplate ? "" : templateConfig?.behavior || template.defaultBehavior || "",
      customQuestions: templateConfig?.custom_questions || [],
      defaultAnswers: templateConfig?.default_answers || {},
      isEditable: isCustomTemplate,
      requiredFields: isCustomTemplate ? ["name", "goal", "behavior"] : ["name"],
      optionalFields: isCustomTemplate ? [] : ["goal", "behavior"],
      suggestedTools: template.suggestedTools || [],
      integrations: template.integrations || [],
    }
  } catch (error) {
    console.error("Error getting template configuration:", error)
    return null
  }
}

export async function processBrainDumpAction(
  text: string,
  templateId: string,
): Promise<{
  extractedGoal: string
  extractedBehavior: string
  suggestedAnswers: Record<string, any>
  error?: string
}> {
  try {
    // Get the template to understand its context
    const template = agentTemplates.find((t) => t.id === templateId)
    if (!template) {
      return {
        extractedGoal: "",
        extractedBehavior: "",
        suggestedAnswers: {},
        error: `Template with id ${templateId} not found`,
      }
    }

    // Get API key for LLM processing
    const supabase = getSupabaseFromServer()
    const { data: apiKeyData } = await supabase
      .from("api_keys")
      .select("decrypted_key")
      .eq("provider", "openai")
      .maybeSingle()

    const apiKey = apiKeyData?.decrypted_key

    if (!apiKey) {
      return {
        extractedGoal: "",
        extractedBehavior: "",
        suggestedAnswers: {},
        error: "OpenAI API key not configured. Please configure it in settings.",
      }
    }

    // Process with OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert AI agent configuration assistant. 
        You're helping configure a ${template.name} agent based on the provided business document.
        Extract the most relevant information to configure this agent effectively.`,
          },
          {
            role: "user",
            content: `Based on this business document, extract:
        1. A clear goal statement for a ${template.name}
        2. Detailed behavior instructions for the agent
        3. Key configuration parameters as JSON
        
        Business document:
        ${text.substring(0, 8000)} // Limit to 8000 chars to avoid token limits
        
        Return your analysis as JSON with these keys:
        {
          "extractedGoal": "The goal statement",
          "extractedBehavior": "Detailed behavior instructions",
          "suggestedAnswers": {
            // Key configuration parameters as key-value pairs
          }
        }`,
          },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    try {
      // Parse the JSON response
      if (!content) {
        return {
          extractedGoal: "",
          extractedBehavior: "",
          suggestedAnswers: {},
          error: "No content returned from brain dump analysis",
        }
      }
      const parsedContent = JSON.parse(content)
      return {
        extractedGoal: parsedContent.extractedGoal || "",
        extractedBehavior: parsedContent.extractedBehavior || "",
        suggestedAnswers: parsedContent.suggestedAnswers || {},
      }
    } catch (parseError) {
      console.error("Error parsing brain dump response:", parseError)
      return {
        extractedGoal: "",
        extractedBehavior: "",
        suggestedAnswers: {},
        error: `Failed to parse brain dump analysis: ${parseError.message}`,
      }
    }
  } catch (error) {
    console.error("Error processing brain dump:", error)
    return {
      extractedGoal: "",
      extractedBehavior: "",
      suggestedAnswers: {},
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
