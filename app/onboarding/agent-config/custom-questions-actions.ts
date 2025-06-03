"use server"

import { getFallbackQuestions } from "@/lib/openai-integration"
import { getDefaultUserId } from "@/lib/default-user"

export interface GenerateQuestionsResult {
  success: boolean
  questions?: any[]
  error?: string
  usedFallback?: boolean
}

const getRoleSpecificPrompt = (templateSlug: string, templateName: string, agentGoal: string) => {
  const rolePrompts: Record<string, string> = {
    "mental-peace-coach": `
You are a compassionate mindfulness and mental wellness expert. The user wants: "${agentGoal}"

As their mental peace coach, generate 5-6 deeply personal questions to understand:
- Their current stress levels and triggers
- Meditation experience and preferences  
- Daily routine and lifestyle factors
- Emotional challenges they face
- Preferred relaxation techniques
- Goals for inner peace and mental clarity

Make questions warm, non-judgmental, and focused on their wellness journey.`,

    "fitness-trainer": `
You are an experienced personal fitness trainer. The user wants: "${agentGoal}"

As their fitness coach, generate 5-6 motivational questions to understand:
- Current fitness level and exercise history
- Physical limitations or health considerations
- Workout preferences (home/gym, equipment available)
- Time availability and schedule constraints
- Motivation factors and fitness goals
- Preferred training intensity and style

Make questions encouraging and focused on creating their perfect fitness plan.`,

    "sales-lead-generator": `
You are a results-driven sales strategist. The user wants: "${agentGoal}"

As their sales expert, generate 5-6 strategic questions to understand:
- Target market and ideal customer profile
- Current sales process and challenges
- Available tools and CRM systems
- Budget and resource constraints
- Success metrics and KPIs
- Industry-specific requirements

Make questions business-focused and results-oriented.`,

    "financial-advisor": `
You are a trusted financial planning expert. The user wants: "${agentGoal}"

As their financial advisor, generate 5-6 professional questions to understand:
- Current financial situation and goals
- Risk tolerance and investment preferences
- Income sources and expense patterns
- Debt situation and financial obligations
- Retirement and long-term planning needs
- Financial knowledge and experience level

Make questions professional, trustworthy, and comprehensive.`,

    "parenting-coach": `
You are a warm, experienced parenting expert. The user wants: "${agentGoal}"

As their parenting coach, generate 5-6 supportive questions to understand:
- Children's ages and developmental stages
- Current parenting challenges and concerns
- Family dynamics and household structure
- Parenting style preferences and values
- Time constraints and daily routines
- Support system and resources available

Make questions understanding, non-judgmental, and family-focused.`,

    "language-tutor": `
You are an enthusiastic language learning expert. The user wants: "${agentGoal}"

As their language tutor, generate 5-6 encouraging questions to understand:
- Target language and current proficiency level
- Learning goals (conversation, business, travel, etc.)
- Previous language learning experience
- Available study time and preferred schedule
- Learning style preferences (visual, audio, interactive)
- Cultural interests and motivation for learning

Make questions encouraging and culturally aware.`,

    "travel-planner": `
You are an experienced travel expert and adventure guide. The user wants: "${agentGoal}"

As their travel planner, generate 5-6 exciting questions to understand:
- Preferred destinations and travel style
- Budget range and travel dates
- Group size and traveler preferences
- Accommodation and activity preferences
- Travel experience and comfort level
- Special interests or must-see attractions

Make questions enthusiastic and adventure-focused.`,

    "nutrition-advisor": `
You are a knowledgeable nutrition and wellness expert. The user wants: "${agentGoal}"

As their nutrition advisor, generate 5-6 health-focused questions to understand:
- Current eating habits and dietary restrictions
- Health goals and nutritional needs
- Cooking skills and meal preparation time
- Food preferences and cultural considerations
- Lifestyle factors affecting nutrition
- Previous diet experiences and challenges

Make questions health-focused and non-judgmental.`,

    "productivity-optimizer": `
You are an efficiency expert and productivity coach. The user wants: "${agentGoal}"

As their productivity optimizer, generate 5-6 systematic questions to understand:
- Current workflow and daily routine
- Time management challenges and bottlenecks
- Available tools and technology preferences
- Work environment and constraints
- Priority goals and success metrics
- Preferred productivity methodologies

Make questions systematic and goal-oriented.`,

    "creative-content-creator": `
You are an inspiring creative director and content strategist. The user wants: "${agentGoal}"

As their creative guide, generate 5-6 inspiring questions to understand:
- Content platforms and target audience
- Creative style and brand preferences
- Available resources and tools
- Content goals and success metrics
- Creative challenges and inspiration sources
- Collaboration and workflow preferences

Make questions inspiring and creativity-focused.`,
  }

  return (
    rolePrompts[templateSlug] ||
    `
You are a helpful ${templateName} expert. The user wants: "${agentGoal}"

Generate 5-6 strategic questions to understand their specific needs, preferences, challenges, and goals related to ${templateName.toLowerCase()} services.

Make questions engaging, relevant, and focused on gathering actionable information.`
  )
}

export async function generateAgentQuestions(
  templateSlug: string,
  agentGoal: string,
  templateName: string,
): Promise<GenerateQuestionsResult> {
  try {
    // Always start with fallback questions as a safety net
    const fallbackQuestions = getFallbackQuestions(templateSlug)

    // If goal is too short, use fallback immediately
    if (!agentGoal.trim() || agentGoal.length < 15) {
      console.log("⚠️ Agent goal too short, using fallback questions")
      return {
        success: true,
        questions: fallbackQuestions,
        usedFallback: true,
        error: "Agent goal too short - using standard questions",
      }
    }

    let userId: string
    try {
      userId = await getDefaultUserId()
      console.log("✅ User authenticated for question generation:", userId)
    } catch (error) {
      console.warn("⚠️ No user authentication for question generation, using fallback")
      return {
        success: true,
        questions: fallbackQuestions,
        usedFallback: true,
        error: "User not authenticated - using standard questions",
      }
    }

    console.log("🤖 Attempting to generate role-specific questions")

    // Use the new AIOperations with role-specific prompts
    const { AIOperations } = await import("@/lib/ai-operations")

    try {
      // Create role-specific prompt
      const rolePrompt = getRoleSpecificPrompt(templateSlug, templateName, agentGoal)

      const systemPrompt = `You are adopting the role of a ${templateName}. Generate personalized questions that help you understand the user's specific needs in this role.

Return a JSON array of question objects with this exact structure:
[
  {
    "id": "unique_id",
    "question": "Engaging, role-specific question text",
    "type": "text|textarea|select|multiselect|checkbox",
    "options": ["option1", "option2"] (only for select/multiselect),
    "required": true|false,
    "category": "strategy|configuration|integration|metrics|personal|goals",
    "placeholder": "helpful placeholder text",
    "roleContext": "Brief context about why you're asking this as their ${templateName.toLowerCase()}"
  }
]

Make questions:
1. Role-specific and engaging
2. Focused on gathering actionable information
3. Personal and relevant to their goal
4. Varied in type (mix of text, textarea, select, etc.)
5. Include role context to show your expertise`

      const result = await AIOperations.generateAgentQuestions(templateName, rolePrompt, templateSlug, userId)

      if (result.success && result.questions && result.questions.length > 0) {
        console.log("✅ Role-specific question generation successful:", result.questions.length, "questions")

        // Enhance questions with role-specific context
        const enhancedQuestions = result.questions.map((q: any, index: number) => ({
          ...q,
          id: q.id || `${templateSlug}_q${index + 1}`,
          roleContext:
            q.roleContext || `As your ${templateName.toLowerCase()}, I need to understand this to help you better.`,
        }))

        return {
          success: true,
          questions: enhancedQuestions,
          usedFallback: false,
        }
      }

      // If LLM generation fails, use enhanced fallback questions
      console.warn("⚠️ LLM question generation failed, using enhanced fallback:", result.error)

      const enhancedFallback = fallbackQuestions.map((q: any) => ({
        ...q,
        roleContext: `As your ${templateName.toLowerCase()}, this information helps me provide better assistance.`,
      }))

      return {
        success: true,
        questions: enhancedFallback,
        usedFallback: true,
        error: result.error || "AI generation failed",
      }
    } catch (timeoutError) {
      console.warn("⚠️ LLM request timed out, using fallback questions")
      return {
        success: true,
        questions: fallbackQuestions,
        usedFallback: true,
        error: "Request timed out - using standard questions",
      }
    }
  } catch (error) {
    console.error("❌ Error in generateAgentQuestions:", error)

    // Always provide fallback questions as last resort
    const fallbackQuestions = getFallbackQuestions(templateSlug)

    return {
      success: true,
      questions: fallbackQuestions,
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
