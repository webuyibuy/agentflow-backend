"use client"

import type React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Info, AlertTriangle, CheckCircle, Zap, ListChecks, Clock, FilterIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem, // Import DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export interface LogEntry {
  id: string
  timestamp: string // ISO string
  message: string
  type: "info" | "error" | "success" | "action" | "milestone" | "task_update"
  taskId?: string
}

interface AgentLogDisplayProps {
  logs: LogEntry[]
  isLoading?: boolean
}

const logTypeDetails: Record<LogEntry["type"], { icon: React.ElementType; colorClasses: string; label: string }> = {
  info: {
    icon: Info,
    colorClasses: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300",
    label: "Info",
  },
  error: {
    icon: AlertTriangle,
    colorClasses: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-300",
    label: "Error",
  },
  success: {
    icon: CheckCircle,
    colorClasses: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-300",
    label: "Success",
  },
  action: {
    icon: Zap,
    colorClasses: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300",
    label: "Action",
  },
  milestone: {
    icon: ListChecks,
    colorClasses: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300",
    label: "Milestone",
  },
  task_update: {
    icon: Clock,
    colorClasses: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300",
    label: "Task Update",
  },
}

const allLogTypes = Object.keys(logTypeDetails) as Array<LogEntry["type"]>

export default function AgentLogDisplay({ logs, isLoading = false }: AgentLogDisplayProps) {
  const [selectedLogTypes, setSelectedLogTypes] = useState<LogEntry["type"][]>(allLogTypes)

  const handleFilterChange = (type: LogEntry["type"], checked: boolean) => {
    setSelectedLogTypes((prev) => {
      if (checked) {
        return [...prev, type]
      } else {
        return prev.filter((t) => t !== type)
      }
    })
  }

  const handleSelectAll = () => {
    setSelectedLogTypes(allLogTypes)
  }

  const handleDeselectAll = () => {
    setSelectedLogTypes([])
  }

  const filteredLogs = logs.filter((log) => selectedLogTypes.includes(log.type))

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md">
        <p className="text-gray-500 dark:text-gray-400">Loading agent log...</p>
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md">
        <p className="text-gray-500 dark:text-gray-400">No log entries yet for this agent.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 p-3 border-b dark:border-gray-700 flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Log Entries</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FilterIcon className="mr-2 h-4 w-4" />
              Filter Types ({selectedLogTypes.length} selected)
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Log Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSelectAll} disabled={selectedLogTypes.length === allLogTypes.length}>
              Select All
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDeselectAll} disabled={selectedLogTypes.length === 0}>
              Deselect All
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {allLogTypes.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={selectedLogTypes.includes(type)}
                onCheckedChange={(checked) => handleFilterChange(type, !!checked)}
              >
                {logTypeDetails[type].label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="h-72 w-full rounded-md border dark:border-gray-700 p-1">
        <div className="p-3 space-y-3">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const details = logTypeDetails[log.type] || logTypeDetails.info
              const LogIcon = details.icon
              return (
                <div key={log.id} className="flex items-start space-x-3 text-sm">
                  <LogIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${details.colorClasses.split(" ")[1]}`} />
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${details.colorClasses}`}>
                        {details.label}
                      </Badge>
                      <time className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{log.message}</p>
                    {log.taskId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Related Task ID: <span className="font-mono">{log.taskId}</span>
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">No logs match the current filter.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
