import { agentTemplates } from "@/lib/agent-templates"

export interface ClientTemplateConfiguration {
  id: string
  name: string
  goal: string
  behavior: string
  isEditable: boolean
  requiredFields: string[]
  optionalFields: string[]
  suggestedTools: string[]
  integrations: string[]
}

export class ClientTemplateManager {
  /**
   * Get basic template configuration (client-side fallback)
   */
  static getBasicTemplateConfiguration(templateId: string): ClientTemplateConfiguration | null {
    const template = agentTemplates.find((t) => t.id === templateId)
    if (!template) return null

    const isCustomTemplate = templateId === "custom-agent"

    return {
      id: template.id,
      name: template.name,
      goal: isCustomTemplate ? "" : template.defaultGoal || "",
      behavior: isCustomTemplate ? "" : template.defaultBehavior || "",
      isEditable: isCustomTemplate,
      requiredFields: isCustomTemplate ? ["name", "goal", "behavior"] : ["name"],
      optionalFields: isCustomTemplate ? [] : ["goal", "behavior"],
      suggestedTools: template.suggestedTools || [],
      integrations: template.integrations || [],
    }
  }
}
