export class ProductionErrorHandler {
  private static instance: ProductionErrorHandler
  private errorQueue: ErrorReport[] = []
  private isProcessing = false

  static getInstance(): ProductionErrorHandler {
    if (!ProductionErrorHandler.instance) {
      ProductionErrorHandler.instance = new ProductionErrorHandler()
    }
    return ProductionErrorHandler.instance
  }

  captureError(error: Error, context: ErrorContext): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const errorReport: ErrorReport = {
      id: errorId,
      error,
      context: {
        timestamp: new Date().toISOString(),
        severity: context.severity || "medium",
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
      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.error(`[${errorReport.context.severity.toUpperCase()}] ${errorReport.error.message}`, {
          context: errorReport.context,
          stack: errorReport.stackTrace,
        })
      }

      // In production, you would send to external logging service
      if (process.env.NODE_ENV === "production") {
        await this.sendToExternalLogger(errorReport)
      }

      errorReport.handled = true
    } catch (error) {
      console.error("Failed to process error report:", error)
    }
  }

  private async sendToExternalLogger(errorReport: ErrorReport): Promise<void> {
    // Implementation for external logging service
    console.log("Production error logged:", errorReport.id)
  }
}

export interface ErrorContext {
  userId?: string
  action?: string
  component?: string
  url?: string
  severity?: "low" | "medium" | "high" | "critical"
  metadata?: Record<string, any>
  timestamp?: string
}

export interface ErrorReport {
  id: string
  error: Error
  context: ErrorContext
  stackTrace?: string
  handled: boolean
}

export const errorHandler = ProductionErrorHandler.getInstance()
