import { ProductionDatabase } from "@/lib/production-database"

export interface PerformanceMetric {
  name: string
  value: number
  unit: "ms" | "bytes" | "count" | "percentage"
  timestamp: string
  userId?: string
  metadata?: Record<string, any>
}

export interface PerformanceReport {
  pageLoad: number
  apiCalls: Array<{ endpoint: string; duration: number; status: number }>
  databaseQueries: Array<{ query: string; duration: number }>
  memoryUsage: number
  renderTime: number
  userInteractions: Array<{ action: string; duration: number }>
}

export class ProductionPerformanceMonitor {
  private static instance: ProductionPerformanceMonitor
  private db: ProductionDatabase
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []

  static getInstance(): ProductionPerformanceMonitor {
    if (!ProductionPerformanceMonitor.instance) {
      ProductionPerformanceMonitor.instance = new ProductionPerformanceMonitor()
    }
    return ProductionPerformanceMonitor.instance
  }

  constructor() {
    this.db = ProductionDatabase.getInstance()
    this.setupPerformanceObservers()
    this.startMetricsCollection()
  }

  private setupPerformanceObservers(): void {
    if (typeof window === "undefined") return

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordMetric("page_load_time", navEntry.loadEventEnd - navEntry.navigationStart, "ms")
            this.recordMetric("dom_content_loaded", navEntry.domContentLoadedEventEnd - navEntry.navigationStart, "ms")
            this.recordMetric("first_paint", navEntry.loadEventStart - navEntry.navigationStart, "ms")
          }
        }
      })
      navObserver.observe({ entryTypes: ["navigation"] })
      this.observers.push(navObserver)

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const resourceEntry = entry as PerformanceResourceTiming
            this.recordMetric(
              "resource_load_time",
              resourceEntry.responseEnd - resourceEntry.requestStart,
              "ms",
              undefined,
              {
                resource_name: resourceEntry.name,
                resource_type: resourceEntry.initiatorType,
              },
            )
          }
        }
      })
      resourceObserver.observe({ entryTypes: ["resource"] })
      this.observers.push(resourceObserver)

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric("largest_contentful_paint", entry.startTime, "ms")
        }
      })
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] })
      this.observers.push(lcpObserver)

      // Observe first input delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric("first_input_delay", entry.processingStart - entry.startTime, "ms")
        }
      })
      fidObserver.observe({ entryTypes: ["first-input"] })
      this.observers.push(fidObserver)
    } catch (error) {
      console.warn("Performance observers not supported:", error)
    }
  }

  recordMetric(
    name: string,
    value: number,
    unit: "ms" | "bytes" | "count" | "percentage",
    userId?: string,
    metadata?: Record<string, any>,
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      userId,
      metadata,
    }

    this.metrics.push(metric)

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  async measureAsyncOperation<T>(operationName: string, operation: () => Promise<T>, userId?: string): Promise<T> {
    const startTime = performance.now()
    try {
      const result = await operation()
      const duration = performance.now() - startTime
      this.recordMetric(operationName, duration, "ms", userId)
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      this.recordMetric(`${operationName}_error`, duration, "ms", userId, {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    }
  }

  measureSyncOperation<T>(operationName: string, operation: () => T, userId?: string): T {
    const startTime = performance.now()
    try {
      const result = operation()
      const duration = performance.now() - startTime
      this.recordMetric(operationName, duration, "ms", userId)
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      this.recordMetric(`${operationName}_error`, duration, "ms", userId, {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    }
  }

  getMetrics(filterBy?: { name?: string; userId?: string; since?: string }): PerformanceMetric[] {
    let filtered = [...this.metrics]

    if (filterBy?.name) {
      filtered = filtered.filter((m) => m.name === filterBy.name)
    }

    if (filterBy?.userId) {
      filtered = filtered.filter((m) => m.userId === filterBy.userId)
    }

    if (filterBy?.since) {
      const sinceDate = new Date(filterBy.since)
      filtered = filtered.filter((m) => new Date(m.timestamp) >= sinceDate)
    }

    return filtered
  }

  getPerformanceReport(): PerformanceReport {
    const now = Date.now()
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()

    const recentMetrics = this.getMetrics({ since: oneHourAgo })

    return {
      pageLoad: this.getAverageMetric(recentMetrics, "page_load_time"),
      apiCalls: this.getAPICallMetrics(recentMetrics),
      databaseQueries: this.getDatabaseMetrics(recentMetrics),
      memoryUsage: this.getMemoryUsage(),
      renderTime: this.getAverageMetric(recentMetrics, "render_time"),
      userInteractions: this.getUserInteractionMetrics(recentMetrics),
    }
  }

  private getAverageMetric(metrics: PerformanceMetric[], name: string): number {
    const filtered = metrics.filter((m) => m.name === name)
    if (filtered.length === 0) return 0
    return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length
  }

  private getAPICallMetrics(
    metrics: PerformanceMetric[],
  ): Array<{ endpoint: string; duration: number; status: number }> {
    return metrics
      .filter((m) => m.name.startsWith("api_call"))
      .map((m) => ({
        endpoint: m.metadata?.endpoint || "unknown",
        duration: m.value,
        status: m.metadata?.status || 200,
      }))
  }

  private getDatabaseMetrics(metrics: PerformanceMetric[]): Array<{ query: string; duration: number }> {
    return metrics
      .filter((m) => m.name.startsWith("database"))
      .map((m) => ({
        query: m.metadata?.query || "unknown",
        duration: m.value,
      }))
  }

  private getMemoryUsage(): number {
    if (typeof window !== "undefined" && "memory" in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  private getUserInteractionMetrics(metrics: PerformanceMetric[]): Array<{ action: string; duration: number }> {
    return metrics
      .filter((m) => m.name.startsWith("user_interaction"))
      .map((m) => ({
        action: m.metadata?.action || "unknown",
        duration: m.value,
      }))
  }

  private startMetricsCollection(): void {
    // Send metrics to database every 30 seconds
    setInterval(async () => {
      await this.flushMetrics()
    }, 30000)
  }

  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return

    try {
      // In a real production environment, you might want to batch send these to your analytics service
      // For now, we'll just log them
      console.log(`Flushing ${this.metrics.length} performance metrics`)

      // Clear metrics after flushing
      this.metrics = []
    } catch (error) {
      console.error("Failed to flush performance metrics:", error)
    }
  }

  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []
  }
}

// Global performance monitor instance
export const performanceMonitor = ProductionPerformanceMonitor.getInstance()
