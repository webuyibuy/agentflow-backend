import { ProductionDatabase } from "@/lib/production-database"
import { sendSlackNotification } from "@/lib/slack-notifications"

export interface ErrorContext {
  userId?: string
  action?: string
  component?: string
  url?: string
  userAgent?: string
  timestamp: string
  severity: "low" | "medium" | "high" | "critical"
  metadata?: Record<string, any>
}

export interface ErrorReport {
  id: string
  error: Error
  context: ErrorContext
  stackTrace?: string
  handled: boolean
}

export class ProductionErrorHandler {
  private static instance: ProductionErrorHandler
  private db: ProductionDatabase
  private errorQueue: ErrorReport[] = []
  private isProcessing = false

  static getInstance(): ProductionErrorHandler {
    if (!ProductionErrorHandler.instance) {
      ProductionErrorHandler.instance = new ProductionErrorHandler()
    }
    return ProductionErrorHandler.instance
  }

  constructor() {
    this.db = ProductionDatabase.getInstance()
    this.setupGlobalErrorHandlers()
    this.startErrorProcessor()
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        this.captureError(new Error(event.reason), {
          component: "global",
          action: "unhandled_promise_rejection",
          severity: "high",
          timestamp: new Date().toISOString(),
          metadata: { reason: event.reason },
        })
      })

      // Handle JavaScript errors
      window.addEventListener("error", (event) => {
        this.captureError(event.error || new Error(event.message), {
          component: "global",
          action: "javascript_error",
          severity: "medium",
          timestamp: new Date().toISOString(),
          url: event.filename,
          metadata: {
            line: event.lineno,
            column: event.colno,
            message: event.message,
          },
        })
      })
    }
  }

  captureError(error: Error, context: Partial<ErrorContext>): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const errorReport: ErrorReport = {
      id: errorId,
      error,
      context: {
        timestamp: new Date().toISOString(),
        severity: "medium",
        ...context,
      },
      stackTrace: error.stack,
      handled: false,
    }

    this.errorQueue.push(errorReport)
    this.processErrorQueue()

    return errorId
  }

  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) return

    this.isProcessing = true

    try {
      while (this.errorQueue.length > 0) {
        const errorReport = this.errorQueue.shift()
        if (errorReport) {
          await this.processError(errorReport)
        }
      }
    } catch (processingError) {
      console.error("Error processing error queue:", processingError)
    } finally {
      this.isProcessing = false
    }
  }

  private async processError(errorReport: ErrorReport): Promise<void> {
    try {
      // Log to database
      await this.logErrorToDatabase(errorReport)

      // Send notifications for critical errors
      if (errorReport.context.severity === "critical" || errorReport.context.severity === "high") {
        await this.sendErrorNotification(errorReport)
      }

      // Track user activity if userId is available
      if (errorReport.context.userId) {
        await this.db.trackUserActivity(errorReport.context.userId, "error_occurred", "error", errorReport.id, {
          error_message: errorReport.error.message,
          severity: errorReport.context.severity,
          component: errorReport.context.component,
          action: errorReport.context.action,
        })
      }

      errorReport.handled = true
    } catch (error) {
      console.error("Failed to process error report:", error)
    }
  }

  private async logErrorToDatabase(errorReport: ErrorReport): Promise<void> {
    try {
      // In a real production environment, you might want to create an errors table
      // For now, we'll use the user_activity table with error type
      if (errorReport.context.userId) {
        await this.db.trackUserActivity(errorReport.context.userId, "system_error", "error", errorReport.id, {
          error_id: errorReport.id,
          error_message: errorReport.error.message,
          error_stack: errorReport.stackTrace,
          severity: errorReport.context.severity,
          component: errorReport.context.component,
          action: errorReport.context.action,
          url: errorReport.context.url,
          user_agent: errorReport.context.userAgent,
          metadata: errorReport.context.metadata,
        })
      }
    } catch (error) {
      console.error("Failed to log error to database:", error)
    }
  }

  private async sendErrorNotification(errorReport: ErrorReport): Promise<void> {
    try {
      const message = `🚨 *${errorReport.context.severity.toUpperCase()} ERROR*

*Component:* ${errorReport.context.component || "Unknown"}
*Action:* ${errorReport.context.action || "Unknown"}
*Error:* ${errorReport.error.message}
*User:* ${errorReport.context.userId || "Anonymous"}
*Time:* ${errorReport.context.timestamp}
*Error ID:* ${errorReport.id}

${errorReport.stackTrace ? `\`\`\`${errorReport.stackTrace.substring(0, 500)}...\`\`\`` : ""}`

      await sendSlackNotification(message)
    } catch (error) {
      console.error("Failed to send error notification:", error)
    }
  }

  private startErrorProcessor(): void {
    // Process errors every 5 seconds
    setInterval(() => {
      this.processErrorQueue()
    }, 5000)
  }

  // Utility methods for common error scenarios
  captureUserError(error: Error, userId: string, action: string, component: string): string {
    return this.captureError(error, {
      userId,
      action,
      component,
      severity: "medium",
      timestamp: new Date().toISOString(),
    })
  }

  captureAPIError(error: Error, endpoint: string, userId?: string): string {
    return this.captureError(error, {
      userId,
      action: "api_call",
      component: "api",
      severity: "high",
      timestamp: new Date().toISOString(),
      metadata: { endpoint },
    })
  }

  captureAuthError(error: Error, userId?: string): string {
    return this.captureError(error, {
      userId,
      action: "authentication",
      component: "auth",
      severity: "high",
      timestamp: new Date().toISOString(),
    })
  }

  captureDatabaseError(error: Error, operation: string, userId?: string): string {
    return this.captureError(error, {
      userId,
      action: operation,
      component: "database",
      severity: "critical",
      timestamp: new Date().toISOString(),
    })
  }
}

// Global error handler instance
export const errorHandler = ProductionErrorHandler.getInstance()
