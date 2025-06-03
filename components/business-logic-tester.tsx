"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Play, RefreshCw } from "lucide-react"

interface ValidationResult {
  component: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: any
}

interface ValidationSummary {
  total: number
  passed: number
  failed: number
  warnings: number
}

interface ValidationResponse {
  success: boolean
  summary: ValidationSummary
  results: ValidationResult[]
  timestamp: string
  error?: string
}

export default function BusinessLogicTester() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<ValidationResponse | null>(null)

  const runValidation = async () => {
    setIsRunning(true)
    try {
      const response = await fetch("/api/validate-business-logic")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({
        success: false,
        summary: { total: 0, passed: 0, failed: 1, warnings: 0 },
        results: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: "default" as const,
      fail: "destructive" as const,
      warning: "secondary" as const,
    }
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status.toUpperCase()}</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Business Logic Validation
          </CardTitle>
          <CardDescription>
            Comprehensive testing of all application functionalities including LLM integration, agent management, and
            data flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runValidation} disabled={isRunning} className="w-full">
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running Validation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Full Validation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Validation Summary</CardTitle>
              <CardDescription>Completed at {new Date(results.timestamp).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              {results.success ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.summary.total}</div>
                    <div className="text-sm text-gray-600">Total Tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{results.summary.passed}</div>
                    <div className="text-sm text-gray-600">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{results.summary.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{results.summary.warnings}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>Validation failed: {results.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Detailed Results */}
          {results.success && results.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Results</CardTitle>
                <CardDescription>Individual component validation results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.results.map((result, index) => (
                    <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(result.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{result.component}</h4>
                            {getStatusBadge(result.status)}
                          </div>
                          <p className="text-sm text-gray-600">{result.message}</p>
                          {result.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer">View Details</summary>
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
