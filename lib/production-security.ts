import { getSupabaseFromServer } from "@/lib/supabase/server"
import { errorHandler } from "@/lib/production-error-handler"

export interface SecurityEvent {
  type: "suspicious_activity" | "rate_limit_exceeded" | "unauthorized_access" | "data_breach_attempt"
  severity: "low" | "medium" | "high" | "critical"
  userId?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
  timestamp: string
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export class ProductionSecurity {
  private static instance: ProductionSecurity
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>()
  private suspiciousIPs = new Set<string>()
  private securityEvents: SecurityEvent[] = []

  static getInstance(): ProductionSecurity {
    if (!ProductionSecurity.instance) {
      ProductionSecurity.instance = new ProductionSecurity()
    }
    return ProductionSecurity.instance
  }

  // Rate limiting
  checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 },
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = `rate_limit_${identifier}`
    const existing = this.rateLimitStore.get(key)

    if (!existing || now > existing.resetTime) {
      // Reset or create new window
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      }
    }

    if (existing.count >= config.maxRequests) {
      this.logSecurityEvent({
        type: "rate_limit_exceeded",
        severity: "medium",
        details: {
          identifier,
          attempts: existing.count,
          window_ms: config.windowMs,
          max_requests: config.maxRequests,
        },
        timestamp: new Date().toISOString(),
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
      }
    }

    // Increment counter
    existing.count++
    this.rateLimitStore.set(key, existing)

    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime,
    }
  }

  // Input validation and sanitization
  validateAndSanitizeInput(input: any, rules: ValidationRules): { valid: boolean; sanitized?: any; errors?: string[] } {
    const errors: string[] = []
    let sanitized = input

    try {
      // Type validation
      if (rules.type && typeof input !== rules.type) {
        errors.push(`Expected ${rules.type}, got ${typeof input}`)
      }

      // String validations
      if (rules.type === "string" && typeof input === "string") {
        // Length validation
        if (rules.minLength && input.length < rules.minLength) {
          errors.push(`Minimum length is ${rules.minLength}`)
        }
        if (rules.maxLength && input.length > rules.maxLength) {
          errors.push(`Maximum length is ${rules.maxLength}`)
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(input)) {
          errors.push("Invalid format")
        }

        // Sanitization
        if (rules.sanitize) {
          sanitized = this.sanitizeString(input, rules.sanitize)
        }
      }

      // Number validations
      if (rules.type === "number" && typeof input === "number") {
        if (rules.min !== undefined && input < rules.min) {
          errors.push(`Minimum value is ${rules.min}`)
        }
        if (rules.max !== undefined && input > rules.max) {
          errors.push(`Maximum value is ${rules.max}`)
        }
      }

      // Array validations
      if (rules.type === "object" && Array.isArray(input)) {
        if (rules.maxItems && input.length > rules.maxItems) {
          errors.push(`Maximum ${rules.maxItems} items allowed`)
        }
      }

      return {
        valid: errors.length === 0,
        sanitized: errors.length === 0 ? sanitized : undefined,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      return {
        valid: false,
        errors: ["Validation error occurred"],
      }
    }
  }

  private sanitizeString(input: string, options: SanitizeOptions): string {
    let sanitized = input

    if (options.trim) {
      sanitized = sanitized.trim()
    }

    if (options.removeHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, "")
    }

    if (options.escapeHtml) {
      sanitized = sanitized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
    }

    if (options.removeSpecialChars) {
      sanitized = sanitized.replace(/[^\w\s-_.@]/g, "")
    }

    return sanitized
  }

  // SQL injection detection
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\()/i,
      /(\b(WAITFOR|DELAY)\b)/i,
    ]

    return sqlPatterns.some((pattern) => pattern.test(input))
  }

  // XSS detection
  detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    ]

    return xssPatterns.some((pattern) => pattern.test(input))
  }

  // Authentication security
  async validateSession(sessionToken: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      const supabase = getSupabaseFromServer()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        this.logSecurityEvent({
          type: "unauthorized_access",
          severity: "medium",
          details: {
            session_token: sessionToken.substring(0, 10) + "...",
            error: error?.message,
          },
          timestamp: new Date().toISOString(),
        })

        return { valid: false, error: "Invalid session" }
      }

      return { valid: true, userId: user.id }
    } catch (error) {
      errorHandler.captureAuthError(error as Error)
      return { valid: false, error: "Session validation failed" }
    }
  }

  // Security event logging
  logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event)

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000)
    }

    // Log critical events immediately
    if (event.severity === "critical" || event.severity === "high") {
      console.error("Security Event:", event)
      errorHandler.captureError(new Error(`Security event: ${event.type}`), {
        component: "security",
        action: event.type,
        severity: event.severity === "critical" ? "critical" : "high",
        timestamp: event.timestamp,
        metadata: event.details,
      })
    }
  }

  // Get security report
  getSecurityReport(since?: string): {
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    suspiciousIPs: string[]
    recentEvents: SecurityEvent[]
  } {
    let events = this.securityEvents

    if (since) {
      const sinceDate = new Date(since)
      events = events.filter((e) => new Date(e.timestamp) >= sinceDate)
    }

    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}

    events.forEach((event) => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
    })

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      suspiciousIPs: Array.from(this.suspiciousIPs),
      recentEvents: events.slice(-10),
    }
  }
}

// Types
interface ValidationRules {
  type?: "string" | "number" | "boolean" | "object"
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  maxItems?: number
  sanitize?: SanitizeOptions
}

interface SanitizeOptions {
  trim?: boolean
  removeHtml?: boolean
  escapeHtml?: boolean
  removeSpecialChars?: boolean
}

// Global security instance
export const security = ProductionSecurity.getInstance()
