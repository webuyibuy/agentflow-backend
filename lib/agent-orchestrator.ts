import { getSupabaseAdmin } from "@/lib/supabase/server"

export interface AgentStartContext {
  agentId: string
  agentName: string
  agentGoal: string
  userId: string
}

export class AgentOrchestrator {
  static async startAgent(context: AgentStartContext): Promise<void> {
    const supabase = getSupabaseAdmin()

    console.log(`🚀 Starting agent: ${context.agentName}`)

    // Agent starts thinking about the goal
    await this.logThinking(context.agentId, "🧠 Analyzing your goal and breaking it down into actionable tasks...")

    // Simulate thinking time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Agent creates initial tasks based on the goal
    const initialTasks = this.generateInitialTasks(context.agentGoal)

    await this.logThinking(
      context.agentId,
      `📋 I've identified ${initialTasks.length} key areas to work on. Creating tasks now...`,
    )

    // Create tasks in database
    for (const task of initialTasks) {
      const { data: newTask } = await supabase
        .from("tasks")
        .insert({
          agent_id: context.agentId,
          title: task.title,
          description: task.description,
          status: task.needsHuman ? "blocked" : "todo",
          is_dependency: task.needsHuman,
          blocked_reason: task.needsHuman ? task.blockedReason : null,
          priority: task.priority,
          metadata: {
            ai_generated: true,
            task_type: task.needsHuman ? "dependency" : "autonomous",
            reasoning: task.reasoning,
          },
        })
        .select("id")
        .single()

      if (task.needsHuman) {
        await this.logThinking(
          context.agentId,
          `⏳ Created dependency: "${task.title}" - I need your help with this one!`,
        )
      } else {
        await this.logThinking(context.agentId, `✅ Created task: "${task.title}" - I can work on this autonomously`)

        // Start working on autonomous tasks immediately
        setTimeout(() => this.workOnTask(context.agentId, newTask?.id, task), 3000)
      }
    }

    await this.logThinking(
      context.agentId,
      `🎯 Ready to work! I've created ${initialTasks.filter((t) => !t.needsHuman).length} tasks I can work on immediately, and ${initialTasks.filter((t) => t.needsHuman).length} that need your input.`,
    )
  }

  private static generateInitialTasks(goal: string) {
    // Simple AI-like task generation based on goal keywords
    const goalLower = goal.toLowerCase()
    const tasks = []

    // Always start with research and planning
    tasks.push({
      title: "Research and analyze requirements",
      description: `Analyze the goal: "${goal}" and research best practices and approaches.`,
      needsHuman: false,
      priority: "high",
      reasoning: "I need to understand the context and requirements before taking action.",
    })

    // Check for common goal types and create relevant tasks
    if (goalLower.includes("lead") || goalLower.includes("sales") || goalLower.includes("prospect")) {
      tasks.push({
        title: "Define target customer profile",
        description: "Create a detailed profile of ideal customers based on the goal requirements.",
        needsHuman: true,
        blockedReason: "I need you to provide information about your ideal customers, industry, and target market.",
        priority: "high",
        reasoning: "Customer targeting requires your business knowledge and preferences.",
      })

      tasks.push({
        title: "Research lead generation channels",
        description: "Identify and evaluate the best channels for reaching potential customers.",
        needsHuman: false,
        priority: "medium",
        reasoning: "I can research various lead generation methods and channels independently.",
      })
    }

    if (goalLower.includes("content") || goalLower.includes("blog") || goalLower.includes("social")) {
      tasks.push({
        title: "Content strategy development",
        description: "Create a comprehensive content strategy aligned with your goals.",
        needsHuman: true,
        blockedReason: "I need your input on brand voice, target audience, and content preferences.",
        priority: "high",
        reasoning: "Content strategy requires your brand guidelines and audience insights.",
      })

      tasks.push({
        title: "Content calendar creation",
        description: "Develop a detailed content calendar with topics and publishing schedule.",
        needsHuman: false,
        priority: "medium",
        reasoning: "I can create content calendars based on best practices and trends.",
      })
    }

    // Always add a planning task that needs human input
    tasks.push({
      title: "Review and approve action plan",
      description: "Review the proposed approach and provide feedback on priorities and methods.",
      needsHuman: true,
      blockedReason: "I need your approval on the overall strategy before proceeding with execution.",
      priority: "high",
      reasoning: "Your approval ensures I'm working on the right priorities in the right way.",
    })

    return tasks
  }

  private static async workOnTask(agentId: string, taskId: string | undefined, task: any) {
    if (!taskId) return

    const supabase = getSupabaseAdmin()

    await this.logThinking(agentId, `🔄 Starting work on: "${task.title}"`)

    // Simulate work progress
    const workSteps = [
      "Gathering relevant information...",
      "Analyzing data and patterns...",
      "Developing approach...",
      "Implementing solution...",
      "Reviewing results...",
    ]

    for (let i = 0; i < workSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 8000 + Math.random() * 4000))
      await this.logThinking(agentId, `⚡ ${workSteps[i]}`)
    }

    // Complete the task
    await supabase
      .from("tasks")
      .update({
        status: "done",
        metadata: {
          completed_by: "agent",
          completion_time: new Date().toISOString(),
          work_summary: `Completed autonomous work on: ${task.title}`,
        },
      })
      .eq("id", taskId)

    await this.logThinking(agentId, `✅ Completed: "${task.title}" - Ready for next task!`)
  }

  private static async logThinking(agentId: string, message: string) {
    const supabase = getSupabaseAdmin()

    await supabase.from("agent_logs").insert({
      agent_id: agentId,
      log_type: "thinking",
      message,
      created_at: new Date().toISOString(),
    })
  }
}
