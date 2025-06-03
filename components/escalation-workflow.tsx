"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, AlertTriangle } from "lucide-react"

interface EscalationRule {
  id: string
  name: string
  trigger_hours: number
  escalate_to: string[]
  notification_method: "email" | "slack" | "both"
  active: boolean
}

export function EscalationWorkflow() {
  const [rules, setRules] = useState<EscalationRule[]>([
    {
      id: "1",
      name: "Critical Dependencies",
      trigger_hours: 2,
      escalate_to: ["manager@company.com", "cto@company.com"],
      notification_method: "both",
      active: true,
    },
    {
      id: "2",
      name: "Standard Dependencies",
      trigger_hours: 24,
      escalate_to: ["team-lead@company.com"],
      notification_method: "email",
      active: true,
    },
  ])

  const [newRule, setNewRule] = useState({
    name: "",
    trigger_hours: 24,
    escalate_to: "",
    notification_method: "email" as const,
  })

  const addEscalationRule = () => {
    const rule: EscalationRule = {
      id: Date.now().toString(),
      name: newRule.name,
      trigger_hours: newRule.trigger_hours,
      escalate_to: newRule.escalate_to.split(",").map((email) => email.trim()),
      notification_method: newRule.notification_method,
      active: true,
    }
    setRules([...rules, rule])
    setNewRule({ name: "", trigger_hours: 24, escalate_to: "", notification_method: "email" })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Escalation Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant={rule.active ? "default" : "secondary"}>{rule.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Trigger after {rule.trigger_hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {rule.escalate_to.length} recipients
                    </span>
                    <Badge variant="outline">{rule.notification_method}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    {rule.active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Escalation Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="rule-name">Rule Name</Label>
            <Input
              id="rule-name"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="e.g., High Priority Dependencies"
            />
          </div>

          <div>
            <Label htmlFor="trigger-hours">Trigger After (hours)</Label>
            <Input
              id="trigger-hours"
              type="number"
              value={newRule.trigger_hours}
              onChange={(e) => setNewRule({ ...newRule, trigger_hours: Number.parseInt(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="escalate-to">Escalate To (comma-separated emails)</Label>
            <Textarea
              id="escalate-to"
              value={newRule.escalate_to}
              onChange={(e) => setNewRule({ ...newRule, escalate_to: e.target.value })}
              placeholder="manager@company.com, cto@company.com"
            />
          </div>

          <div>
            <Label htmlFor="notification-method">Notification Method</Label>
            <Select
              value={newRule.notification_method}
              onValueChange={(value: "email" | "slack" | "both") =>
                setNewRule({ ...newRule, notification_method: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email Only</SelectItem>
                <SelectItem value="slack">Slack Only</SelectItem>
                <SelectItem value="both">Email + Slack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={addEscalationRule} className="w-full">
            Add Escalation Rule
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
