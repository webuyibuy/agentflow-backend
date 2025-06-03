"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

interface GovernanceMetrics {
  total_policies: number
  active_policies: number
  compliance_score: number
  violations_today: number
  agents_compliant: number
  total_agents: number
}

interface PolicyViolation {
  id: string
  agent_name: string
  policy_name: string
  rule_type: string
  severity: "low" | "medium" | "high" | "critical"
  details: string
  occurred_at: string
  resolved: boolean
}

export function GovernanceDashboard() {
  const [metrics, setMetrics] = useState<GovernanceMetrics>({
    total_policies: 12,
    active_policies: 10,
    compliance_score: 94,
    violations_today: 3,
    agents_compliant: 47,
    total_agents: 50,
  })

  const [violations, setViolations] = useState<PolicyViolation[]>([
    {
      id: "1",
      agent_name: "Sales Assistant",
      policy_name: "Data Access Control",
      rule_type: "data_access",
      severity: "high",
      details: "Attempted to access customer financial data without authorization",
      occurred_at: new Date().toISOString(),
      resolved: false,
    },
    {
      id: "2",
      agent_name: "Marketing Bot",
      policy_name: "Cost Management",
      rule_type: "cost_limit",
      severity: "medium",
      details: "Exceeded daily cost limit of $100 (current: $127)",
      occurred_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      resolved: false,
    },
  ])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white"
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 95) return "text-green-600"
    if (score >= 85) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(metrics.compliance_score)}`}>
              {metrics.compliance_score}%
            </div>
            <Progress value={metrics.compliance_score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_policies}</div>
            <p className="text-xs text-muted-foreground">of {metrics.total_policies} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violations Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.violations_today}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant Agents</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.agents_compliant}</div>
            <p className="text-xs text-muted-foreground">of {metrics.total_agents} agents</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Policy Violations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {violations.map((violation) => (
              <div key={violation.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{violation.agent_name}</h4>
                    <Badge className={getSeverityColor(violation.severity)}>{violation.severity}</Badge>
                    {!violation.resolved && <Badge variant="destructive">Unresolved</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Policy: {violation.policy_name} • Rule: {violation.rule_type}
                  </p>
                  <p className="text-sm">{violation.details}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(violation.occurred_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Investigate
                  </Button>
                  <Button size="sm">Resolve</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
