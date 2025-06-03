"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bot,
  TrendingUp,
  Clock,
  DollarSign,
  Zap,
  Target,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Settings,
  Play,
} from "lucide-react"
import { motion } from "framer-motion"

interface DeploymentResult {
  id: string
  name: string
  type: "systematic" | "business-logic" | "user-experience"
  status: "deployed" | "configuring" | "ready"
  createdAt: Date
  metrics: {
    roi: string
    timeToValue: string
    efficiency: string
    accuracy: string
  }
  capabilities: string[]
  nextSteps: string[]
}

interface EnhancedDeploymentResultsProps {
  results: DeploymentResult[]
  onManageAgent?: (agentId: string) => void
  onOptimizeAgent?: (agentId: string) => void
}

export function EnhancedDeploymentResults({ results, onManageAgent, onOptimizeAgent }: EnhancedDeploymentResultsProps) {
  const getAgentTypeConfig = (type: string) => {
    switch (type) {
      case "systematic":
        return {
          icon: <Target className="h-6 w-6" />,
          color: "bg-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          title: "Systematic Process Agent",
          description: "Optimizes workflows and automates repetitive business processes",
        }
      case "business-logic":
        return {
          icon: <BarChart3 className="h-6 w-6" />,
          color: "bg-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          title: "Business Logic Agent",
          description: "Analyzes data patterns and makes intelligent business decisions",
        }
      case "user-experience":
        return {
          icon: <Zap className="h-6 w-6" />,
          color: "bg-purple-500",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          title: "User Experience Agent",
          description: "Enhances customer interactions and personalizes user journeys",
        }
      default:
        return {
          icon: <Bot className="h-6 w-6" />,
          color: "bg-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          title: "AI Agent",
          description: "Intelligent automation for your business needs",
        }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "deployed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Active & Working</Badge>
      case "configuring":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚙️ Configuring</Badge>
      case "ready":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">🚀 Ready to Deploy</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Deployed Agents</h3>
        <p className="text-gray-600">Your deployed agents will appear here once they're ready.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deployment Results</h2>
          <p className="text-gray-600">Your AI agents are configured and ready to deliver business value</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {results.length} Agent{results.length !== 1 ? "s" : ""} Deployed
        </Badge>
      </div>

      <div className="grid gap-6">
        {results.map((result, index) => {
          const config = getAgentTypeConfig(result.type)

          return (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`${config.borderColor} ${config.bgColor} border-2`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`${config.color} text-white p-3 rounded-lg`}>{config.icon}</div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">{result.name}</CardTitle>
                        <p className="text-gray-600 mt-1">{config.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(result.status)}
                          <Badge variant="outline" className="text-xs">
                            {config.title}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Deployed</div>
                      <div className="text-sm font-medium">{result.createdAt.toLocaleDateString()}</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Business Impact Metrics */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Business Impact Metrics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-green-600">{result.metrics.roi}</div>
                        <div className="text-xs text-gray-600">Expected ROI</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-blue-600">{result.metrics.timeToValue}</div>
                        <div className="text-xs text-gray-600">Time to Value</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Zap className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-purple-600">{result.metrics.efficiency}</div>
                        <div className="text-xs text-gray-600">Efficiency Gain</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Target className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-orange-600">{result.metrics.accuracy}</div>
                        <div className="text-xs text-gray-600">Accuracy Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Key Capabilities
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.capabilities.map((capability, capIndex) => (
                        <div key={capIndex} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span className="text-gray-700">{capability}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Recommended Next Steps
                    </h4>
                    <div className="space-y-2">
                      {result.nextSteps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-start gap-2 text-sm">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                            {stepIndex + 1}
                          </div>
                          <span className="text-gray-700">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button onClick={() => onManageAgent?.(result.id)} className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Agent
                    </Button>
                    <Button variant="outline" onClick={() => onOptimizeAgent?.(result.id)} className="flex-1">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Optimize Performance
                    </Button>
                    {result.status === "ready" && (
                      <Button variant="secondary">
                        <Play className="h-4 w-4 mr-2" />
                        Start Agent
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">🎉 Deployment Complete!</h3>
              <p className="text-gray-600">
                Your AI agents are now working to deliver measurable business results. Monitor their performance and
                optimize as needed.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{results.length}</div>
              <div className="text-sm text-gray-600">Active Agents</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
