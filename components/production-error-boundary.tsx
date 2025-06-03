"use client"

import type React from "react"
import { Component, type ErrorInfo, type ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import { errorHandler } from "@/lib/production-error-handler"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
  retryCount: number
}

export class ProductionErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to our production error handler
    const errorId = errorHandler.captureError(error, {
      component: "ErrorBoundary",
      action: "component_error",
      severity: "high",
      timestamp: new Date().toISOString(),
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount,
      },
    })

    this.setState({ errorId })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught an error:", error, errorInfo)
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
      }))
    }
  }

  handleGoHome = () => {
    window.location.href = "/dashboard"
  }

  handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message || "Unknown Error"}`)
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message}
Stack Trace: ${this.state.error?.stack}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
    `)

    window.open(`mailto:support@agentflow.com?subject=${subject}&body=${body}`)
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.errorId && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    Error ID: <code className="text-sm">{this.state.errorId}</code>
                  </AlertDescription>
                </Alert>
              )}

              {process.env.NODE_ENV === "development" && this.state.error && (
                <Alert>
                  <AlertDescription>
                    <details>
                      <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                      <pre className="mt-2 text-xs overflow-auto">
                        {this.state.error.message}
                        {"\n\n"}
                        {this.state.error.stack}
                      </pre>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col space-y-2">
                {this.state.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}

                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>

                <Button variant="ghost" onClick={this.handleReportBug} className="w-full">
                  <Bug className="mr-2 h-4 w-4" />
                  Report Bug
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500">
                If this problem persists, please contact our support team.
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ProductionErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ProductionErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}
