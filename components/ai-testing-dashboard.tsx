"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertTriangle, Loader2, Play, RefreshCw, Zap, Brain, Settings } from "lucide-react"
import { aiValidator, type ValidationResult } from "@/lib/ai-system-validator"

export default function AITestingDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [quickHealthStatus, setQuickHealthStatus] = useState<{ healthy: boolean; message: string } | null>(null)

  const runFullValidation = async () => {
    setIsLoading(true)
    try {
      const result = await aiValidator.validateForLaunch()
      setValidationResult(result)
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const runQuickCheck = async () => {
    try {
      const result = await aiValidator.quickHealthCheck()
      setQuickHealthStatus(result)
    } catch (error) {
      console.error("Quick check failed:", error)
      setQuickHealthStatus({
        healthy: false,
        message: "Quick check failed",
      })
    }
  }

  useEffect(() => {
    runQuickCheck()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI System Testing</h1>
          <p className="text-muted-foreground">Validate AI functions before launch</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runQuickCheck} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Quick Check
          </Button>
          <Button onClick={runFullValidation} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Full Test
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Health Status */}
      {quickHealthStatus && (
        <Alert className={quickHealthStatus.healthy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {quickHealthStatus.healthy ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle>{quickHealthStatus.healthy ? "AI System Healthy" : "AI System Issues"}</AlertTitle>
          <AlertDescription>{quickHealthStatus.message}</AlertDescription>
        </Alert>
      )}

      {/* Validation Results */}
      {validationResult && (
        <div className="space-y-6">
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validationResult.isReady ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Launch Readiness: {validationResult.isReady ? "READY" : "NOT READY"}
              </CardTitle>
              <CardDescription>
                Overall AI system score: {validationResult.score}/100
                <Progress value={validationResult.score} className="mt-2" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {validationResult.testResults.filter((r) => r.status === "success").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Passing Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {validationResult.testResults.filter((r) => r.status === "warning").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {validationResult.testResults.filter((r) => r.status === "error").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical Issues</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Issues */}
          {validationResult.criticalIssues.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Critical Issues - Must Fix Before Launch</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {validationResult.criticalIssues.map((issue, index) => (
                    <li key={index} className="text-sm">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Warnings - Recommended Fixes</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Detailed Test Results */}
          <Tabs defaultValue="results" className="w-full">
            <TabsList>
              <TabsTrigger value="results">Test Results</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="space-y-4">
              {validationResult.testResults.map((test, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(test.status)}
                        {test.functionName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(test.status)}>
                          {test.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{test.executionTime}ms</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
                    {test.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {validationResult.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* No Results Yet */}
      {!validationResult && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Test AI Functions</h3>
            <p className="text-muted-foreground text-center mb-4">
              Run a comprehensive test to validate all AI functions before launch
            </p>
            <Button onClick={runFullValidation}>
              <Zap className="mr-2 h-4 w-4" />
              Start AI Testing
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
