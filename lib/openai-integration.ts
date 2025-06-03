export interface CustomQuestion {
  id: string
  question: string
  type: "text" | "textarea" | "select" | "multiselect"
  options?: string[]
  required: boolean
  category: string
  placeholder?: string
  roleContext?: string
}

export interface QuestionGenerationRequest {
  agentType: string
  agentGoal: string
  templateSlug: string
  userId?: string
}

export interface QuestionGenerationResult {
  success: boolean
  questions?: CustomQuestion[]
  error?: string
}

/**
 * Generate custom questions using OpenAI based on agent template and goal
 */
export async function generateCustomQuestions(request: QuestionGenerationRequest): Promise<QuestionGenerationResult> {
  try {
    // Use the multi-LLM provider with user's configured keys
    const { multiLLMProvider } = await import("@/lib/multi-llm-provider")

    const prompt = buildQuestionGenerationPrompt(request)

    const messages = [
      {
        role: "system" as const,
        content:
          "You are an expert AI agent configuration assistant. Generate relevant, strategic questions to help users configure their AI agents effectively. Return only valid JSON array of question objects.",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ]

    const result = await multiLLMProvider.sendMessage(messages, {
      temperature: 0.7,
      maxTokens: 1500, // Reduced token limit to save costs
      userId: request.userId,
    })

    if ("error" in result) {
      console.error("LLM Provider error:", result.error)
      return {
        success: false,
        error: result.error,
      }
    }

    const content = result.content
    if (!content) {
      throw new Error("No content received from LLM provider")
    }

    // Parse the JSON response
    let questions: CustomQuestion[]
    try {
      questions = JSON.parse(content) as CustomQuestion[]
    } catch (parseError) {
      console.error("Failed to parse LLM response:", content)
      throw new Error("Invalid response format from LLM provider")
    }

    // Validate and sanitize questions
    const validatedQuestions = validateQuestions(questions)

    console.log("Successfully generated questions:", validatedQuestions.length)
    return {
      success: true,
      questions: validatedQuestions,
    }
  } catch (error) {
    console.error("Error generating custom questions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate custom questions",
    }
  }
}

/**
 * Build the prompt for question generation based on agent template
 */
function buildQuestionGenerationPrompt(request: QuestionGenerationRequest): string {
  const { agentType, agentGoal, templateSlug } = request

  const templateSpecificPrompts = {
    "sales-lead-generator": `
      Focus on sales strategy, lead qualification, outreach methods, and conversion optimization.
      Consider: target market, lead sources, qualification criteria, outreach channels, follow-up sequences, CRM integration.
    `,
    "marketing-content-manager": `
      Focus on content strategy, brand voice, audience targeting, and content distribution.
      Consider: content types, posting frequency, brand guidelines, audience personas, content calendar, performance metrics.
    `,
    "developer-assistant": `
      Focus on development workflows, code quality, deployment processes, and team collaboration.
      Consider: tech stack, testing requirements, deployment environments, code review processes, documentation standards.
    `,
    "hr-recruitment-specialist": `
      Focus on recruitment strategy, candidate sourcing, screening processes, and hiring criteria.
      Consider: job requirements, sourcing channels, screening questions, interview process, onboarding workflow.
    `,
    "customer-support-agent": `
      Focus on support processes, response protocols, escalation procedures, and customer satisfaction.
      Consider: support channels, response times, knowledge base, escalation criteria, customer feedback.
    `,
    "research-analyst": `
      Focus on research methodology, data sources, analysis frameworks, and reporting requirements.
      Consider: research scope, data sources, analysis tools, reporting frequency, stakeholder requirements.
    `,
    "productivity-optimizer": `
      Focus on workflow optimization, task prioritization, automation opportunities, and productivity metrics.
      Consider: current workflows, bottlenecks, automation tools, productivity goals, team collaboration.
    `,
    "custom-agent": `
      Focus on specific requirements, custom workflows, integration needs, and unique business processes.
      Consider: business context, specific requirements, integration needs, success metrics, constraints.
    `,
    "mental-peace-coach": `
      Focus on understanding your stress levels, meditation experience, stress triggers, relaxation preferences, and available time for mindfulness practice.
      Consider: stress level, meditation experience, stress triggers, relaxation preferences, daily routine.
    `,
    "fitness-trainer": `
      Focus on understanding your current fitness level, workout preferences, available time, and equipment access.
      Consider: fitness level, workout preferences, available time, equipment access.
    `,
  }

  const templatePrompt =
    templateSpecificPrompts[templateSlug as keyof typeof templateSpecificPrompts] ||
    templateSpecificPrompts["custom-agent"]

  return `
Generate 4-6 strategic configuration questions for a ${agentType} agent with the goal: "${agentGoal}"

${templatePrompt}

Return a JSON array of question objects with this exact structure:
[
  {
    "id": "unique_id",
    "question": "Strategic question text",
    "type": "text|textarea|select|multiselect",
    "options": ["option1", "option2"] (only for select/multiselect),
    "required": true|false,
    "category": "strategy|configuration|integration|metrics|personal|goals",
    "placeholder": "helpful placeholder text",
    "roleContext": "additional context for the question"
  }
]

Make questions:
- Strategic and actionable
- Specific to the agent type and goal
- Help configure the agent's behavior effectively
- Include a mix of question types (text, textarea, select)
- Focus on practical implementation details

Example categories:
- strategy: High-level approach and methodology
- configuration: Specific settings and parameters
- integration: Tool and system connections
- metrics: Success measurement and KPIs
- personal: Information about the user
- goals: User's objectives and preferences
`
}

/**
 * Validate and sanitize generated questions
 */
function validateQuestions(questions: any[]): CustomQuestion[] {
  if (!Array.isArray(questions)) {
    throw new Error("Generated questions must be an array")
  }

  return questions.map((q, index) => {
    if (!q.question || typeof q.question !== "string") {
      throw new Error(`Question ${index + 1} must have a valid question text`)
    }

    const validTypes = ["text", "textarea", "select", "multiselect"]
    if (!validTypes.includes(q.type)) {
      q.type = "text" // Default fallback
    }

    return {
      id: q.id || `question_${Date.now()}_${index}`,
      question: q.question.trim(),
      type: q.type,
      options: Array.isArray(q.options) ? q.options : undefined,
      required: Boolean(q.required),
      category: q.category || "configuration",
      placeholder: q.placeholder || "",
      roleContext: q.roleContext || "",
    }
  })
}

/**
 * Get fallback questions if OpenAI generation fails
 */
export function getFallbackQuestions(templateSlug: string): CustomQuestion[] {
  const fallbackQuestions: Record<string, any[]> = {
    "mental-peace-coach": [
      {
        id: "stress_level",
        question: "On a scale of 1-10, how would you rate your current stress level?",
        type: "select",
        options: ["1 - Very Low", "2", "3", "4", "5 - Moderate", "6", "7", "8", "9", "10 - Very High"],
        required: true,
        category: "personal",
        placeholder: "Select your stress level",
        roleContext: "As your mindfulness coach, understanding your stress helps me tailor relaxation techniques.",
      },
      {
        id: "meditation_experience",
        question: "What's your experience with meditation or mindfulness practices?",
        type: "select",
        options: ["Complete beginner", "Some experience", "Regular practitioner", "Advanced practitioner"],
        required: true,
        category: "personal",
        roleContext: "This helps me choose the right meditation techniques for your level.",
      },
      {
        id: "stress_triggers",
        question: "What are your main sources of stress or anxiety?",
        type: "textarea",
        required: true,
        category: "personal",
        placeholder: "Work pressure, relationships, health concerns, etc.",
        roleContext: "Understanding your triggers helps me provide targeted stress-relief strategies.",
      },
      {
        id: "relaxation_preferences",
        question: "Which relaxation activities appeal to you most?",
        type: "multiselect",
        options: [
          "Guided meditation",
          "Breathing exercises",
          "Progressive muscle relaxation",
          "Mindful walking",
          "Journaling",
          "Nature sounds",
        ],
        required: false,
        category: "goals",
        roleContext: "I'll focus on techniques that resonate with your preferences.",
      },
      {
        id: "daily_routine",
        question: "How much time can you realistically dedicate to mindfulness practice daily?",
        type: "select",
        options: ["5-10 minutes", "10-20 minutes", "20-30 minutes", "30+ minutes", "It varies"],
        required: true,
        category: "configuration",
        roleContext: "This helps me create a sustainable practice schedule for you.",
      },
    ],

    "fitness-trainer": [
      {
        id: "fitness_level",
        question: "How would you describe your current fitness level?",
        type: "select",
        options: ["Beginner", "Intermediate", "Advanced", "Returning after break"],
        required: true,
        category: "personal",
        roleContext: "This helps me design workouts that challenge you appropriately without risking injury.",
      },
      {
        id: "workout_preferences",
        question: "What types of workouts do you enjoy or want to try?",
        type: "multiselect",
        options: ["Strength training", "Cardio", "Yoga", "HIIT", "Pilates", "Outdoor activities", "Sports"],
        required: true,
        category: "goals",
        roleContext: "I'll focus on activities you enjoy to keep you motivated and consistent.",
      },
      {
        id: "available_time",
        question: "How many days per week can you realistically commit to working out?",
        type: "select",
        options: ["2-3 days", "3-4 days", "4-5 days", "5-6 days", "Daily"],
        required: true,
        category: "configuration",
        roleContext: "This helps me create a realistic schedule that fits your lifestyle.",
      },
      {
        id: "equipment_access",
        question: "What equipment do you have access to?",
        type: "multiselect",
        options: ["Full gym", "Home gym", "Basic equipment (dumbbells, bands)", "Bodyweight only", "Outdoor space"],
        required: true,
        category: "configuration",
        roleContext: "I'll design workouts using only the equipment you have available.",
      },
    ],

    "sales-lead-generator": [
      {
        id: "target_market",
        question: "Who is your ideal customer or target market?",
        type: "textarea",
        required: true,
        category: "strategy",
        placeholder: "Industry, company size, job titles, demographics, etc.",
        roleContext: "Understanding your ideal customer helps me identify the best prospects for you.",
      },
      {
        id: "current_challenges",
        question: "What are your biggest challenges in lead generation right now?",
        type: "multiselect",
        options: [
          "Finding qualified prospects",
          "Getting responses to outreach",
          "Managing follow-ups",
          "Tracking lead quality",
          "Converting leads to meetings",
          "Time management",
        ],
        required: true,
        category: "strategy",
        roleContext: "I'll focus on solving your specific lead generation pain points.",
      },
      {
        id: "tools_available",
        question: "What sales tools and platforms do you currently use?",
        type: "multiselect",
        options: [
          "LinkedIn Sales Navigator",
          "CRM (Salesforce, HubSpot, etc.)",
          "Email automation",
          "Cold calling",
          "Social media",
          "None",
        ],
        required: true,
        category: "integration",
        roleContext: "I'll integrate with your existing tools to streamline your workflow.",
      },
      {
        id: "success_metrics",
        question: "How do you measure lead generation success?",
        type: "multiselect",
        options: [
          "Number of qualified leads",
          "Response rates",
          "Meeting bookings",
          "Pipeline value",
          "Conversion rates",
        ],
        required: true,
        category: "metrics",
        roleContext: "I'll track and optimize for the metrics that matter most to your business.",
      },
    ],

    // Add more template-specific fallback questions...
    default: [
      {
        id: "primary_challenge",
        question: "What's your biggest challenge in this area right now?",
        type: "textarea",
        required: true,
        category: "strategy",
        placeholder: "Describe your main challenge or pain point",
        roleContext: "Understanding your challenges helps me provide targeted solutions.",
      },
      {
        id: "success_definition",
        question: "What would success look like for you?",
        type: "textarea",
        required: true,
        category: "goals",
        placeholder: "Describe your ideal outcome",
        roleContext: "This helps me align my assistance with your vision of success.",
      },
      {
        id: "available_resources",
        question: "What resources do you have available?",
        type: "textarea",
        required: false,
        category: "configuration",
        placeholder: "Time, tools, budget, team members, etc.",
        roleContext: "I'll work within your available resources to maximize results.",
      },
      {
        id: "timeline",
        question: "What's your timeline for achieving this goal?",
        type: "select",
        options: ["1-2 weeks", "1 month", "2-3 months", "6 months", "1 year", "Ongoing"],
        required: true,
        category: "strategy",
        roleContext: "This helps me prioritize actions and set realistic milestones.",
      },
    ],
  }

  return fallbackQuestions[templateSlug] || fallbackQuestions.default
}
