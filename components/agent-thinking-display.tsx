"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Lightbulb, Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface ThinkingLog {
  id: string
  message: string
  log_type: string
  created_at: string
}

interface AgentThinkingDisplayProps {
  agentId: string
  agentName: string
  isActive: boolean
}

export function AgentThinkingDisplay({ agentId, agentName, isActive }: AgentThinkingDisplayProps) {
  const [thinkingLogs, setThinkingLogs] = useState<ThinkingLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const fetchLogs = async () => {
      const { data } = await supabase
        .from("agent_logs")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(10)

      setThinkingLogs(data || [])
      setIsLoading(false)
    }

    fetchLogs()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`agent-logs-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_logs",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          setThinkingLogs((prev) => [payload.new as ThinkingLog, ...prev.slice(0, 9)])
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [agentId])

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading agent activity...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (thinkingLogs.length === 0) {
    return (
      <Card className="border-l-4 border-l-gray-300">
        <CardContent className="p-4 text-center">
          <Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Agent hasn't started thinking yet</p>
        </CardContent>
      </Card>
    )
  }

  const getLogIcon = (logType: string, message: string) => {
    if (message.includes("🧠") || logType === "thinking") return <Brain className="h-4 w-4 text-blue-600" />
    if (message.includes("✅") || message.includes("Completed"))
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    if (message.includes("⏳") || message.includes("dependency"))
      return <AlertCircle className="h-4 w-4 text-orange-600" />
    if (message.includes("⚡") || message.includes("🔄")) return <Zap className="h-4 w-4 text-purple-600" />
    return <Lightbulb className="h-4 w-4 text-yellow-600" />
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            {agentName} - Live Activity
          </CardTitle>
          <Badge
            variant="outline"
            className={
              isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
            }
          >
            {isActive ? "Active" : "Idle"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {thinkingLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-100">
              <div className="mt-0.5">{getLogIcon(log.log_type, log.message)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-relaxed">{log.message}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTime(log.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
