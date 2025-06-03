"use server"

import { getSupabaseFromServer } from "@/lib/supabase/server"
import type { SmartQuestion, UserAnswer, GeneratedPlan, AIConsultationMessage } from "@/lib/systematic-flow-types"
import { getUserLLMProvider } from "@/lib/user-llm-provider"

export async function generateSmartQuestions(
  goalPrimer: string,
  previousAnswers: UserAnswer[] = [],
  questionRound = 1,
): Promise<{ success: boolean; questions?: SmartQuestion[]; error?: string }> {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const llmProvider = await getUserLLMProvider(user.id)
    if (!llmProvider) {
      return {
        success: false,
        error: "No LLM provider configured. Please add an API key in Settings → Profile → API Keys.",
      }
    }

    // Enhanced prompt with business logic
    const prompt = `You are an expert AI consultant specializing in agent configuration and business process automation.

CONTEXT:
- User's Goal: "${goalPrimer}"
- Question Round: ${questionRound}
- Previous Answers: ${JSON.stringify(previousAnswers)}

TASK: Generate 3-5 intelligent, strategic questions that will help create a comprehensive agent configuration plan.

BUSINESS LOGIC REQUIREMENTS:
1. Questions should progressively build understanding from high-level business needs to technical implementation
2. Each question should have clear business value and impact on the final agent design
3. Consider scalability, integration complexity, and ROI implications
4. Questions should uncover hidden requirements and potential challenges
5. Focus on actionable insights that will drive concrete implementation decisions

QUESTION CATEGORIES TO CONSIDER:
- Business: Value proposition, success metrics, stakeholder impact
- Technical: Integration requirements, data sources, performance needs
- Workflow: Process automation, decision points, exception handling
- Security: Data privacy, access control, compliance requirements
- Performance: Volume expectations, response times, availability needs
- Integration: Existing systems, APIs, data formats

OUTPUT FORMAT (JSON):
[
  {
    "id": "unique_id",
    "question": "Strategic question text",
    "type": "text|select|multiselect|boolean|range",
    "options": ["option1", "option2"], 
    "category": "business|technical|workflow|security|performance|integration",
    "priority": "high|medium|low",
    "context": "Why this question matters for agent success",
    "validation": {
      "required": true,
      "minLength": 10
    },
    "followUpQuestions": ["potential follow-up questions"]
  }
]

Generate questions that will lead to a robust, production-ready agent configuration.`

    const response = await llmProvider.generateText({
      prompt,
      maxTokens: 3000,
    })

    let questions: SmartQuestion[]
    try {
      questions = JSON.parse(response)
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError)
      // Fallback questions if AI fails
      questions = [
        {
          id: "business_objective",
          question: "What is the primary business objective this AI agent should achieve?",
          type: "text",
          category: "business",
          priority: "high",
          context: "Understanding the core business value helps design an agent that delivers measurable ROI",
          validation: { required: true, minLength: 20 },
        },
        {
          id: "target_users",
          question: "Who are the primary users or beneficiaries of this agent?",
          type: "select",
          options: ["Internal team members", "External customers", "Partners/vendors", "Mixed audience"],
          category: "business",
          priority: "high",
          context: "User personas drive interface design and functionality requirements",
        },
        {
          id: "integration_systems",
          question: "Which existing systems or tools should this agent integrate with?",
          type: "multiselect",
          options: [
            "CRM (Salesforce, HubSpot)",
            "Email systems",
            "Databases",
            "APIs",
            "File storage",
            "Communication tools",
            "Other",
          ],
          category: "integration",
          priority: "medium",
          context: "Integration requirements determine technical complexity and implementation timeline",
        },
      ]
    }

    // Store questions in database
    try {
      await supabase.from("agent_smart_questions").insert(
        questions.map((q) => ({
          user_id: user.id,
          question_id: q.id,
          question_data: q,
          question_round: questionRound,
          created_at: new Date().toISOString(),
        })),
      )
    } catch (dbError) {
      console.error("Database error (non-critical):", dbError)
    }

    return { success: true, questions }
  } catch (error) {
    console.error("Error generating smart questions:", error)
    return { success: false, error: "Failed to generate questions" }
  }
}

export async function analyzeAnswersAndGeneratePlan(
  answers: UserAnswer[],
  goalPrimer: string,
): Promise<{ success: boolean; plan?: GeneratedPlan; error?: string }> {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const llmProvider = await getUserLLMProvider(user.id)
    if (!llmProvider) {
      return { success: false, error: "No LLM provider configured" }
    }

    // Enhanced prompt for strategic plan generation
    const prompt = `You are a senior AI strategy consultant creating a comprehensive implementation plan.

CONTEXT:
- Original Goal: "${goalPrimer}"
- User Answers: ${JSON.stringify(answers)}

TASK: Create a detailed, actionable strategic plan for implementing this AI agent.

BUSINESS ANALYSIS REQUIREMENTS:
1. Analyze the business value and ROI potential
2. Identify critical dependencies and potential blockers
3. Assess technical complexity and resource requirements
4. Create realistic timeline with measurable milestones
5. Identify risks and mitigation strategies
6. Define clear success metrics and KPIs

PLAN STRUCTURE:
- Title: Compelling, business-focused title
- Description: Executive summary of the solution
- Objectives: 3-5 SMART objectives with business impact
- Dependencies: Technical, business, and resource dependencies with resolution strategies
- Resources: Required integrations, APIs, infrastructure with cost estimates
- Timeline: Phased approach with deliverables and risk assessment
- Risks: Potential challenges with mitigation strategies
- Success Metrics: Measurable KPIs and business outcomes
- Complexity Assessment: Overall project complexity rating
- Cost and Time Estimates: Realistic projections

OUTPUT FORMAT (JSON):
{
  "id": "plan_${Date.now()}",
  "title": "Strategic plan title",
  "description": "Executive summary",
  "objectives": ["SMART objective 1", "SMART objective 2"],
  "dependencies": [
    {
      "id": "dep_1",
      "name": "Dependency name",
      "type": "technical|business|resource|integration",
      "status": "pending",
      "blockers": ["potential blockers"],
      "estimatedResolutionTime": "2 weeks"
    }
  ],
  "resources": [
    {
      "type": "api_key|integration|data|permission|infrastructure",
      "name": "Resource name",
      "provider": "Provider name",
      "required": true,
      "configured": false,
      "cost": "Estimated cost",
      "setupTime": "Setup time estimate"
    }
  ],
  "timeline": [
    {
      "phase": "Phase name",
      "duration": "Duration estimate",
      "tasks": ["Task 1", "Task 2"],
      "dependencies": ["Dependencies"],
      "deliverables": ["Deliverable 1"],
      "riskLevel": "low|medium|high"
    }
  ],
  "risks": ["Risk 1 with mitigation strategy"],
  "successMetrics": ["Measurable KPI 1"],
  "estimatedCost": "Total cost estimate",
  "estimatedTimeToValue": "Time to see business value",
  "complexity": "low|medium|high"
}

Create a plan that balances ambition with practicality, ensuring successful implementation.`

    const response = await llmProvider.generateText({
      prompt,
      maxTokens: 4000,
    })

    let plan: GeneratedPlan
    try {
      plan = JSON.parse(response)
    } catch (parseError) {
      console.error("Failed to parse plan response:", parseError)
      // Fallback plan if AI fails
      plan = {
        id: `plan_${Date.now()}`,
        title: "AI Agent Implementation Plan",
        description: "Strategic plan for implementing an AI agent based on your requirements",
        objectives: [
          "Deploy functional AI agent within 4 weeks",
          "Achieve 80% user adoption within 2 months",
          "Demonstrate measurable ROI within 3 months",
        ],
        dependencies: [
          {
            id: "dep_1",
            name: "API Key Configuration",
            type: "technical",
            status: "pending",
            blockers: ["Need to obtain API keys"],
            estimatedResolutionTime: "1 week",
          },
        ],
        resources: [
          {
            type: "api_key",
            name: "OpenAI API Key",
            provider: "OpenAI",
            required: true,
            configured: false,
            cost: "$20-100/month",
            setupTime: "1 day",
          },
        ],
        timeline: [
          {
            phase: "Setup & Configuration",
            duration: "1-2 weeks",
            tasks: ["Configure API keys", "Set up integrations", "Initial testing"],
            dependencies: ["API access"],
            deliverables: ["Working prototype"],
            riskLevel: "low",
          },
        ],
        risks: ["API rate limits may affect performance"],
        successMetrics: ["Response time < 2 seconds", "User satisfaction > 4/5"],
        estimatedCost: "$500-2000",
        estimatedTimeToValue: "4-6 weeks",
        complexity: "medium",
      }
    }

    // Store answers and plan
    try {
      await supabase.from("agent_configuration_answers").insert(
        answers.map((answer) => ({
          user_id: user.id,
          question_id: answer.questionId,
          answer_data: answer,
          created_at: new Date().toISOString(),
        })),
      )

      await supabase.from("agent_configuration_plans").insert({
        user_id: user.id,
        plan_id: plan.id,
        plan_data: plan,
        created_at: new Date().toISOString(),
      })
    } catch (dbError) {
      console.error("Database error (non-critical):", dbError)
    }

    return { success: true, plan }
  } catch (error) {
    console.error("Error generating plan:", error)
    return { success: false, error: "Failed to generate strategic plan" }
  }
}

export async function consultWithAI(
  message: string,
  planId: string,
  currentPlan: GeneratedPlan,
  conversationHistory: AIConsultationMessage[] = [],
): Promise<{
  success: boolean
  response?: AIConsultationMessage
  planUpdates?: Partial<GeneratedPlan>
  error?: string
}> {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const llmProvider = await getUserLLMProvider(user.id)
    if (!llmProvider) {
      return { success: false, error: "No LLM provider configured" }
    }

    // Build conversation context for the LLM
    const conversationContext = conversationHistory
      .slice(-5)
      .map((msg) => `${msg.role === "user" ? "User" : "AI Consultant"}: ${msg.content}`)
      .join("\n")

    const prompt = `You are an expert AI strategy consultant providing intelligent, contextual guidance on agent implementation. You must be highly interactive, ask probing questions, and provide strategic insights.

CURRENT PLAN CONTEXT:
Title: ${currentPlan.title}
Description: ${currentPlan.description}
Objectives: ${currentPlan.objectives.join(", ")}
Timeline: ${currentPlan.timeline.map((t) => `${t.phase} (${t.duration})`).join(", ")}
Risks: ${currentPlan.risks.join(", ")}

RECENT CONVERSATION:
${conversationContext}

USER'S LATEST MESSAGE: "${message}"

INSTRUCTIONS:
1. Analyze the user's message in context of their plan and conversation history
2. Provide intelligent, strategic advice that demonstrates deep understanding
3. Ask 2-3 follow-up questions to uncover hidden requirements or concerns
4. Suggest specific, actionable improvements to their plan
5. Be conversational, engaging, and show expertise in AI agent implementation
6. If the user asks about technical details, provide concrete recommendations
7. If they express concerns, address them with solutions and alternatives

RESPONSE FORMAT:
Provide a natural, intelligent response (2-3 paragraphs) that:
- Directly addresses their message with expertise
- Shows understanding of their specific context and goals
- Asks strategic follow-up questions
- Suggests concrete next steps or improvements

Then provide a JSON object with:
{
  "response": "Your intelligent consultation response",
  "relatedQuestions": ["Strategic follow-up question 1", "Strategic follow-up question 2", "Strategic follow-up question 3"],
  "suggestions": ["Specific actionable suggestion 1", "Specific actionable suggestion 2"],
  "planUpdates": {
    "risks": ["Any new risks identified"],
    "objectives": ["Any refined objectives"],
    "timeline": []
  }
}

Be highly intelligent, contextual, and strategic in your response.`

    const aiResponse = await llmProvider.generateText({
      prompt,
      maxTokens: 3000,
      temperature: 0.8,
    })

    // Try to extract JSON from the response
    let parsed: any
    let responseText = aiResponse

    try {
      // Look for JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
        // Extract the text before the JSON as the main response
        responseText = aiResponse.substring(0, aiResponse.indexOf(jsonMatch[0])).trim()
      } else {
        // If no JSON found, create a structured response
        parsed = {
          response: aiResponse,
          relatedQuestions: [
            "What specific challenges are you most concerned about with this implementation?",
            "How does this align with your current technical infrastructure?",
            "What would success look like for you in 3 months?",
          ],
          suggestions: [
            "Consider starting with a pilot implementation to validate the approach",
            "Ensure you have proper monitoring and feedback loops in place",
          ],
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI consultation response:", parseError)
      // Create intelligent fallback based on the user's message
      const intelligentFallback = await generateIntelligentFallback(message, currentPlan, llmProvider)
      parsed = intelligentFallback
      responseText = intelligentFallback.response
    }

    const consultationMessage: AIConsultationMessage = {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: responseText || parsed.response,
      timestamp: new Date(),
      relatedQuestions: parsed.relatedQuestions || [],
      planUpdates: parsed.planUpdates,
      suggestions: parsed.suggestions || [],
    }

    // Store consultation message
    try {
      await supabase.from("agent_consultation_messages").insert({
        user_id: user.id,
        plan_id: planId,
        message_data: consultationMessage,
        created_at: new Date().toISOString(),
      })
    } catch (dbError) {
      console.error("Database error (non-critical):", dbError)
    }

    return {
      success: true,
      response: consultationMessage,
      planUpdates: parsed.planUpdates,
    }
  } catch (error) {
    console.error("Error in AI consultation:", error)
    return { success: false, error: "Failed to consult with AI" }
  }
}

// Helper function for intelligent fallback responses
async function generateIntelligentFallback(userMessage: string, plan: GeneratedPlan, llmProvider: any): Promise<any> {
  const fallbackPrompt = `Based on this user message: "${userMessage}" and their plan titled "${plan.title}", provide an intelligent, strategic response as an AI consultant. Be specific and helpful.`

  try {
    const response = await llmProvider.generateText({
      prompt: fallbackPrompt,
      maxTokens: 500,
      temperature: 0.7,
    })

    return {
      response,
      relatedQuestions: [
        "What specific aspect would you like to dive deeper into?",
        "Are there any constraints or requirements we haven't discussed?",
        "How does this fit with your overall business strategy?",
      ],
      suggestions: [
        "Let's break this down into smaller, manageable steps",
        "Consider the long-term implications of this approach",
      ],
    }
  } catch (error) {
    return {
      response:
        "I understand your concern. Let me help you think through this strategically. Based on your plan, I recommend we focus on the critical path items first and ensure we have proper risk mitigation in place.",
      relatedQuestions: [
        "What's your biggest concern about moving forward?",
        "Do you have the necessary resources and team in place?",
        "What would you consider the most critical success factor?",
      ],
      suggestions: [
        "Start with a proof of concept to validate your approach",
        "Ensure you have clear success metrics defined",
      ],
    }
  }
}

export async function validatePlanReadiness(
  plan: GeneratedPlan,
): Promise<{ success: boolean; ready: boolean; issues?: string[]; recommendations?: string[] }> {
  try {
    const issues: string[] = []
    const recommendations: string[] = []

    // Business logic validation
    if (plan.objectives.length < 2) {
      issues.push("Plan needs at least 2 clear objectives")
    }

    if (plan.timeline.length < 2) {
      issues.push("Implementation timeline should have multiple phases")
    }

    if (!plan.successMetrics || plan.successMetrics.length === 0) {
      issues.push("Success metrics are required for measuring ROI")
    }

    const highRiskPhases = plan.timeline.filter((phase) => phase.riskLevel === "high")
    if (highRiskPhases.length > plan.timeline.length / 2) {
      recommendations.push("Consider breaking down high-risk phases into smaller, manageable tasks")
    }

    const unconfiguredResources = plan.resources.filter((resource) => resource.required && !resource.configured)
    if (unconfiguredResources.length > 0) {
      recommendations.push(`Configure required resources: ${unconfiguredResources.map((r) => r.name).join(", ")}`)
    }

    return {
      success: true,
      ready: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    }
  } catch (error) {
    console.error("Error validating plan:", error)
    return { success: false, ready: false, issues: ["Validation failed"] }
  }
}
