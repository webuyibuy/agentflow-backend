"use client"

import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { errorHandler } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture error with context
    const errorId = errorHandler.captureError(error, {
      component: "ErrorBoundary",
      action: "component_error",
      severity: "high",
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    })

    this.setState({ errorId })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-sm text-gray-600">
                <p>An unexpected error occurred. Our team has been notified.</p>
                {this.state.errorId && (
                  <p className="mt-2 font-mono text-xs bg-gray-100 p-2 rounded">Error ID: {this.state.errorId}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">Error Details (Development)</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, fallback?: ReactNode) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: any) => {
    const errorId = errorHandler.captureError(error, {
      component: "useErrorHandler",
      action: "async_error",
      severity: "medium",
      metadata: context,
    })

    // You could also show a toast notification here
    console.error(`Error captured with ID: ${errorId}`, error)

    return errorId
  }, [])

  return handleError
}
