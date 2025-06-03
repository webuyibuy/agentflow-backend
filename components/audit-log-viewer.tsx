"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download } from "lucide-react"

interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, any>
  ip_address: string
  timestamp: string
  users: {
    email: string
    full_name: string
  }
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filters, setFilters] = useState({
    action: "all",
    resource_type: "all",
    user_id: "",
    search: "",
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800"
      case "update":
        return "bg-blue-100 text-blue-800"
      case "delete":
        return "bg-red-100 text-red-800"
      case "approve":
        return "bg-purple-100 text-purple-800"
      case "reject":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "User", "Action", "Resource Type", "Resource ID", "IP Address"],
      ...logs.map((log) => [
        log.timestamp,
        log.users.email,
        log.action,
        log.resource_type,
        log.resource_id,
        log.ip_address,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Logs</span>
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full"
              />
            </div>
            <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.resource_type}
              onValueChange={(value) => setFilters({ ...filters, resource_type: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="dependency">Dependency</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                  <div>
                    <p className="font-medium">{log.users.full_name || log.users.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.action} {log.resource_type} {log.resource_id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{new Date(log.timestamp).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{log.ip_address}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
