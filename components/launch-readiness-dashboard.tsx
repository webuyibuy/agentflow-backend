"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Rocket,
  RefreshCw,
  Clock,
  Shield,
  Zap,
  Users,
  Briefcase,
  BarChart3,
} from "lucide-react"
import { LaunchReadinessChecker, type LaunchReadinessResult } from "@/lib/launch-readiness-checker"

export default function LaunchReadinessDashboard() {
  const [result, setResult] = useState<LaunchReadinessResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const runCheck = async () => {
    setLoading(true)
    try {
      const checker = LaunchReadinessChecker.getInstance()
      const checkResult = await checker.performComprehensiveCheck()
      setResult(checkResult)
      setLastChecked(new Date())
    } catch (error) {
      console.error("Launch readiness check failed:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runCheck()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass":
        return "text-green-600 bg-green-50 border-green-200"
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "fail":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return ""
    }
  }

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "text-green-600"
      case "needs_attention":
        return "text-yellow-600"
      case "not_ready":
        return "text-red-600"
      default:
        return ""
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "infrastructure":
        return <BarChart3 className="h-5 w-5" />
      case "security":
        return <Shield className="h-5 w-5" />
      case "performance":
        return <Zap className="h-5 w-5" />
      case "user_experience":
        return <Users className="h-5 w-5" />
      case "business_logic":
        return <Briefcase className="h-5 w-5" />
      case "monitoring":
        return <BarChart3 className="h-5 w-5" />
      default:
        return null
    }
  }

  if (loading && !result) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <span>Running comprehensive launch readiness check...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚀 Launch Readiness</h1>
          <p className="text-gray-600">Comprehensive pre-launch validation and health check</p>
        </div>
        <div className="flex items-center space-x-2">
          {lastChecked && (
            <span className="text-sm text-gray-500">Last checked: {lastChecked.toLocaleTimeString()}</span>
          )}
          <Button onClick={runCheck} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Check
          </Button>
        </div>
      </div>

      {result && (
        <>
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-6 w-6" />
                Overall Launch Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${getOverallStatusColor(result.overall)}`}>
                    {result.overall.replace("_", " ").toUpperCase()}
                  </div>
                  <Badge variant={result.overall === "ready" ? "default" : "destructive"}>
                    Score: {result.score}/100
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Est. fix time: {result.estimatedFixTime}
                </div>
              </div>

              <Progress value={result.score} className="mb-4" />

              {result.overall !== "ready" && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    {result.criticalIssues.length > 0
                      ? `${result.criticalIssues.length} critical issues must be resolved before launch.`
                      : "Some improvements are recommended before launch."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(result.categories).map(([categoryName, category]) => (
              <Card key={categoryName} className={`border-2 ${getStatusColor(category.status)}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {getCategoryIcon(categoryName)}
                    {categoryName.replace("_", " ").toUpperCase()}
                    {getStatusIcon(category.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Score</span>
                      <span className="text-sm font-bold">{category.score}/100</span>
                    </div>
                    <Progress value={category.score} className="h-2" />

                    {category.issues.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-600 mb-1">Issues:</div>
                        <ul className="text-xs space-y-1">
                          {category.issues.slice(0, 3).map((issue, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                          {category.issues.length > 3 && (
                            <li className="text-gray-500">+{category.issues.length - 3} more issues</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Critical Issues */}
          {result.criticalIssues.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  Critical Issues ({result.criticalIssues.length})
                </CardTitle>
                <CardDescription>These issues must be resolved before launch</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.criticalIssues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Recommendations
              </CardTitle>
              <CardDescription>Follow these recommendations to ensure a successful launch</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Launch Button */}
          {result.overall === "ready" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-700 mb-2">Ready for Launch! 🚀</h3>
                  <p className="text-green-600 mb-4">
                    All systems are operational and ready for production deployment.
                  </p>
                  <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    <Rocket className="mr-2 h-5 w-5" />
                    Deploy to Production
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
