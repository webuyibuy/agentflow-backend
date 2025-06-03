"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, Zap, RefreshCw, BarChart3 } from "lucide-react"
import { ErrorBoundary, useErrorHandler } from "@/components/error-boundary"
import { dbOps } from "@/lib/database-operations"

interface DashboardMetrics {
  tasks: {
    total: number
    completed: number
    pending: number
    blocked: number
    in_progress: number
  }
  agents: {
    total: number
    active: number
    error: number
    initializing: number
  }
  dependencies: {
    total: number
    completed: number
    at_risk: number
    pending: number
  }
}

interface ProductionDashboardProps {
  userId: string
}

export default function ProductionDashboard({ userId }: ProductionDashboardProps) {
  return (
    <ErrorBoundary>
      <DashboardContent userId={userId} />
    </ErrorBoundary>
  )
}

function DashboardContent({ userId }: ProductionDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const handleError = useErrorHandler()

  const loadMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await dbOps.getUserMetrics(userId)
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = "Failed to load dashboard metrics"
      setError(errorMessage)
      handleError(err as Error, { action: "load_dashboard_metrics", userId })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [userId])

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading...
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={loadMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No metrics data available</AlertDescription>
      </Alert>
    )
  }

  const taskCompletionRate =
    metrics.tasks.total > 0 ? Math.round((metrics.tasks.completed / metrics.tasks.total) * 100) : 0

  const agentHealthRate =
    metrics.agents.total > 0 ? Math.round((metrics.agents.active / metrics.agents.total) * 100) : 0

  const dependencyRiskRate =
    metrics.dependencies.total > 0 ? Math.round((metrics.dependencies.at_risk / metrics.dependencies.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
          <Button onClick={loadMetrics} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tasks Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tasks.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {taskCompletionRate}% complete
              </Badge>
              {metrics.tasks.blocked > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {metrics.tasks.blocked} blocked
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {metrics.tasks.in_progress} in progress, {metrics.tasks.pending} pending
            </div>
          </CardContent>
        </Card>

        {/* Agents Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.agents.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={agentHealthRate >= 80 ? "default" : "secondary"} className="text-xs">
                {agentHealthRate}% healthy
              </Badge>
              {metrics.agents.error > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {metrics.agents.error} errors
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {metrics.agents.active} active, {metrics.agents.initializing} initializing
            </div>
          </CardContent>
        </Card>

        {/* Dependencies Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependencies</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dependencies.total}</div>
            <div className="flex items-center gap-2 mt-2">
              {dependencyRiskRate > 20 ? (
                <Badge variant="destructive" className="text-xs">
                  {dependencyRiskRate}% at risk
                </Badge>
              ) : (
                <Badge variant="default" className="text-xs">
                  Low risk
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {metrics.dependencies.completed} completed, {metrics.dependencies.pending} pending
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((taskCompletionRate + agentHealthRate) / 2)}%</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={taskCompletionRate >= 70 ? "default" : "secondary"} className="text-xs">
                Overall Health
              </Badge>
            </div>
            <div className="text-xs text-gray-600 mt-2">System performing well</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Warnings */}
      {(metrics.tasks.blocked > 0 || metrics.agents.error > 0 || dependencyRiskRate > 20) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.tasks.blocked > 0 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>{metrics.tasks.blocked} tasks are blocked and need attention</AlertDescription>
              </Alert>
            )}

            {metrics.agents.error > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{metrics.agents.error} agents have errors and need troubleshooting</AlertDescription>
              </Alert>
            )}

            {dependencyRiskRate > 20 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {metrics.dependencies.at_risk} dependencies are at risk of missing deadlines
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-auto p-4 flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              <span>Create Agent</span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              <span>Add Task</span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>View Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
