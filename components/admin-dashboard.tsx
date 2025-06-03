"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCw, Users, Database, CheckCircle, AlertTriangle } from "lucide-react"

interface SystemHealthMetrics {
  total_users: number
  total_profiles: number
  users_without_profiles: number
  duplicate_profiles: number
  onboarding_completion_rate: number
  active_conversations: number
  total_tasks: number
  completed_tasks: number
  pending_dependencies: number
}

export default function AdminDashboard() {
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [alerts, setAlerts] = useState<string[]>([])

  const fetchHealthMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/health")
      const data = await response.json()

      if (data.metrics) {
        setHealthMetrics(data.metrics)
        setLastUpdated(new Date())

        // Generate alerts based on metrics
        const newAlerts: string[] = []
        if (data.metrics.users_without_profiles > 0) {
          newAlerts.push(`${data.metrics.users_without_profiles} users without profiles`)
        }
        if (data.metrics.duplicate_profiles > 0) {
          newAlerts.push(`${data.metrics.duplicate_profiles} duplicate profiles detected`)
        }
        if (data.metrics.onboarding_completion_rate < 50) {
          newAlerts.push(`Low onboarding completion rate: ${data.metrics.onboarding_completion_rate}%`)
        }
        setAlerts(newAlerts)
      }
    } catch (error) {
      console.error("Error fetching health metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const performCleanup = async (action: string) => {
    try {
      setCleanupLoading(true)
      const response = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const result = await response.json()
      if (result.success) {
        // Refresh metrics after cleanup
        await fetchHealthMetrics()
      }
    } catch (error) {
      console.error("Error performing cleanup:", error)
    } finally {
      setCleanupLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthMetrics()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchHealthMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !healthMetrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system health...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Health Dashboard</h1>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
          <Button variant="outline" size="sm" onClick={fetchHealthMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">{healthMetrics?.total_profiles || 0} with profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onboarding Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics?.onboarding_completion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics?.total_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">{healthMetrics?.completed_tasks || 0} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Dependencies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthMetrics?.pending_dependencies || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Data Quality & Maintenance</CardTitle>
          <CardDescription>Identify and fix data inconsistencies in the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Users Without Profiles</h4>
              <p className="text-sm text-gray-500">
                {healthMetrics?.users_without_profiles || 0} users need default profiles created
              </p>
            </div>
            <Button
              onClick={() => performCleanup("create_missing_profiles")}
              disabled={cleanupLoading || (healthMetrics?.users_without_profiles || 0) === 0}
              size="sm"
            >
              {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fix"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Duplicate Profiles</h4>
              <p className="text-sm text-gray-500">
                {healthMetrics?.duplicate_profiles || 0} duplicate profiles detected
              </p>
            </div>
            <Button
              onClick={() => performCleanup("cleanup_duplicates")}
              disabled={cleanupLoading || (healthMetrics?.duplicate_profiles || 0) === 0}
              size="sm"
            >
              {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clean Up"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">
                Conversations
              </Badge>
              <div className="text-lg font-semibold">{healthMetrics?.active_conversations || 0}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">
                Task Completion
              </Badge>
              <div className="text-lg font-semibold">
                {healthMetrics?.total_tasks
                  ? Math.round((healthMetrics.completed_tasks / healthMetrics.total_tasks) * 100)
                  : 0}
                %
              </div>
              <div className="text-sm text-gray-500">Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
