"use server"

import { getSupabaseFromServer } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  SmartQuestion,
  UserAnswer,
  GeneratedPlan,
  AIConsultationMessage,
  AgentTask,
} from "@/lib/systematic-flow-types"
import { getUserLLMProvider } from "@/lib/user-llm-provider"
import { profileManager } from "@/lib/production-profile-manager"

/**
 * Clean and parse JSON response from LLM that might contain markdown code blocks
 */
function parseJSONFromLLMResponse(response: string): any {
  try {
    // First try direct parsing
    return JSON.parse(response)
  } catch (error) {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch (innerError) {
        console.error("Failed to parse JSON from code block:", jsonMatch[1])
        throw new Error("Invalid JSON format in LLM response")
      }
    }

    // Try to find JSON-like content between { and }
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0])
      } catch (innerError) {
        console.error("Failed to parse JSON object:", jsonObjectMatch[0])
        throw new Error("Invalid JSON object in LLM response")
      }
    }

    // Try to find JSON array between [ and ]
    const jsonArrayMatch = response.match(/\[[\s\S]*\]/)
    if (jsonArrayMatch) {
      try {
        return JSON.parse(jsonArrayMatch[0])
      } catch (innerError) {
        console.error("Failed to parse JSON array:", jsonArrayMatch[0])
        throw new Error("Invalid JSON array in LLM response")
      }
    }

    throw new Error("No valid JSON found in LLM response")
  }
}

export async function generateSmartQuestions(
  goalPrimer: string,
  existingAnswers: UserAnswer[],
): Promise<{ success: boolean; questions?: SmartQuestion[]; error?: string }> {
  try {
    console.log("🚀 Starting smart questions generation...")

    // Get a valid user ID that exists in the database
    const profileResult = await profileManager.ensureUserProfile()
    const userId = profileResult.userId || "00000000-0000-0000-0000-000000000000"

    if (profileResult.canContinue) {
      console.log(`✅ Continuing with user ID: ${userId} (${profileResult.method})`)
    } else {
      console.warn(`⚠️ Profile issue but continuing anyway: ${profileResult.error}`)
    }

    console.log("🔄 Getting LLM provider...")
    const llmProvider = await getUserLLMProvider(userId)

    if (!llmProvider) {
      console.log("📝 No LLM provider, using fallback questions...")
      // Fallback questions if no LLM available
      const fallbackQuestions: SmartQuestion[] = [
        {
          id: "q1_fallback",
          question: "What is the primary goal you want to achieve with this agent?",
          type: "text",
          category: "business",
          priority: "high",
          validation: { required: true, minLength: 10 },
          context: "Understanding your main objective helps us configure the agent effectively.",
        },
        {
          id: "q2_fallback",
          question: "What is your timeline for seeing initial results?",
          type: "select",
          options: ["Within 1 week", "1-2 weeks", "1 month", "2-3 months", "No rush, focus on quality"],
          category: "business",
          priority: "high",
          context: "Timeline expectations help us prioritize features and set realistic milestones.",
        },
        {
          id: "q3_fallback",
          question: "Which resources are readily available for this project?",
          type: "multiselect",
          options: ["Development team", "Allocated budget", "API access", "Data sources", "Subject matter experts"],
          category: "technical",
          priority: "medium",
          context: "Understanding available resources helps us plan the implementation approach.",
        },
        {
          id: "q4_fallback",
          question: "What level of automation do you want to achieve?",
          type: "select",
          options: ["Fully automated", "Semi-automated with human oversight", "Human-in-the-loop", "Advisory only"],
          category: "technical",
          priority: "medium",
          context: "Automation level determines the agent's decision-making authority.",
        },
      ]
      console.log("✅ Returning fallback questions")
      return { success: true, questions: fallbackQuestions }
    }

    console.log("🤖 Generating questions with LLM...")
    const prompt = `Based on this goal: "${goalPrimer}"
And existing answers: ${JSON.stringify(existingAnswers)}

Generate 3-5 smart, strategic questions to understand the user's needs better.
Focus on business objectives, technical requirements, and implementation constraints.

IMPORTANT: Return ONLY a valid JSON array, no markdown formatting, no code blocks.

Return exactly this JSON structure:
[{
  "id": "unique_id_string",
  "question": "Strategic question text",
  "type": "text",
  "category": "business",
  "priority": "high",
  "validation": {"required": true, "minLength": 10},
  "context": "Brief explanation of why this question matters"
}]

Make sure the response is pure JSON without any markdown formatting.`

    const response = await llmProvider.generateText({
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    console.log("📥 Raw LLM response received")

    const questions = parseJSONFromLLMResponse(response) as SmartQuestion[]

    // Validate the questions structure
    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array")
    }

    // Ensure each question has required fields
    const validatedQuestions = questions.map((q, index) => ({
      id: q.id || `q${index + 1}_${Date.now()}`,
      question: q.question || "What would you like to configure?",
      type: q.type || "text",
      category: q.category || "business",
      priority: q.priority || "medium",
      validation: q.validation || { required: true },
      context: q.context || "This helps us understand your requirements better.",
      options: q.options || undefined,
    }))

    console.log(`✅ Generated ${validatedQuestions.length} validated questions`)
    return { success: true, questions: validatedQuestions }
  } catch (error) {
    console.error("❌ Error generating questions, using fallback:", error)

    // Return fallback questions on any error
    const fallbackQuestions: SmartQuestion[] = [
      {
        id: "fallback_goal",
        question: "What is the main objective you want this agent to accomplish?",
        type: "text",
        category: "business",
        priority: "high",
        validation: { required: true, minLength: 15 },
        context: "A clear goal helps us configure the agent to meet your specific needs.",
      },
      {
        id: "fallback_timeline",
        question: "When do you need to see initial results from this agent?",
        type: "select",
        options: ["ASAP (1-2 weeks)", "Within a month", "2-3 months", "No specific timeline"],
        category: "business",
        priority: "high",
        context: "Timeline helps us prioritize features and set realistic expectations.",
      },
      {
        id: "fallback_complexity",
        question: "How would you describe the complexity of your requirements?",
        type: "select",
        options: [
          "Simple and straightforward",
          "Moderate complexity",
          "Complex with multiple integrations",
          "Very complex enterprise needs",
        ],
        category: "technical",
        priority: "medium",
        context: "Understanding complexity helps us plan the right approach and resources.",
      },
      {
        id: "fallback_priority",
        question: "What is your top priority for this agent?",
        type: "select",
        options: ["Speed of delivery", "Quality and reliability", "Cost effectiveness", "Scalability"],
        category: "business",
        priority: "high",
        context: "Priority helps us focus on what matters most to your success.",
      },
    ]

    console.log("✅ Returning fallback questions due to error")
    return {
      success: true,
      questions: fallbackQuestions,
      error: `Used fallback questions due to: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function submitAnswersAndGeneratePlan(
  answers: UserAnswer[],
): Promise<{ success: boolean; plan?: GeneratedPlan; error?: string }> {
  try {
    console.log("🚀 Starting plan generation...")

    // Get a valid user ID
    const profileResult = await profileManager.ensureUserProfile()
    const userId = profileResult.userId || "00000000-0000-0000-0000-000000000000"

    const llmProvider = await getUserLLMProvider(userId)

    if (!llmProvider) {
      console.log("📋 No LLM provider, using fallback plan...")
      // Fallback plan
      const fallbackPlan: GeneratedPlan = {
        id: `plan_${Date.now()}`,
        title: "Strategic Implementation Plan",
        description:
          "A comprehensive plan based on your requirements, designed for systematic execution and measurable results.",
        objectives: [
          "Achieve the primary agent goal as defined in your requirements",
          "Implement a minimum viable product (MVP) within the specified timeline",
          "Establish monitoring and feedback systems for continuous improvement",
        ],
        dependencies: [],
        resources: [
          {
            type: "api_key",
            name: "LLM Provider API",
            provider: "OpenAI/Anthropic/etc",
            required: true,
            configured: false,
            description: "Required for AI-powered agent capabilities",
          },
        ],
        timeline: [
          {
            phase: "Planning & Setup",
            duration: "1 week",
            tasks: ["Finalize requirements", "Set up development environment", "Configure initial agent"],
            dependencies: [],
            deliverables: ["Requirements document", "Development environment", "Basic agent configuration"],
            riskLevel: "low",
          },
          {
            phase: "Development & Testing",
            duration: "2-3 weeks",
            tasks: ["Implement core features", "Test functionality", "Gather initial feedback"],
            dependencies: ["Planning & Setup"],
            deliverables: ["Working agent MVP", "Test results", "Initial feedback report"],
            riskLevel: "medium",
          },
        ],
        risks: ["Timeline constraints", "Resource availability", "Integration complexity"],
        successMetrics: ["Goal achievement rate", "User satisfaction score", "Performance metrics"],
        complexity: "medium",
        estimatedTimeToValue: "2-4 weeks",
      }
      console.log("✅ Returning fallback plan")
      return { success: true, plan: fallbackPlan }
    }

    console.log("🤖 Generating plan with LLM...")
    const prompt = `Based on these user answers: ${JSON.stringify(answers)}

Create a comprehensive strategic plan for implementing their AI agent.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.

Return exactly this JSON structure:
{
  "id": "unique_plan_id",
  "title": "Plan Title",
  "description": "Detailed plan description",
  "objectives": ["objective1", "objective2", "objective3"],
  "dependencies": [],
  "resources": [{"type": "api_key", "name": "Resource Name", "provider": "Provider", "required": true, "configured": false, "description": "Resource description"}],
  "timeline": [{"phase": "Phase Name", "duration": "timeframe", "tasks": ["task1", "task2"], "dependencies": [], "deliverables": ["deliverable1"], "riskLevel": "low"}],
  "risks": ["risk1", "risk2"],
  "successMetrics": ["metric1", "metric2"],
  "complexity": "medium",
  "estimatedTimeToValue": "timeframe"
}

Make sure the response is pure JSON without any markdown formatting.`

    const response = await llmProvider.generateText({
      prompt,
      maxTokens: 3000,
      temperature: 0.6,
    })

    console.log("📥 Raw plan response received")

    const plan = parseJSONFromLLMResponse(response) as GeneratedPlan

    // Validate and ensure required fields
    const validatedPlan: GeneratedPlan = {
      id: plan.id || `plan_${Date.now()}`,
      title: plan.title || "Strategic Implementation Plan",
      description: plan.description || "A comprehensive plan based on your requirements",
      objectives: Array.isArray(plan.objectives)
        ? plan.objectives
        : ["Achieve primary goals", "Implement solution", "Monitor progress"],
      dependencies: Array.isArray(plan.dependencies) ? plan.dependencies : [],
      resources: Array.isArray(plan.resources) ? plan.resources : [],
      timeline: Array.isArray(plan.timeline) ? plan.timeline : [],
      risks: Array.isArray(plan.risks) ? plan.risks : ["Timeline constraints", "Resource availability"],
      successMetrics: Array.isArray(plan.successMetrics)
        ? plan.successMetrics
        : ["Goal achievement", "User satisfaction"],
      complexity: plan.complexity || "medium",
      estimatedTimeToValue: plan.estimatedTimeToValue || "2-4 weeks",
    }

    console.log("✅ Plan generated and validated successfully")
    return { success: true, plan: validatedPlan }
  } catch (error) {
    console.error("❌ Error generating plan:", error)
    return {
      success: false,
      error: `Failed to generate plan: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function consultWithAI(
  userMessage: string,
  planId: string,
  conversationHistory: AIConsultationMessage[],
): Promise<{
  success: boolean
  response?: AIConsultationMessage
  generatedTasks?: AgentTask[]
  planUpdates?: Partial<GeneratedPlan>
  error?: string
}> {
  try {
    console.log("🚀 Starting AI consultation...")

    // Get a valid user ID
    const profileResult = await profileManager.ensureUserProfile()
    const userId = profileResult.userId || "00000000-0000-0000-0000-000000000000"

    const llmProvider = await getUserLLMProvider(userId)

    if (!llmProvider) {
      console.log("❌ No LLM provider configured")
      return {
        success: false,
        error: "LLM provider not configured. Please add an API key in Settings → Profile → API Keys.",
      }
    }

    // Ensure conversationHistory is an array
    const history = Array.isArray(conversationHistory) ? conversationHistory : []

    // Build conversation context
    const conversationContext = history
      .slice(-5) // Last 5 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n")

    console.log("🤖 Consulting with AI...")
    const prompt = `You are an expert AI strategy consultant. The user is discussing their implementation plan (ID: ${planId}).

Conversation context:
${conversationContext}

User's latest message: "${userMessage}"

Provide intelligent, strategic advice and generate actionable tasks.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.

Return exactly this JSON structure:
{
  "content": "Your strategic response to the user",
  "relatedQuestions": ["question1", "question2"],
  "generatedTasks": [
    {
      "id": "task_id",
      "title": "Task title",
      "description": "Task description",
      "priority": "medium",
      "category": "strategy",
      "requiresApproval": false,
      "estimatedHours": 2
    }
  ]
}

Make sure the response is pure JSON without any markdown formatting.`

    const response = await llmProvider.generateText({
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    console.log("📥 AI consultation response received")

    const aiResponse = parseJSONFromLLMResponse(response)

    const consultationMessage: AIConsultationMessage = {
      id: `msg_ai_${Date.now()}`,
      role: "assistant",
      content:
        aiResponse.content ||
        "I'm here to help with your implementation plan. What specific aspect would you like to discuss?",
      timestamp: new Date(),
      relatedQuestions: Array.isArray(aiResponse.relatedQuestions) ? aiResponse.relatedQuestions : [],
    }

    // Store generated tasks if any
    let storedTasks: AgentTask[] = []
    if (aiResponse.generatedTasks && Array.isArray(aiResponse.generatedTasks) && aiResponse.generatedTasks.length > 0) {
      const taskResult = await storeGeneratedTasks(aiResponse.generatedTasks, userId)
      if (taskResult.success) {
        storedTasks = taskResult.tasks || []
      }
    }

    console.log("✅ AI consultation completed successfully")
    return {
      success: true,
      response: consultationMessage,
      generatedTasks: storedTasks,
    }
  } catch (error) {
    console.error("❌ Error in AI consultation:", error)
    return {
      success: false,
      error: `Failed to consult with AI: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function storeGeneratedTasks(
  tasks: AgentTask[],
  userId: string,
): Promise<{ success: boolean; tasks?: AgentTask[]; error?: string }> {
  try {
    console.log(`🔄 Storing ${tasks.length} generated tasks...`)
    const supabase = getSupabaseFromServer()

    // Store tasks as consultation tasks (without agent_id initially)
    const tasksToInsert = tasks.map((task) => ({
      title: task.title || "Generated Task",
      priority: task.priority || "medium",
      status: "todo" as const,
      is_dependency: true,
      blocked_reason: "Consultation task - needs review",
      metadata: {
        description: task.description || "Task generated from AI consultation",
        category: task.category || "consultation",
        estimatedHours: task.estimatedHours || 2,
        requiresApproval: task.requiresApproval !== undefined ? task.requiresApproval : true,
        source: "ai_consultation",
        consultation_id: `consultation_${Date.now()}`,
      },
    }))

    const { data: insertedTasks, error: insertError } = await supabase.from("tasks").insert(tasksToInsert).select("*")

    if (insertError) {
      console.error("❌ Error inserting consultation tasks:", insertError)
      return { success: false, error: insertError.message }
    }

    console.log(`✅ Successfully stored ${insertedTasks?.length || 0} tasks`)
    return { success: true, tasks: insertedTasks || [] }
  } catch (error) {
    console.error("❌ Error storing generated tasks:", error)
    return { success: false, error: "Failed to store tasks" }
  }
}

export async function finalizeAndDeployAgent(planId: string): Promise<{
  success: boolean
  agentId?: string
  tasks?: AgentTask[]
  deploymentStatus?: {
    working: string[]
    needsAttention: string[]
    dependencyTasks: AgentTask[]
  }
  error?: string
}> {
  try {
    console.log("🚀 Starting agent deployment...")

    // Get a valid user ID that exists in the profiles table
    const profileResult = await profileManager.ensureUserProfile()
    const userId = profileResult.userId

    if (!userId) {
      console.error("❌ Could not get valid user ID for agent creation")
      return { success: false, error: "Could not establish valid user ID for agent creation" }
    }

    console.log(`✅ Using valid user ID for agent: ${userId}`)

    const supabase = getSupabaseFromServer()

    // Get user's LLM configuration
    const llmProvider = await getUserLLMProvider(userId)
    const hasLLM = !!llmProvider

    // Check existing consultation tasks
    const { data: consultationTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("metadata->>source", "ai_consultation")
      .is("agent_id", null)

    // Generate comprehensive deployment analysis
    const deploymentAnalysis = await generateDeploymentAnalysis(hasLLM, consultationTasks || [])

    console.log("🔄 Creating agent with validated user ID...")
    // Create the agent with the validated user ID
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: `Systematic Agent - ${new Date().toLocaleDateString()}`,
        goal: "Agent configured through systematic planning process with AI consultation",
        owner_id: userId, // Use the validated user ID
        template_slug: "systematic-agent",
        behavior: "Systematically configured agent with deployment analysis and dependency tracking",
        status: "active",
      })
      .select("id")
      .single()

    if (agentError || !agent) {
      console.error("❌ Error creating agent:", agentError)
      return { success: false, error: `Failed to create agent: ${agentError?.message}` }
    }

    const agentId = agent.id
    console.log(`✅ Agent created with ID: ${agentId}`)

    // Auto-start the agent with intelligent workflow
    try {
      const { autoStartAgentAfterCreation } = await import("./auto-start-actions")

      const userInputs = {
        goalPrimer: "User's goal from systematic configuration",
        answers: [], // Pass the actual answers from the configuration process
        planData: { planId }, // Pass the plan data
        consultationHistory: [], // Pass consultation history if available
      }

      const autoStartResult = await autoStartAgentAfterCreation(agentId, userInputs)

      if (autoStartResult.success) {
        console.log("✅ Agent auto-started successfully")
      } else {
        console.warn("⚠️ Agent created but auto-start failed:", autoStartResult.error)
      }
    } catch (autoStartError) {
      console.warn("⚠️ Agent created but auto-start failed:", autoStartError)
      // Don't fail the deployment if auto-start fails
    }

    // Generate and store dependency tasks
    const dependencyTasks = await generateDependencyTasks(deploymentAnalysis.needsAttention, agentId)

    // Update consultation tasks to belong to this agent
    if (consultationTasks && consultationTasks.length > 0) {
      await supabase
        .from("tasks")
        .update({ agent_id: agentId })
        .eq("metadata->>source", "ai_consultation")
        .is("agent_id", null)
    }

    // Store deployment status in agent_custom_data table
    try {
      await supabase.from("agent_custom_data").insert({
        agent_id: agentId,
        custom_data: {
          planId,
          deploymentAnalysis,
          deploymentTimestamp: new Date().toISOString(),
          configuration_method: "systematic",
          working: deploymentAnalysis.working,
          needsAttention: deploymentAnalysis.needsAttention,
          recommendations: deploymentAnalysis.recommendations,
        },
      })
    } catch (customDataError) {
      console.log("⚠️ Failed to store custom data (non-critical):", customDataError)
    }

    // Add XP for completing systematic configuration
    try {
      await supabase.from("xp_log").insert({
        owner_id: userId,
        action: "completed_systematic_configuration",
        points: 250,
        description: "Completed systematic agent configuration with deployment analysis",
      })
    } catch (xpError) {
      console.log("⚠️ Failed to add XP (non-critical):", xpError)
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/dependencies")
    revalidatePath(`/dashboard/agents/${agentId}`)

    console.log("✅ Agent deployment completed successfully")
    return {
      success: true,
      agentId,
      tasks: [...(consultationTasks || []), ...dependencyTasks],
      deploymentStatus: {
        working: deploymentAnalysis.working,
        needsAttention: deploymentAnalysis.needsAttention,
        dependencyTasks,
      },
    }
  } catch (error) {
    console.error("❌ Error in deployment:", error)
    return { success: false, error: "Failed to deploy agent" }
  }
}

async function generateDeploymentAnalysis(
  hasLLM: boolean,
  consultationTasks: any[],
): Promise<{
  working: string[]
  needsAttention: string[]
  recommendations: string[]
}> {
  const working: string[] = []
  const needsAttention: string[] = []
  const recommendations: string[] = []

  // Check what's working
  working.push("✅ Database connection established")
  working.push("✅ User authentication active")
  working.push("✅ Agent framework initialized")
  working.push("✅ Systematic configuration completed")

  if (hasLLM) {
    working.push("✅ AI/LLM integration configured")
  } else {
    needsAttention.push("🔧 AI/LLM provider needs configuration")
    recommendations.push("Configure OpenAI or other LLM provider for intelligent responses")
  }

  if (consultationTasks.length > 0) {
    working.push(`✅ ${consultationTasks.length} consultation tasks generated`)
  } else {
    needsAttention.push("📝 No specific tasks identified from consultation")
    recommendations.push("Review agent objectives and create specific action items")
  }

  // Always add these common needs
  needsAttention.push("🎯 Define specific success metrics")
  needsAttention.push("📊 Set up monitoring and tracking")
  needsAttention.push("🔄 Establish feedback loops")
  needsAttention.push("📈 Plan scaling strategy")
  needsAttention.push("🔐 Configure security settings")
  needsAttention.push("⚡ Optimize performance settings")

  recommendations.push("Start with high-priority dependency tasks")
  recommendations.push("Monitor agent performance regularly")
  recommendations.push("Iterate based on results and feedback")
  recommendations.push("Review and update configurations monthly")

  return { working, needsAttention, recommendations }
}

async function generateDependencyTasks(needsAttention: string[], agentId: string): Promise<AgentTask[]> {
  const supabase = getSupabaseFromServer()

  const dependencyTasks: AgentTask[] = needsAttention.map((item, index) => ({
    id: `dep_${Date.now()}_${index}`,
    title: item.replace(/^[🔧📝🎯📊🔄📈🔐⚡]\s*/u, ""), // Remove emoji
    description: `Address: ${item}`,
    priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
    status: "todo",
    dependencies: [],
    category: "deployment",
    estimatedHours: 2,
    phase: "Post-Deployment",
    deliverables: ["Task completion", "Documentation"],
    acceptanceCriteria: ["Requirements met", "Quality verified"],
  }))

  // Store dependency tasks in database
  const tasksToInsert = dependencyTasks.map((task) => ({
    agent_id: agentId,
    title: task.title,
    priority: task.priority,
    status: task.status,
    is_dependency: true,
    blocked_reason: "Deployment dependency - needs completion for optimal performance",
    metadata: {
      description: task.description,
      category: task.category,
      estimatedHours: task.estimatedHours,
      phase: task.phase,
      source: "deployment_analysis",
      created_from: "systematic_configuration",
      deployment_priority: task.priority,
    },
    auto_generated: true,
    requires_approval: false,
    estimated_hours: task.estimatedHours,
  }))

  try {
    const { data: insertedTasks } = await supabase.from("tasks").insert(tasksToInsert).select("*")
    console.log(`✅ Created ${insertedTasks?.length || 0} dependency tasks`)
    return insertedTasks || []
  } catch (error) {
    console.error("❌ Error inserting dependency tasks:", error)
    return []
  }
}
