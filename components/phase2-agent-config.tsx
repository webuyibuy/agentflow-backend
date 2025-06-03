"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  Rocket,
  AlertTriangle,
  Loader2,
  ListChecks,
  Clock,
  DollarSign,
  Target,
  TrendingUp,
  Users,
  ArrowRight,
  CheckCheck,
  Circle,
} from "lucide-react"
import type { GeneratedPlan, DeploymentResult } from "@/lib/systematic-flow-types"
import { deployAgentWithTasks, validatePlanForDeployment } from "@/app/onboarding/agent-config/phase2-actions"
import { useRouter } from "next/navigation"

interface Phase2AgentConfigProps {
  plan: GeneratedPlan
  onDeploymentComplete?: (result: DeploymentResult) => void
}

const Phase2AgentConfig: React.FC<Phase2AgentConfigProps> = ({ plan, onDeploymentComplete }) => {
  const router = useRouter()
  const [agentName, setAgentName] = useState(plan.title || "My Systematic Agent")
  const [agentDescription, setAgentDescription] = useState(plan.description || "")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    issues: string[]
    recommendations: string[]
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    validatePlan()
  }, [plan])

  const validatePlan = async () => {
    setIsValidating(true)
    try {
      const result = await validatePlanForDeployment(plan)
      setValidationResult(result)
    } catch (error) {
      console.error("Validation error:", error)
      setValidationResult({
        isValid: false,
        issues: ["Failed to validate plan"],
        recommendations: ["Please try again"],
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      const result = await deployAgentWithTasks(plan, agentName, agentDescription)
      setDeploymentResult(result)
      if (onDeploymentComplete) {
        onDeploymentComplete(result)
      }
    } catch (error) {
      console.error("Deployment error:", error)
      setDeploymentResult({
        success: false,
        error: error instanceof Error ? error.message : "Deployment failed",
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const goToDependencyBasket = () => {
    router.push("/dashboard/dependencies")
  }

  const goToAgentDashboard = () => {
    if (deploymentResult?.agentId) {
      router.push(`/dashboard/agents/${deploymentResult.agentId}`)
    } else {
      router.push("/dashboard")
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-red-50 border-red-200 text-red-800"
      case "medium":
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case "low":
        return "bg-green-50 border-green-200 text-green-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800"
    }
  }

  const isAgentNameValid = agentName.trim().length >= 3

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-purple-600" />
            Phase 2: Deployment & Task Distribution
          </CardTitle>
          <CardDescription>
            Review your strategic plan, configure your agent, and deploy with actionable tasks
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Plan Validation */}
      {isValidating ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
            <span>Validating plan for deployment...</span>
          </CardContent>
        </Card>
      ) : validationResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Plan Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.isValid ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Plan Ready for Deployment</AlertTitle>
                <AlertDescription>Your strategic plan has passed all validation checks.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Issues Found</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {validationResult.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
                {validationResult.recommendations.length > 0 && (
                  <Alert>
                    <AlertTitle>Recommendations</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2">
                        {validationResult.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Plan Overview */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Strategic Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Objectives</h4>
              <ul className="space-y-1">
                {plan.objectives.map((obj, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Success Metrics</h4>
              <ul className="space-y-1">
                {plan.successMetrics.map((metric, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    {metric}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Complexity</span>
                <Badge className={`ml-2 ${getPriorityColor(plan.complexity)}`}>{plan.complexity}</Badge>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Time to Value</span>
                <p className="text-sm">{plan.estimatedTimeToValue || "TBD"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Estimated Cost</span>
                <p className="text-sm flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {plan.estimatedCost || "TBD"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Phases</span>
                <p className="text-sm">{plan.timeline.length} phases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline & Resources */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-indigo-500" />
              Implementation Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plan.timeline.map((phase, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{phase.phase}</h4>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {phase.duration}
                      </Badge>
                      <Badge className={`text-xs ${getRiskColor(phase.riskLevel)}`}>{phase.riskLevel} risk</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="mb-1">
                      <strong>Tasks:</strong> {phase.tasks.length} tasks
                    </p>
                    <p>
                      <strong>Deliverables:</strong> {phase.deliverables.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-500" />
              Resources & Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Required Resources</h4>
              <div className="space-y-2">
                {plan.resources.map((resource, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{resource.name}</span>
                    <div className="flex gap-2">
                      <Badge variant={resource.configured ? "default" : "secondary"}>{resource.type}</Badge>
                      {resource.required && !resource.configured && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Dependencies</h4>
              <div className="space-y-2">
                {plan.dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{dep.name}</span>
                    <Badge
                      variant={
                        dep.status === "resolved" ? "default" : dep.status === "blocked" ? "destructive" : "secondary"
                      }
                    >
                      {dep.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Configuration */}
      {!deploymentResult && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Configuration</CardTitle>
            <CardDescription>Configure your agent details before deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="agentName" className="block text-sm font-medium text-gray-700 mb-1">
                Agent Name
              </label>
              <Input
                id="agentName"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Enter agent name"
              />
              {!isAgentNameValid && agentName.length > 0 && (
                <p className="text-sm text-red-600 mt-1">Agent name must be at least 3 characters long</p>
              )}
            </div>
            <div>
              <label htmlFor="agentDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Agent Description (Optional)
              </label>
              <Textarea
                id="agentDescription"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                placeholder="Describe your agent's purpose and capabilities"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deployment
          </CardTitle>
          <CardDescription>Deploy your agent and generate actionable tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {deploymentResult ? (
            <div className="space-y-4">
              {deploymentResult.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Deployment Successful!</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>Your agent has been deployed successfully!</p>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="font-medium">Agent ID:</p>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{deploymentResult.agentId}</code>
                      </div>
                      <div>
                        <p className="font-medium">Generated Tasks:</p>
                        <p className="text-sm">{deploymentResult.tasks?.length || 0} actionable tasks created</p>
                      </div>
                    </div>
                    {deploymentResult.warnings && deploymentResult.warnings.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-amber-600">Warnings:</p>
                        <ul className="list-disc list-inside text-sm text-amber-700">
                          {deploymentResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {deploymentResult.nextSteps && (
                      <div className="mt-3">
                        <p className="font-medium">Next Steps:</p>
                        <ul className="list-disc list-inside text-sm">
                          {deploymentResult.nextSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Deployment Failed</AlertTitle>
                  <AlertDescription>{deploymentResult.error}</AlertDescription>
                </Alert>
              )}

              {deploymentResult.success && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={(e) => {
                      e.preventDefault()
                      goToDependencyBasket()
                    }}
                    className="flex-1"
                  >
                    <ListChecks className="mr-2 h-4 w-4" />
                    View Tasks in Dependency Basket
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault()
                      goToAgentDashboard()
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Go to Agent Dashboard
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCheck className="h-4 w-4" />
                <AlertTitle>Ready for Deployment</AlertTitle>
                <AlertDescription>
                  Your agent configuration is complete and ready for deployment. This will:
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Create your AI agent with the configured settings</li>
                    <li>Generate actionable tasks based on your strategic plan</li>
                    <li>Set up dependencies and task relationships</li>
                    <li>Add tasks to your Dependency Basket for management</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Pre-Deployment Checklist:</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    {validationResult?.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    Plan validation passed
                  </li>
                  <li className="flex items-center gap-2">
                    {isAgentNameValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    Agent name configured
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Database connection ready
                  </li>
                </ul>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDeploy()
                  }}
                  disabled={isDeploying || !validationResult?.isValid || !isAgentNameValid}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying Agent...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy Agent & Generate Tasks
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Phase2AgentConfig
