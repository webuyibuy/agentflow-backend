"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Brain, Rocket, CheckCircle, ArrowRight, AlertTriangle } from "lucide-react"
import type { GeneratedPlan, DeploymentResult } from "@/lib/systematic-flow-types"
import Phase1AgentConfig from "@/components/phase1-agent-config"
import Phase2AgentConfig from "@/components/phase2-agent-config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SystematicAgentFlowProps {
  goalPrimer: string
}

const SystematicAgentFlow: React.FC<SystematicAgentFlowProps> = ({ goalPrimer }) => {
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1)
  const [phase1Plan, setPhase1Plan] = useState<GeneratedPlan | null>(null)
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePhase1Complete = (plan: GeneratedPlan) => {
    try {
      console.log("Phase 1 completed, transitioning to Phase 2 with plan:", plan.id)
      setPhase1Plan(plan)
      setCurrentPhase(2)
      setError(null)

      // Scroll to top for better UX
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    } catch (err) {
      setError("Failed to transition to Phase 2")
      console.error("Phase 1 completion error:", err)
    }
  }

  const handleDeploymentComplete = (result: DeploymentResult) => {
    setDeploymentResult(result)
  }

  const getOverallProgress = () => {
    if (deploymentResult?.success) return 100
    if (currentPhase === 2) return 75
    if (phase1Plan) return 50
    return 25
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Overall Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {currentPhase === 1 ? (
              <Brain className="h-6 w-6 text-blue-600" />
            ) : (
              <Rocket className="h-6 w-6 text-purple-600" />
            )}
            Systematic Agent Configuration
            <Badge variant="outline" className="ml-auto">
              Phase {currentPhase} of 2
            </Badge>
          </CardTitle>
          <CardDescription>
            {currentPhase === 1
              ? "Phase 1: Intelligent Configuration & Strategic Planning"
              : "Phase 2: Deployment & Actionable Task Distribution"}
          </CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <Progress value={getOverallProgress()} className="flex-1" />
            <span className="text-sm font-medium">{Math.round(getOverallProgress())}%</span>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Phase Navigation */}
      <div className="flex items-center justify-center gap-8">
        <div className="flex items-center gap-3">
          {phase1Plan ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : currentPhase === 1 ? (
            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-white" />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full bg-gray-300" />
          )}
          <div>
            <div className="font-medium text-sm">Phase 1</div>
            <div className="text-xs text-gray-500">Strategic Planning</div>
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-gray-400" />

        <div className="flex items-center gap-3">
          {deploymentResult?.success ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : currentPhase === 2 ? (
            <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-white" />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full bg-gray-300" />
          )}
          <div>
            <div className="font-medium text-sm">Phase 2</div>
            <div className="text-xs text-gray-500">Deployment & Tasks</div>
          </div>
        </div>
      </div>

      {/* Phase Content */}
      {currentPhase === 1 && <Phase1AgentConfig goalPrimer={goalPrimer} onPhase1Complete={handlePhase1Complete} />}

      {currentPhase === 2 && phase1Plan && (
        <Phase2AgentConfig plan={phase1Plan} onDeploymentComplete={handleDeploymentComplete} />
      )}
    </div>
  )
}

export default SystematicAgentFlow
