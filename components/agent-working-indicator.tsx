"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bot, Activity, Loader2, Pause, Settings } from "lucide-react"
import Link from "next/link"

interface AgentWorkingIndicatorProps {
  agentId: string
  agentName: string | null
  workingStatus?: string
}

export function AgentWorkingIndicator({ agentId, agentName, workingStatus }: AgentWorkingIndicatorProps) {
  const [currentStatus, setCurrentStatus] = useState(workingStatus || "working")
  const [dots, setDots] = useState("")

  // Animate the working indicator
  useEffect(() => {
    if (currentStatus === "working" || currentStatus === "active") {
      const interval = setInterval(() => {
        setDots((prev) => {
          if (prev === "...") return ""
          return prev + "."
        })
      }, 500)
      return () => clearInterval(interval)
    }
  }, [currentStatus])

  const getStatusInfo = () => {
    switch (currentStatus) {
      case "working":
      case "active":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <Activity className="h-4 w-4" />,
          text: "Working",
          description: "Agent is actively processing tasks",
        }
      case "thinking":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Thinking",
          description: "Agent is analyzing and planning",
        }
      case "blocked":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          icon: <Pause className="h-4 w-4" />,
          text: "Blocked",
          description: "Agent needs help with dependencies",
        }
      case "paused":
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <Pause className="h-4 w-4" />,
          text: "Paused",
          description: "Agent execution is paused",
        }
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <Bot className="h-4 w-4" />,
          text: "Unknown",
          description: "Agent status unknown",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">{agentName || "Unnamed Agent"}</span>
            </div>
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.icon}
              <span className="ml-1">
                {statusInfo.text}
                {(currentStatus === "working" || currentStatus === "active") && dots}
              </span>
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/agents/${agentId}`}>
                <Settings className="h-4 w-4 mr-1" />
                View Details
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{statusInfo.description}</p>
        {(currentStatus === "working" || currentStatus === "active") && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full animate-pulse" style={{ width: "60%" }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Processing tasks autonomously...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
