"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, AlertCircle, Info } from "lucide-react"

interface SystemAlert {
  id: string
  alert_type: "critical" | "warning" | "info" | "maintenance"
  title: string
  message: string
  severity: number
  is_resolved: boolean
  metadata: Record<string, any>
  created_at: string
}

export default function SystemAlertsDashboard() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingRules, setCheckingRules] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/monitoring/check", {
        method: "GET",
      })
      const data = await response.json()

      if (data.success) {
        setAlerts(data.alerts)
        setLastChecked(new Date())
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  const runMonitoringChecks = async () => {
    try {
      setCheckingRules(true)
      const response = await fetch("/api/admin/monitoring/check", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        // Refresh alerts after running checks
        await fetchAlerts()
      }
    } catch (error) {
      console.error("Error running monitoring checks:", error)
    } finally {
      setCheckingRules(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/monitoring/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      })
      const data = await response.json()

      if (data.success) {
        // Remove the resolved alert from the list
        setAlerts(alerts.filter((alert) => alert.id !== alertId))
      }
    } catch (error) {
      console.error("Error resolving alert:", error)
    }
  }

  useEffect(() => {
    fetchAlerts()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "maintenance":
        return <RefreshCw className="h-5 w-5 text-purple-500" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
      case "maintenance":
        return "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
      default:
        return ""
    }
  }

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system alerts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Alerts</h1>
        <div className="flex items-center space-x-2">
          {lastChecked && (
            <span className="text-sm text-gray-500">Last checked: {lastChecked.toLocaleTimeString()}</span>
          )}
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={runMonitoringChecks} disabled={checkingRules}>
            {checkingRules ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Run Checks
          </Button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Systems Operational</h3>
            <p className="text-gray-500">No active alerts at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Alert key={alert.id} className={getAlertColor(alert.alert_type)}>
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">{getAlertIcon(alert.alert_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <AlertTitle className="flex items-center">
                      {alert.title}
                      <Badge variant="outline" className="ml-2">
                        {alert.alert_type}
                      </Badge>
                    </AlertTitle>
                    <Button variant="ghost" size="sm" onClick={() => resolveAlert(alert.id)}>
                      Resolve
                    </Button>
                  </div>
                  <AlertDescription className="mt-1">{alert.message}</AlertDescription>
                  <div className="mt-2 text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  )
}
