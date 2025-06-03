export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  userId?: string
}

export class ProductionLogger {
  private static instance: ProductionLogger
  private logs: LogEntry[] = []
  private maxLogs = 1000

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger()
    }
    return ProductionLogger.instance
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, userId?: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId,
    }

    this.logs.push(entry)

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output in development
    if (process.env.NODE_ENV === "development") {
      const logMethod =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : level === "info"
              ? console.info
              : console.log

      logMethod(`[${level.toUpperCase()}] ${message}`, context || "")
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === "production" && (level === "error" || level === "warn")) {
      this.sendToExternalLogger(entry)
    }
  }

  private async sendToExternalLogger(entry: LogEntry) {
    try {
      // In a real production environment, send to your logging service
      // For now, we'll just store it
      console.log("Production log:", entry)
    } catch (error) {
      console.error("Failed to send log to external service:", error)
    }
  }

  debug(message: string, context?: Record<string, any>, userId?: string) {
    this.log("debug", message, context, userId)
  }

  info(message: string, context?: Record<string, any>, userId?: string) {
    this.log("info", message, context, userId)
  }

  warn(message: string, context?: Record<string, any>, userId?: string) {
    this.log("warn", message, context, userId)
  }

  error(message: string, context?: Record<string, any>, userId?: string) {
    this.log("error", message, context, userId)
  }

  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.logs

    if (level) {
      filtered = filtered.filter((log) => log.level === level)
    }

    if (limit) {
      filtered = filtered.slice(-limit)
    }

    return filtered
  }

  clearLogs() {
    this.logs = []
  }
}

// Global logger instance
export const logger = ProductionLogger.getInstance()
