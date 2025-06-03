"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Zap,
  Shield,
  Smartphone,
  BarChart3,
  Settings,
  Lightbulb,
} from "lucide-react"

interface ImprovementArea {
  category: string
  priority: "Critical" | "High" | "Medium" | "Low"
  title: string
  description: string
  impact: string
  effort: "Low" | "Medium" | "High"
  status: "Missing" | "Partial" | "Needs Improvement"
  icon: any
}

export default function AnalysisPage() {
  const [selectedCategory, setSelectedCategory] = useState("all")

  const improvements: ImprovementArea[] = [
    // Critical Priority
    {
      category: "Security",
      priority: "Critical",
      title: "API Key Encryption",
      description: "API keys are currently stored in plain text. Need proper encryption for production.",
      impact: "Security vulnerability, compliance risk",
      effort: "Medium",
      status: "Missing",
      icon: Shield,
    },
    {
      category: "Core Features",
      priority: "Critical",
      title: "Agent Execution Engine",
      description: "Agents don't actually execute tasks with LLMs. Currently simulation only.",
      impact: "Core functionality missing",
      effort: "High",
      status: "Missing",
      icon: Zap,
    },
    {
      category: "Integration",
      priority: "Critical",
      title: "LLM Provider Integration",
      description: "No actual LLM API calls implemented. Need to connect user API keys to real providers.",
      impact: "Platform cannot deliver core value",
      effort: "High",
      status: "Missing",
      icon: Settings,
    },

    // High Priority
    {
      category: "User Experience",
      priority: "High",
      title: "Agent Editing Interface",
      description: "Users cannot edit agents after creation. Need comprehensive edit functionality.",
      impact: "Poor user experience, inflexibility",
      effort: "Medium",
      status: "Missing",
      icon: Users,
    },
    {
      category: "Core Features",
      priority: "High",
      title: "Manual Task Creation",
      description: "Users can only create tasks through agent generation. Need manual task creation.",
      impact: "Limited workflow flexibility",
      effort: "Medium",
      status: "Missing",
      icon: CheckCircle,
    },
    {
      category: "Analytics",
      priority: "High",
      title: "Performance Analytics",
      description: "No detailed analytics on agent performance, task completion rates, or user productivity.",
      impact: "No insights for optimization",
      effort: "Medium",
      status: "Missing",
      icon: BarChart3,
    },
    {
      category: "Core Features",
      priority: "High",
      title: "Agent Templates Library",
      description: "Limited agent templates. Need comprehensive library for different use cases.",
      impact: "Slow user adoption, limited use cases",
      effort: "Medium",
      status: "Partial",
      icon: Lightbulb,
    },

    // Medium Priority
    {
      category: "User Experience",
      priority: "Medium",
      title: "Mobile Optimization",
      description: "Mobile experience needs improvement. Some components not fully responsive.",
      impact: "Limited mobile usage",
      effort: "Medium",
      status: "Needs Improvement",
      icon: Smartphone,
    },
    {
      category: "Core Features",
      priority: "Medium",
      title: "Bulk Operations",
      description: "No bulk operations for tasks, agents, or dependencies.",
      impact: "Inefficient for power users",
      effort: "Low",
      status: "Missing",
      icon: CheckCircle,
    },
    {
      category: "Integration",
      priority: "Medium",
      title: "Webhook System",
      description: "No webhook system for external integrations and notifications.",
      impact: "Limited integration capabilities",
      effort: "Medium",
      status: "Missing",
      icon: Settings,
    },
    {
      category: "User Experience",
      priority: "Medium",
      title: "Advanced Search & Filtering",
      description: "Basic search functionality. Need advanced filtering and search across all entities.",
      impact: "Poor discoverability at scale",
      effort: "Medium",
      status: "Partial",
      icon: Users,
    },

    // Low Priority
    {
      category: "User Experience",
      priority: "Low",
      title: "Dark Mode",
      description: "No dark mode support for better user experience.",
      impact: "User preference, accessibility",
      effort: "Low",
      status: "Missing",
      icon: Users,
    },
    {
      category: "Analytics",
      priority: "Low",
      title: "Export Functionality",
      description: "No data export capabilities for reports and analytics.",
      impact: "Limited data portability",
      effort: "Low",
      status: "Missing",
      icon: BarChart3,
    },
  ]

  const categories = ["all", "Security", "Core Features", "User Experience", "Analytics", "Integration"]

  const filteredImprovements =
    selectedCategory === "all" ? improvements : improvements.filter((imp) => imp.category === selectedCategory)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Missing":
        return "bg-red-100 text-red-800"
      case "Partial":
        return "bg-yellow-100 text-yellow-800"
      case "Needs Improvement":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const criticalCount = improvements.filter((i) => i.priority === "Critical").length
  const highCount = improvements.filter((i) => i.priority === "High").length
  const totalCount = improvements.length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AgentFlow Analysis</h1>
          <p className="text-muted-foreground">Product gaps and improvement opportunities</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                <div className="text-sm text-muted-foreground">Critical Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{highCount}</div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">85%</div>
                <div className="text-sm text-muted-foreground">MVP Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category === "all" ? "All Categories" : category}
          </Button>
        ))}
      </div>

      {/* Improvements List */}
      <div className="space-y-4">
        {filteredImprovements.map((improvement, index) => {
          const Icon = improvement.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{improvement.title}</h3>
                      <Badge className={getPriorityColor(improvement.priority)}>{improvement.priority}</Badge>
                      <Badge className={getStatusColor(improvement.status)}>{improvement.status}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{improvement.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Impact:</span>
                        <p className="text-muted-foreground">{improvement.impact}</p>
                      </div>
                      <div>
                        <span className="font-medium">Effort:</span>
                        <p className="text-muted-foreground">{improvement.effort}</p>
                      </div>
                      <div>
                        <span className="font-medium">Category:</span>
                        <p className="text-muted-foreground">{improvement.category}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recommendations */}
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommendation:</strong> Focus on Critical and High priority items first. Start with API Key
          Encryption and LLM Provider Integration to enable core functionality.
        </AlertDescription>
      </Alert>
    </div>
  )
}
