import { getSupabaseFromServer } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { LLMService } from "@/lib/llm-service"

export interface AnalyticsData {
  overview: {
    totalAgents: number
    activeAgents: number
    totalTasks: number
    completedTasks: number
    successRate: number
    avgExecutionTime: number
    totalTokensUsed: number
  }
  agentPerformance: Array<{
    id: string
    name: string
    tasksCompleted: number
    successRate: number
    avgExecutionTime: number
    tokensUsed: number
    lastActive: string
  }>
  executionTrends: Array<{
    date: string
    executions: number
    successes: number
    failures: number
    avgTime: number
  }>
  taskDistribution: {
    byStatus: Array<{ status: string; count: number }>
    byPriority: Array<{ priority: string; count: number }>
    byType: Array<{ type: string; count: number }>
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    status: string
  }>
  insights: Array<{
    type: "success" | "warning" | "info" | "error"
    title: string
    description: string
    metric?: number
    trend?: "up" | "down" | "stable"
  }>
}

export class AnalyticsService {
  /**
   * Get comprehensive analytics data
   */
  static async getAnalytics(timeRange: "24h" | "7d" | "30d" | "90d" = "7d"): Promise<AnalyticsData> {
    console.log("📊 Starting analytics generation...")

    try {
      const userId = await getDefaultUserId()
      const supabase = getSupabaseFromServer()

      // Calculate date range
      const now = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case "24h":
          startDate.setHours(now.getHours() - 24)
          break
        case "7d":
          startDate.setDate(now.getDate() - 7)
          break
        case "30d":
          startDate.setDate(now.getDate() - 30)
          break
        case "90d":
          startDate.setDate(now.getDate() - 90)
          break
      }

      console.log(`📅 Analyzing data from ${startDate.toISOString()} to ${now.toISOString()}`)

      // Run all analytics queries in parallel
      const [agentsData, tasksData, executionLogsData, recentActivityData] = await Promise.allSettled([
        this.getAgentsAnalytics(supabase, userId, startDate),
        this.getTasksAnalytics(supabase, userId, startDate),
        this.getExecutionAnalytics(supabase, userId, startDate),
        this.getRecentActivity(supabase, userId, startDate),
      ])

      // Extract data with fallbacks
      const agents = agentsData.status === "fulfilled" ? agentsData.value : []
      const tasks = tasksData.status === "fulfilled" ? tasksData.value : []
      const executions = executionLogsData.status === "fulfilled" ? executionLogsData.value : []
      const activities = recentActivityData.status === "fulfilled" ? recentActivityData.value : []

      console.log("📈 Processing analytics data...")

      // Calculate overview metrics
      const overview = this.calculateOverview(agents, tasks, executions)

      // Calculate agent performance
      const agentPerformance = this.calculateAgentPerformance(agents, tasks, executions)

      // Calculate execution trends
      const executionTrends = this.calculateExecutionTrends(executions, timeRange)

      // Calculate task distribution
      const taskDistribution = this.calculateTaskDistribution(tasks)

      // Format recent activity
      const recentActivity = this.formatRecentActivity(activities, agents, tasks)

      // Generate AI insights using user's API keys
      const insights = await this.generateInsights(overview, agentPerformance, executionTrends, userId)

      const analyticsData: AnalyticsData = {
        overview,
        agentPerformance,
        executionTrends,
        taskDistribution,
        recentActivity,
        insights,
      }

      console.log("✅ Analytics generation completed successfully")
      return analyticsData
    } catch (error) {
      console.error("❌ Error generating analytics:", error)

      // Return empty analytics data structure
      return {
        overview: {
          totalAgents: 0,
          activeAgents: 0,
          totalTasks: 0,
          completedTasks: 0,
          successRate: 0,
          avgExecutionTime: 0,
          totalTokensUsed: 0,
        },
        agentPerformance: [],
        executionTrends: [],
        taskDistribution: {
          byStatus: [],
          byPriority: [],
          byType: [],
        },
        recentActivity: [],
        insights: [
          {
            type: "error",
            title: "Analytics Unavailable",
            description: "Unable to generate analytics data. Please check your database connection and try again.",
          },
        ],
      }
    }
  }

  private static async getAgentsAnalytics(supabase: any, userId: string, startDate: Date) {
    try {
      const { data, error } = await supabase.from("agents").select("*").eq("user_id", userId)

      if (error) {
        console.error("❌ Error fetching agents:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("❌ Error in getAgentsAnalytics:", error)
      return []
    }
  }

  private static async getTasksAnalytics(supabase: any, userId: string, startDate: Date) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())

      if (error) {
        console.error("❌ Error fetching tasks:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("❌ Error in getTasksAnalytics:", error)
      return []
    }
  }

  private static async getExecutionAnalytics(supabase: any, userId: string, startDate: Date) {
    try {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Error fetching execution logs:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("❌ Error in getExecutionAnalytics:", error)
      return []
    }
  }

  private static async getRecentActivity(supabase: any, userId: string, startDate: Date) {
    try {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("❌ Error fetching recent activity:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("❌ Error in getRecentActivity:", error)
      return []
    }
  }

  private static calculateOverview(agents: any[], tasks: any[], executions: any[]) {
    const totalAgents = agents.length
    const activeAgents = agents.filter((agent) => agent.status === "active" || agent.status === "running").length

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.status === "completed").length

    const successfulExecutions = executions.filter(
      (log) => log.status === "success" || log.status === "completed",
    ).length
    const successRate = executions.length > 0 ? (successfulExecutions / executions.length) * 100 : 0

    const executionTimes = executions
      .filter((log) => log.execution_time && log.execution_time > 0)
      .map((log) => log.execution_time)
    const avgExecutionTime =
      executionTimes.length > 0 ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0

    const totalTokensUsed = executions
      .filter((log) => log.tokens_used && log.tokens_used > 0)
      .reduce((sum, log) => sum + log.tokens_used, 0)

    return {
      totalAgents,
      activeAgents,
      totalTasks,
      completedTasks,
      successRate: Math.round(successRate * 100) / 100,
      avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
      totalTokensUsed,
    }
  }

  private static calculateAgentPerformance(agents: any[], tasks: any[], executions: any[]) {
    return agents.map((agent) => {
      const agentTasks = tasks.filter((task) => task.agent_id === agent.id)
      const agentExecutions = executions.filter((log) => log.agent_id === agent.id)

      const tasksCompleted = agentTasks.filter((task) => task.status === "completed").length
      const successfulExecutions = agentExecutions.filter(
        (log) => log.status === "success" || log.status === "completed",
      ).length
      const successRate = agentExecutions.length > 0 ? (successfulExecutions / agentExecutions.length) * 100 : 0

      const executionTimes = agentExecutions
        .filter((log) => log.execution_time && log.execution_time > 0)
        .map((log) => log.execution_time)
      const avgExecutionTime =
        executionTimes.length > 0 ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0

      const tokensUsed = agentExecutions
        .filter((log) => log.tokens_used && log.tokens_used > 0)
        .reduce((sum, log) => sum + log.tokens_used, 0)

      const lastActive =
        agentExecutions.length > 0 ? agentExecutions[0].created_at : agent.updated_at || agent.created_at

      return {
        id: agent.id,
        name: agent.name || "Unnamed Agent",
        tasksCompleted,
        successRate: Math.round(successRate * 100) / 100,
        avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
        tokensUsed,
        lastActive,
      }
    })
  }

  private static calculateExecutionTrends(executions: any[], timeRange: string) {
    const trends: { [key: string]: { executions: number; successes: number; failures: number; times: number[] } } = {}

    executions.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split("T")[0]

      if (!trends[date]) {
        trends[date] = { executions: 0, successes: 0, failures: 0, times: [] }
      }

      trends[date].executions++

      if (log.status === "success" || log.status === "completed") {
        trends[date].successes++
      } else {
        trends[date].failures++
      }

      if (log.execution_time && log.execution_time > 0) {
        trends[date].times.push(log.execution_time)
      }
    })

    return Object.entries(trends)
      .map(([date, data]) => ({
        date,
        executions: data.executions,
        successes: data.successes,
        failures: data.failures,
        avgTime:
          data.times.length > 0
            ? Math.round((data.times.reduce((sum, time) => sum + time, 0) / data.times.length) * 100) / 100
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private static calculateTaskDistribution(tasks: any[]) {
    const byStatus: { [key: string]: number } = {}
    const byPriority: { [key: string]: number } = {}
    const byType: { [key: string]: number } = {}

    tasks.forEach((task) => {
      // Status distribution
      const status = task.status || "unknown"
      byStatus[status] = (byStatus[status] || 0) + 1

      // Priority distribution
      const priority = task.priority || "medium"
      byPriority[priority] = (byPriority[priority] || 0) + 1

      // Type distribution
      const type = task.type || "general"
      byType[type] = (byType[type] || 0) + 1
    })

    return {
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    }
  }

  private static formatRecentActivity(activities: any[], agents: any[], tasks: any[]) {
    return activities.slice(0, 10).map((activity) => {
      const agent = agents.find((a) => a.id === activity.agent_id)
      const task = tasks.find((t) => t.id === activity.task_id)

      let description = activity.message || "Agent activity"
      if (agent) {
        description = `${agent.name}: ${description}`
      }
      if (task) {
        description += ` (Task: ${task.title || task.description || "Untitled"})`
      }

      return {
        id: activity.id,
        type: activity.type || "execution",
        description,
        timestamp: activity.created_at,
        status: activity.status || "unknown",
      }
    })
  }

  private static async generateInsights(
    overview: any,
    agentPerformance: any[],
    executionTrends: any[],
    userId: string,
  ) {
    try {
      console.log("🤖 Generating AI insights using user's API keys...")

      const analyticsPrompt = `
Analyze the following analytics data and provide 3-5 key insights:

Overview:
- Total Agents: ${overview.totalAgents}
- Active Agents: ${overview.activeAgents}
- Total Tasks: ${overview.totalTasks}
- Completed Tasks: ${overview.completedTasks}
- Success Rate: ${overview.successRate}%
- Avg Execution Time: ${overview.avgExecutionTime}ms
- Total Tokens Used: ${overview.totalTokensUsed}

Agent Performance:
${agentPerformance
  .slice(0, 5)
  .map((agent) => `- ${agent.name}: ${agent.tasksCompleted} tasks, ${agent.successRate}% success rate`)
  .join("\n")}

Recent Trends:
${executionTrends
  .slice(-7)
  .map((trend) => `- ${trend.date}: ${trend.executions} executions, ${trend.successes} successes`)
  .join("\n")}

Provide insights in JSON format:
[
  {
    "type": "success|warning|info|error",
    "title": "Insight Title",
    "description": "Detailed description",
    "metric": optional_number,
    "trend": "up|down|stable"
  }
]
`

      const result = await LLMService.generateJSON({
        prompt: analyticsPrompt,
        systemPrompt:
          "You are an AI analytics expert. Analyze the data and provide actionable insights about agent performance, efficiency, and areas for improvement.",
        userId,
      })

      if (result.success && Array.isArray(result.data)) {
        console.log("✅ AI insights generated successfully")
        return result.data
      } else {
        console.log("⚠️ AI insights generation failed, using fallback")
        return this.getFallbackInsights(overview, agentPerformance)
      }
    } catch (error) {
      console.error("❌ Error generating AI insights:", error)
      return this.getFallbackInsights(overview, agentPerformance)
    }
  }

  private static getFallbackInsights(overview: any, agentPerformance: any[]) {
    const insights = []

    // Success rate insight
    if (overview.successRate >= 90) {
      insights.push({
        type: "success" as const,
        title: "Excellent Performance",
        description: `Your agents are performing exceptionally well with a ${overview.successRate}% success rate.`,
        metric: overview.successRate,
        trend: "up" as const,
      })
    } else if (overview.successRate < 70) {
      insights.push({
        type: "warning" as const,
        title: "Performance Needs Attention",
        description: `Success rate of ${overview.successRate}% indicates room for improvement in agent configuration.`,
        metric: overview.successRate,
        trend: "down" as const,
      })
    }

    // Agent utilization insight
    const utilizationRate = overview.totalAgents > 0 ? (overview.activeAgents / overview.totalAgents) * 100 : 0
    if (utilizationRate < 50) {
      insights.push({
        type: "info" as const,
        title: "Low Agent Utilization",
        description: `Only ${overview.activeAgents} of ${overview.totalAgents} agents are active. Consider optimizing your agent deployment.`,
        metric: utilizationRate,
        trend: "stable" as const,
      })
    }

    // Task completion insight
    const completionRate = overview.totalTasks > 0 ? (overview.completedTasks / overview.totalTasks) * 100 : 0
    if (completionRate >= 80) {
      insights.push({
        type: "success" as const,
        title: "High Task Completion",
        description: `${completionRate.toFixed(1)}% of tasks are being completed successfully.`,
        metric: completionRate,
        trend: "up" as const,
      })
    }

    // Performance insight
    if (overview.avgExecutionTime > 5000) {
      insights.push({
        type: "warning" as const,
        title: "Slow Execution Times",
        description: `Average execution time of ${overview.avgExecutionTime}ms may indicate performance bottlenecks.`,
        metric: overview.avgExecutionTime,
        trend: "down" as const,
      })
    }

    return insights.length > 0
      ? insights
      : [
          {
            type: "info" as const,
            title: "Getting Started",
            description: "Create more agents and tasks to see detailed analytics and insights.",
            trend: "stable" as const,
          },
        ]
  }
}
