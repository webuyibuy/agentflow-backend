"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, AlertTriangle, CheckCircle } from "lucide-react"

interface Dependency {
  id: string
  title: string
  status: "pending" | "approved" | "rejected"
  sla_hours: number
  sla_deadline: string
  created_at: string
  agent: { name: string }
  task: { title: string }
}

export function SLATrackingDashboard() {
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [overdueDependencies, setOverdueDependencies] = useState<Dependency[]>([])

  const calculateSLAProgress = (dependency: Dependency) => {
    const created = new Date(dependency.created_at).getTime()
    const deadline = new Date(dependency.sla_deadline).getTime()
    const now = Date.now()
    const total = deadline - created
    const elapsed = now - created
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  const getSLAStatus = (dependency: Dependency) => {
    const progress = calculateSLAProgress(dependency)
    if (progress >= 100) return "overdue"
    if (progress >= 80) return "warning"
    return "on-track"
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dependencies.filter((d) => d.status === "pending").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueDependencies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dependencies.filter((d) => getSLAStatus(d) === "on-track").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dependencies.map((dependency) => {
              const progress = calculateSLAProgress(dependency)
              const status = getSLAStatus(dependency)

              return (
                <div key={dependency.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{dependency.title}</h4>
                      <Badge
                        variant={status === "overdue" ? "destructive" : status === "warning" ? "secondary" : "default"}
                      >
                        {status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {dependency.agent.name} • {dependency.task.title}
                    </p>
                    <Progress
                      value={progress}
                      className={`h-2 ${status === "overdue" ? "bg-red-100" : status === "warning" ? "bg-yellow-100" : "bg-green-100"}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>SLA: {dependency.sla_hours}h</span>
                      <span>Deadline: {new Date(dependency.sla_deadline).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button size="sm" variant={status === "overdue" ? "destructive" : "default"}>
                    Review
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
