"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Zap, ZapOff, Play, Pause, RefreshCw, Brain, Clock, CheckCircle2, AlertTriangle, Cpu } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AgentControlPanelProps {
  agentId: string
  agentName: string
  initialStatus: "active" | "paused" | "blocked" | "completed" | string
  onToggleStatus: (newStatus: "active" | "paused") => Promise<void>
  onStartExecution: () => Promise<void>
  executionStats?: {
    tasksCompleted: number
    tasksRemaining: number
    lastExecution?: string
    tokensUsed?: number
  }
}

export function AgentControlPanel({
  agentId,
  agentName,
  initialStatus,
  onToggleStatus,
  onStartExecution,
  executionStats,
}: AgentControlPanelProps) {
  const [status, setStatus] = useState<string>(initialStatus)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const { toast } = useToast()

  const handleToggle = async () => {
    setIsUpdating(true)
    try {
      const newStatus = status === "active" ? "paused" : "active"
      await onToggleStatus(newStatus as "active" | "paused")
      setStatus(newStatus)

      toast({
        title: `Agent ${newStatus === "active" ? "Activated" : "Paused"}`,
        description: `${agentName} is now ${newStatus === "active" ? "running" : "paused"}.`,
        variant: newStatus === "active" ? "default" : "secondary",
      })
    } catch (error) {
      console.error("Error toggling agent status:", error)
      toast({
        title: "Status Update Failed",
        description: "Could not update agent status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStartExecution = async () => {
    setIsExecuting(true)
    try {
      await onStartExecution()
      toast({
        title: "Execution Started",
        description: `${agentName} is now processing tasks with AI.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error starting execution:", error)
      toast({
        title: "Execution Failed",
        description: "Could not start agent execution. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const getStatusIcon = (currentStatus: string) => {
    switch (currentStatus) {
      case "active":
        return <Zap className="h-4 w-4 text-green-500" />
      case "blocked":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />
      default:
        return <ZapOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (currentStatus: string) => {
    switch (currentStatus) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200"
      case "blocked":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const formatLastExecution = (timestamp?: string) => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Agent Control
          </CardTitle>
          <Badge className={`${getStatusColor(status)} font-medium`}>
            {getStatusIcon(status)}
            <span className="ml-1 capitalize">{status}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100">
          <div className="flex items-center space-x-3">
            {getStatusIcon(status)}
            <div>
              <Label htmlFor="agent-status" className="font-medium text-gray-900">
                Agent Status
              </Label>
              <p className="text-sm text-gray-500">{status === "active" ? "Agent is running" : "Agent is paused"}</p>
            </div>
          </div>
          <Switch
            id="agent-status"
            checked={status === "active"}
            onCheckedChange={handleToggle}
            disabled={isUpdating || status === "blocked" || status === "completed"}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {/* Execution Stats */}
        {executionStats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">Completed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{executionStats.tasksCompleted}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{executionStats.tasksRemaining}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleStartExecution}
            disabled={isExecuting || status !== "active"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 transition-all duration-200"
          >
            {isExecuting ? (
              <>
                <Cpu className="h-4 w-4 mr-2 animate-pulse" />
                Processing Tasks...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Start AI Execution
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleToggle}
            disabled={isUpdating}
            className="w-full border-gray-200 hover:bg-gray-50 font-medium py-2.5 transition-all duration-200"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : status === "active" ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {status === "active" ? "Pause Agent" : "Resume Agent"}
          </Button>
        </div>

        {/* Last Execution Info */}
        {executionStats?.lastExecution && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last execution:</span>
              <span className="font-medium text-gray-700">{formatLastExecution(executionStats.lastExecution)}</span>
            </div>
            {executionStats.tokensUsed && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Tokens used:</span>
                <span className="font-medium text-gray-700">{executionStats.tokensUsed.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
