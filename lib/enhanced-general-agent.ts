import { ProductionDatabase } from "@/lib/production-database"
import { getSupabaseFromServer } from "@/lib/supabase/server"

export interface ConversationContext {
  userId: string
  userName: string
  userRole?: string
  userIndustry?: string
  userGoals: string[]
  conversationId: string
  messageHistory: Message[]
}

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface GeneratedTask {
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  category: "strategy" | "research" | "implementation" | "review" | "communication"
  estimatedHours: number
  requiresApproval: boolean
  dependencies?: string[]
  metadata: Record<string, any>
}

export class EnhancedGeneralAgent {
  private db: ProductionDatabase

  constructor() {
    this.db = ProductionDatabase.getInstance()
  }

  async initializeConversation(userId: string): Promise<string | null> {
    try {
      const supabase = getSupabaseFromServer()

      // Get user profile for context
      const profile = await this.db.getUserProfile(userId)
      if (!profile) {
        throw new Error("User profile not found")
      }

      // Create new conversation
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          agent_type: "general",
          status: "active",
          metadata: {
            user_name: profile.display_name,
            user_role: profile.role,
            user_industry: profile.industry,
            user_goals: profile.goals,
            initialized_at: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating conversation:", error)
        return null
      }

      // Add welcome message
      const welcomeMessage = this.generateWelcomeMessage(profile)
      await this.addMessage(conversation.id, "assistant", welcomeMessage)

      // Track activity
      await this.db.trackUserActivity(userId, "general_agent_conversation_started", "conversation", conversation.id)

      return conversation.id
    } catch (error) {
      console.error("Error initializing conversation:", error)
      return null
    }
  }

  async sendMessage(conversationId: string, userMessage: string): Promise<string | null> {
    try {
      const supabase = getSupabaseFromServer()

      // Get conversation context
      const context = await this.getConversationContext(conversationId)
      if (!context) {
        throw new Error("Conversation context not found")
      }

      // Add user message to database
      await this.addMessage(conversationId, "user", userMessage)

      // Generate AI response
      const aiResponse = await this.generateAIResponse(context, userMessage)
      if (!aiResponse) {
        throw new Error("Failed to generate AI response")
      }

      // Add AI response to database
      await this.addMessage(conversationId, "assistant", aiResponse)

      // Analyze message for task generation
      await this.analyzeAndGenerateTasks(context, userMessage, aiResponse)

      // Track activity
      await this.db.trackUserActivity(context.userId, "general_agent_message_sent", "conversation", conversationId, {
        message_length: userMessage.length,
        response_length: aiResponse.length,
      })

      return aiResponse
    } catch (error) {
      console.error("Error sending message:", error)
      return null
    }
  }

  async getConversationHistory(conversationId: string): Promise<Message[]> {
    try {
      const supabase = getSupabaseFromServer()

      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching conversation history:", error)
        return []
      }

      return messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata,
      }))
    } catch (error) {
      console.error("Error getting conversation history:", error)
      return []
    }
  }

  private async getConversationContext(conversationId: string): Promise<ConversationContext | null> {
    try {
      const supabase = getSupabaseFromServer()

      const { data: conversation, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single()

      if (error) {
        console.error("Error fetching conversation:", error)
        return null
      }

      const messageHistory = await this.getConversationHistory(conversationId)

      return {
        userId: conversation.user_id,
        userName: conversation.metadata?.user_name || "User",
        userRole: conversation.metadata?.user_role,
        userIndustry: conversation.metadata?.user_industry,
        userGoals: conversation.metadata?.user_goals || [],
        conversationId,
        messageHistory,
      }
    } catch (error) {
      console.error("Error getting conversation context:", error)
      return null
    }
  }

  private async addMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
  ): Promise<void> {
    try {
      const supabase = getSupabaseFromServer()

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: {
          timestamp: new Date().toISOString(),
          length: content.length,
        },
      })
    } catch (error) {
      console.error("Error adding message:", error)
    }
  }

  private generateWelcomeMessage(profile: any): string {
    const name = profile.display_name || "there"
    const role = profile.role ? ` as a ${profile.role}` : ""
    const industry = profile.industry ? ` in ${profile.industry}` : ""

    return `Hello ${name}! 👋 

I'm your General Agent, and I'm here to help you achieve your goals${role}${industry}. 

I can help you:
• 🎯 Define and break down your objectives
• 📋 Create actionable task plans
• 🔄 Set up automated workflows
• 📊 Track your progress

What would you like to accomplish? Tell me about your current challenges or goals, and I'll help you create a strategic plan to achieve them.`
  }

  private async generateAIResponse(context: ConversationContext, userMessage: string): Promise<string | null> {
    try {
      const { AIOperations } = await import("@/lib/ai-operations")

      const conversationHistory = this.buildConversationHistory(context.messageHistory)

      const response = await AIOperations.generateConversationResponse(
        userMessage,
        conversationHistory,
        {
          userName: context.userName,
          userRole: context.userRole,
          userIndustry: context.userIndustry,
          userGoals: context.userGoals,
        },
        context.userId,
      )

      return response || this.generateFallbackResponse(context, userMessage)
    } catch (error) {
      console.error("Error generating AI response:", error)
      return this.generateFallbackResponse(context, userMessage)
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    return `You are a General Agent assistant helping ${context.userName}${
      context.userRole ? ` (${context.userRole})` : ""
    }${context.userIndustry ? ` in ${context.userIndustry}` : ""}.

Your role is to:
1. Help users define and achieve their goals
2. Break down complex objectives into actionable tasks
3. Suggest practical strategies and solutions
4. Be encouraging and supportive
5. Ask clarifying questions when needed

User's goals: ${context.userGoals.length > 0 ? context.userGoals.join(", ") : "Not specified yet"}

Keep responses conversational, helpful, and focused on actionable advice. When appropriate, suggest specific tasks that could be created to help achieve their goals.`
  }

  private buildConversationHistory(messages: Message[]): Array<{ role: string; content: string }> {
    return messages
      .filter((msg) => msg.role !== "system")
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
  }

  private generateFallbackResponse(context: ConversationContext, userMessage: string): string {
    const responses = [
      `That's interesting, ${context.userName}! Can you tell me more about what specific outcomes you're looking for?`,
      `I understand. Let me help you break that down into actionable steps. What would be the first milestone you'd want to achieve?`,
      `Great point! Based on what you've shared, I think we can create a strategic plan. What's your timeline for this goal?`,
      `That sounds like a valuable objective. What resources or tools do you currently have available to work on this?`,
      `I see the potential here. What would success look like to you in this area?`,
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  private async analyzeAndGenerateTasks(
    context: ConversationContext,
    userMessage: string,
    aiResponse: string,
  ): Promise<void> {
    try {
      // Simple keyword-based task generation (can be enhanced with AI)
      const taskKeywords = {
        strategy: ["plan", "strategy", "approach", "framework", "roadmap"],
        research: ["research", "analyze", "study", "investigate", "explore"],
        implementation: ["implement", "build", "create", "develop", "execute"],
        review: ["review", "evaluate", "assess", "check", "monitor"],
        communication: ["communicate", "present", "share", "discuss", "meeting"],
      }

      const messageText = (userMessage + " " + aiResponse).toLowerCase()
      const detectedCategories = []

      for (const [category, keywords] of Object.entries(taskKeywords)) {
        if (keywords.some((keyword) => messageText.includes(keyword))) {
          detectedCategories.push(category)
        }
      }

      // Generate tasks based on detected categories
      if (detectedCategories.length > 0) {
        const tasks = await this.generateTasksFromConversation(context, userMessage, detectedCategories)
        await this.createTasksInDatabase(context.userId, context.conversationId, tasks)
      }
    } catch (error) {
      console.error("Error analyzing and generating tasks:", error)
    }
  }

  private async generateTasksFromConversation(
    context: ConversationContext,
    userMessage: string,
    categories: string[],
  ): Promise<GeneratedTask[]> {
    const tasks: GeneratedTask[] = []

    // Generate context-aware tasks
    if (categories.includes("strategy")) {
      tasks.push({
        title: "Develop Strategic Plan",
        description: `Create a comprehensive strategy based on the discussion about: ${userMessage.substring(0, 100)}...`,
        priority: "high",
        category: "strategy",
        estimatedHours: 4,
        requiresApproval: true,
        metadata: {
          generated_from: "conversation",
          user_input: userMessage.substring(0, 200),
          conversation_id: context.conversationId,
        },
      })
    }

    if (categories.includes("research")) {
      tasks.push({
        title: "Research and Analysis",
        description: `Conduct research on the topics discussed in the conversation`,
        priority: "medium",
        category: "research",
        estimatedHours: 2,
        requiresApproval: false,
        metadata: {
          generated_from: "conversation",
          conversation_id: context.conversationId,
        },
      })
    }

    if (categories.includes("implementation")) {
      tasks.push({
        title: "Implementation Planning",
        description: `Create implementation plan for the discussed objectives`,
        priority: "high",
        category: "implementation",
        estimatedHours: 6,
        requiresApproval: true,
        metadata: {
          generated_from: "conversation",
          conversation_id: context.conversationId,
        },
      })
    }

    return tasks
  }

  private async createTasksInDatabase(userId: string, conversationId: string, tasks: GeneratedTask[]): Promise<void> {
    try {
      const supabase = getSupabaseFromServer()

      // Create a general agent if it doesn't exist
      let { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("owner_id", userId)
        .eq("template_slug", "general")
        .single()

      if (agentError || !agent) {
        const { data: newAgent, error: createError } = await supabase
          .from("agents")
          .insert({
            owner_id: userId,
            name: "General Agent",
            template_slug: "general",
            goal: "Help achieve user goals through intelligent task management",
            status: "active",
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating general agent:", createError)
          return
        }
        agent = newAgent
      }

      // Create tasks
      const taskInserts = tasks.map((task) => ({
        agent_id: agent.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.requiresApproval ? "pending_approval" : "todo",
        is_dependency: task.requiresApproval,
        conversation_id: conversationId,
        auto_generated: true,
        requires_approval: task.requiresApproval,
        metadata: {
          ...task.metadata,
          category: task.category,
          estimated_hours: task.estimatedHours,
          generated_at: new Date().toISOString(),
        },
      }))

      const { error: taskError } = await supabase.from("tasks").insert(taskInserts)

      if (taskError) {
        console.error("Error creating tasks:", taskError)
        return
      }

      // Track task generation activity
      await this.db.trackUserActivity(userId, "tasks_generated_from_conversation", "conversation", conversationId, {
        task_count: tasks.length,
        categories: tasks.map((t) => t.category),
        approval_required_count: tasks.filter((t) => t.requiresApproval).length,
      })

      console.log(`Generated ${tasks.length} tasks from conversation`)
    } catch (error) {
      console.error("Error creating tasks in database:", error)
    }
  }
}
