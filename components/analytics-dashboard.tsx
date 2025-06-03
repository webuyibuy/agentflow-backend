"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Activity,
  RefreshCw,
  Calendar,
  Target,
} from "lucide-react"
import { analyticsService, type AnalyticsData } from "@/lib/analytics-service"

interface AnalyticsDashboardProps {
  userId?: string
}

export default function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("7d")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      console.log("Loading analytics...")
      const data = await analyticsService.getAnalytics(userId, timeRange)
      console.log("Analytics loaded:", data)
      setAnalytics(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to load analytics:", error)
      // Set empty analytics data to prevent crashes
      setAnalytics({
        overview: {
          totalAgents: 0,
          activeAgents: 0,
          totalTasks: 0,
          completedTasks: 0,
          totalExecutions: 0,
          successRate: 0,
          avgExecutionTime: 0,
          totalTokensUsed: 0,
        },
        agentPerformance: [],
        executionTrends: [],
        taskDistribution: {
          byStatus: {},
          byPriority: {},
          byType: {},
        },
        recentActivity: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [timeRange, userId])

  const formatTimeRange = (range: string) => {
    switch (range) {
      case "24h":
        return "Last 24 Hours"
      case "7d":
        return "Last 7 Days"
      case "30d":
        return "Last 30 Days"
      case "90d":
        return "Last 90 Days"
      default:
        return "Last 7 Days"
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading analytics...
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load analytics</h3>
        <p className="text-gray-500 mb-4">There was an error loading your analytics data.</p>
        <Button onClick={loadAnalytics}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor your agent performance and system metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{analytics.overview.totalAgents}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                {analytics.overview.activeAgents} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {analytics.overview.completedTasks}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                {analytics.overview.totalTasks} total
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {analytics.overview.successRate}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                {analytics.overview.totalExecutions} executions
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Avg Execution</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {formatDuration(analytics.overview.avgExecutionTime)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                {formatNumber(analytics.overview.totalTokensUsed)} tokens
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Agent Performance
          </CardTitle>
          <CardDescription>Performance metrics for your agents in {formatTimeRange(timeRange)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.agentPerformance.length > 0 ? (
              analytics.agentPerformance.slice(0, 5).map((agent, index) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{agent.agentName}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {agent.tasksCompleted} tasks • {agent.successRate}% success
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatDuration(agent.avgExecutionTime)}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">avg time</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">{formatNumber(agent.tokensUsed)}</div>
                      <div className="text-gray-500 dark:text-gray-400">tokens</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No agent performance data available for the selected time range.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.taskDistribution.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        status === "done"
                          ? "bg-green-500"
                          : status === "in_progress"
                            ? "bg-blue-500"
                            : status === "blocked"
                              ? "bg-red-500"
                              : "bg-gray-400"
                      }`}
                    ></div>
                    <span className="capitalize text-sm font-medium">{status.replace("_", " ")}</span>
                  </div>
                  <span className="text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === "execution"
                        ? "bg-blue-500"
                        : activity.type === "task_completed"
                          ? "bg-green-500"
                          : activity.type === "error"
                            ? "bg-red-500"
                            : "bg-gray-400"
                    }`}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.agentName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activity.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}
