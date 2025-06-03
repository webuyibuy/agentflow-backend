import { getDecryptedApiKey } from "@/app/dashboard/settings/profile/api-key-actions"
import { getSupabaseFromServer } from "@/lib/supabase/server"
import { ProductionDatabase } from "@/lib/production-database"
import { AIOperations } from "@/lib/ai-operations"

export interface ConversationMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface TaskSuggestion {
  title: string
  description: string
  priority: "low" | "medium" | "high"
  isDependency: boolean
  blockedReason?: string
  estimatedHours?: number
  category: string
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

export interface ConversationAnalysis {
  goals: string[]
  taskSuggestions: TaskSuggestion[]
  nextQuestions: string[]
  conversationSummary: string
}

export interface ConversationContext {
  userId: string
  userName: string
  userRole?: string
  userIndustry?: string
  userGoals: string[]
  conversationId: string
  messageHistory: ConversationMessage[]
}

export class EnhancedGeneralAgent {
  private apiKey: string | null = null
  private conversationHistory: ConversationMessage[] = []
  private conversationId: string | null = null
  private userId: string | null = null
  private db: ProductionDatabase

  constructor(userId: string | null = null, conversationId: string | null = null) {
    this.userId = userId
    this.conversationId = conversationId
    this.db = ProductionDatabase.getInstance()
  }

  async initialize(): Promise<boolean> {
    try {
      this.apiKey = await getDecryptedApiKey("openai")

      // If we have a conversation ID, load the conversation history
      if (this.conversationId) {
        await this.loadConversationHistory()
      }

      return !!this.apiKey
    } catch (error) {
      console.error("Failed to initialize Enhanced General Agent:", error)
      return false
    }
  }

  async loadConversationHistory(): Promise<void> {
    if (!this.conversationId) return

    try {
      const supabase = getSupabaseFromServer()
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", this.conversationId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading conversation history:", error)
        return
      }

      this.conversationHistory = messages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata,
      }))
    } catch (error) {
      console.error("Error in loadConversationHistory:", error)
    }
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

  async sendMessage(
    conversationId: string,
    userMessage: string,
  ): Promise<{
    response: string
    analysis?: ConversationAnalysis
    error?: string
  }> {
    if (!this.apiKey) {
      return {
        response: "I need an OpenAI API key to function properly. Please configure it in your settings.",
        error: "API key not configured",
      }
    }

    try {
      // Get conversation context
      const context = await this.getConversationContext(conversationId)
      if (!context) {
        throw new Error("Conversation context not found")
      }

      // Add user message to history
      const userMsg: ConversationMessage = {
        id: `msg_${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }

      this.conversationHistory.push(userMsg)
      await this.addMessage(conversationId, "user", userMessage)

      // Generate AI response
      const aiResponse = await this.generateAIResponse(context, userMessage)

      // Add AI response to history
      const assistantMsg: ConversationMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: aiResponse || "",
        timestamp: new Date(),
      }

      this.conversationHistory.push(assistantMsg)
      await this.addMessage(conversationId, "assistant", aiResponse || "")

      // Analyze conversation for tasks and goals
      await this.analyzeAndGenerateTasks(context, userMessage, aiResponse || "")

      return {
        response: aiResponse || "",
      }
    } catch (error) {
      console.error("Error in Enhanced General Agent:", error)
      return {
        response: "I'm having trouble processing your request right now. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
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
        role: msg.role as "user" | "assistant" | "system",
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

    // Simple greeting with a question, between 10-164 characters
    return `Hi ${name}! How can I help you today?`
  }

  private async generateAIResponse(context: ConversationContext, userMessage: string): Promise<string | null> {
    try {
      const conversationHistory = this.buildConversationHistory(context.messageHistory)

      // Add instruction for response length based on user message
      const systemPrompt = this.buildSystemPrompt(context, userMessage)

      const response = await AIOperations.generateConversationResponse(
        userMessage,
        conversationHistory,
        {
          userName: context.userName,
          userRole: context.userRole,
          userIndustry: context.userIndustry,
          userGoals: context.userGoals,
          systemPrompt: systemPrompt,
        },
        context.userId,
      )

      return response || this.generateFallbackResponse(context, userMessage)
    } catch (error) {
      console.error("Error generating AI response:", error)
      return this.generateFallbackResponse(context, userMessage)
    }
  }

  private buildSystemPrompt(context: ConversationContext, userMessage: string): string {
    // Calculate target response length based on user message length
    const userMessageLength = userMessage.length
    const minLength = 10
    const maxLength = 164

    // Scale response length based on user message length
    // Short user messages get shorter responses, longer messages get longer responses
    const targetLength = Math.min(maxLength, Math.max(minLength, Math.floor(userMessageLength * 1.5)))

    return `You are a helpful assistant talking to ${context.userName}.

IMPORTANT FORMATTING INSTRUCTIONS:
1. Always start your response with a simple greeting and question
2. Keep your response between ${minLength} and ${maxLength} characters
3. Target response length: approximately ${targetLength} characters
4. Be concise but helpful
5. Use a conversational, friendly tone
6. If the user asks a complex question, break it down into simpler parts

Your role is to be helpful, friendly, and concise.`
  }

  private buildConversationHistory(messages: ConversationMessage[]): Array<{ role: string; content: string }> {
    return messages
      .filter((msg) => msg.role !== "system")
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
  }

  private generateFallbackResponse(context: ConversationContext, userMessage: string): string {
    // Simple fallback responses that match the pattern (greeting + question, 10-164 chars)
    const responses = [
      `Hi ${context.userName}! Could you tell me more about what you need?`,
      `Hello! I'm not sure I understood. Can you explain differently?`,
      `Hey there! What specifically are you looking for help with?`,
      `Hi! Can you provide more details about your request?`,
      `Hello ${context.userName}! How else can I assist you today?`,
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

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory]
  }

  getConversationId(): string | null {
    return this.conversationId
  }

  clearHistory(): void {
    this.conversationHistory = []
  }
}
