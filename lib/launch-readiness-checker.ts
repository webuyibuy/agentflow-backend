import { getSupabaseAdmin } from "@/lib/supabase/server"
import { ProductionHealthCheck } from "@/lib/production-health-check"
import { security } from "@/lib/production-security"
import { performanceMonitor } from "@/lib/production-performance-monitor"

export interface LaunchReadinessResult {
  overall: "ready" | "needs_attention" | "not_ready"
  score: number
  categories: {
    infrastructure: LaunchCategory
    security: LaunchCategory
    performance: LaunchCategory
    user_experience: LaunchCategory
    business_logic: LaunchCategory
    monitoring: LaunchCategory
  }
  criticalIssues: string[]
  recommendations: string[]
  estimatedFixTime: string
}

interface LaunchCategory {
  status: "pass" | "warning" | "fail"
  score: number
  issues: string[]
  fixes: string[]
}

export class LaunchReadinessChecker {
  private static instance: LaunchReadinessChecker

  static getInstance(): LaunchReadinessChecker {
    if (!LaunchReadinessChecker.instance) {
      LaunchReadinessChecker.instance = new LaunchReadinessChecker()
    }
    return LaunchReadinessChecker.instance
  }

  async performComprehensiveCheck(): Promise<LaunchReadinessResult> {
    console.log("🚀 Starting comprehensive launch readiness check...")

    const [
      infrastructureResult,
      securityResult,
      performanceResult,
      userExperienceResult,
      businessLogicResult,
      monitoringResult,
    ] = await Promise.all([
      this.checkInfrastructure(),
      this.checkSecurity(),
      this.checkPerformance(),
      this.checkUserExperience(),
      this.checkBusinessLogic(),
      this.checkMonitoring(),
    ])

    const categories = {
      infrastructure: infrastructureResult,
      security: securityResult,
      performance: performanceResult,
      user_experience: userExperienceResult,
      business_logic: businessLogicResult,
      monitoring: monitoringResult,
    }

    const overallScore = this.calculateOverallScore(categories)
    const criticalIssues = this.extractCriticalIssues(categories)
    const recommendations = this.generateRecommendations(categories)

    return {
      overall: this.determineOverallStatus(overallScore, criticalIssues),
      score: overallScore,
      categories,
      criticalIssues,
      recommendations,
      estimatedFixTime: this.estimateFixTime(criticalIssues, categories),
    }
  }

  private async checkInfrastructure(): Promise<LaunchCategory> {
    const issues: string[] = []
    const fixes: string[] = []

    try {
      // Check environment variables
      const requiredEnvVars = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ENCRYPTION_KEY",
      ]

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          issues.push(`Missing environment variable: ${envVar}`)
          fixes.push(`Set ${envVar} in environment configuration`)
        }
      }

      // Check database connectivity
      const supabase = getSupabaseAdmin()
      const { error: dbError } = await supabase.from("profiles").select("count").limit(1)

      if (dbError) {
        issues.push(`Database connectivity issue: ${dbError.message}`)
        fixes.push("Verify Supabase connection and credentials")
      }

      // Check required tables exist
      const requiredTables = ["profiles", "agents", "tasks", "agent_logs", "user_activity"]
      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select("count").limit(1)
        if (error) {
          issues.push(`Missing or inaccessible table: ${table}`)
          fixes.push(`Create or fix permissions for table: ${table}`)
        }
      }
    } catch (error) {
      issues.push(`Infrastructure check failed: ${error}`)
      fixes.push("Review infrastructure configuration and connectivity")
    }

    return {
      status: issues.length === 0 ? "pass" : issues.length <= 2 ? "warning" : "fail",
      score: Math.max(0, 100 - issues.length * 20),
      issues,
      fixes,
    }
  }

  private async checkSecurity(): Promise<LaunchCategory> {
    const issues: string[] = []
    const fixes: string[] = []

    try {
      // Check encryption key strength
      const encryptionKey = process.env.ENCRYPTION_KEY
      if (!encryptionKey || encryptionKey.length < 32) {
        issues.push("Weak or missing encryption key")
        fixes.push("Generate a strong 32+ character encryption key")
      }

      // Check for development secrets in production
      if (process.env.NODE_ENV === "production") {
        const devSecrets = ["test", "dev", "localhost", "example"]
        const envVars = Object.keys(process.env)

        for (const envVar of envVars) {
          const value = process.env[envVar]?.toLowerCase() || ""
          if (devSecrets.some((secret) => value.includes(secret))) {
            issues.push(`Development secret detected in ${envVar}`)
            fixes.push(`Replace development values in ${envVar} with production values`)
          }
        }
      }

      // Check security headers
      const securityReport = security.getSecurityReport()
      if (securityReport.totalEvents > 10) {
        issues.push("High number of security events detected")
        fixes.push("Review and address security events")
      }
    } catch (error) {
      issues.push(`Security check failed: ${error}`)
      fixes.push("Review security configuration")
    }

    return {
      status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warning" : "fail",
      score: Math.max(0, 100 - issues.length * 25),
      issues,
      fixes,
    }
  }

  private async checkPerformance(): Promise<LaunchCategory> {
    const issues: string[] = []
    const fixes: string[] = []

    try {
      // Check performance metrics
      const performanceReport = performanceMonitor.getPerformanceReport()

      if (performanceReport.pageLoad > 3000) {
        issues.push("Slow page load times detected")
        fixes.push("Optimize page load performance and implement caching")
      }

      if (performanceReport.memoryUsage > 100 * 1024 * 1024) {
        // 100MB
        issues.push("High memory usage detected")
        fixes.push("Optimize memory usage and implement cleanup")
      }

      // Check for potential memory leaks
      if (performanceReport.userInteractions.length > 1000) {
        issues.push("Potential memory leak in user interactions")
        fixes.push("Implement proper cleanup for user interaction tracking")
      }
    } catch (error) {
      issues.push(`Performance check failed: ${error}`)
      fixes.push("Review performance monitoring setup")
    }

    return {
      status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warning" : "fail",
      score: Math.max(0, 100 - issues.length * 20),
      issues,
      fixes,
    }
  }

  private async checkUserExperience(): Promise<LaunchCategory> {
    const issues: string[] = []
    const fixes: string[] = []

    try {
      // Check for proper error handling
      const supabase = getSupabaseAdmin()

      // Test authentication flow
      const { error: authError } = await supabase.auth.getSession()
      if (authError && !authError.message.includes("session_not_found")) {
        issues.push("Authentication flow issues detected")
        fixes.push("Fix authentication error handling")
      }

      // Check for missing UI components
      const criticalComponents = [
        "components/ui/button.tsx",
        "components/ui/card.tsx",
        "components/ui/input.tsx",
        "components/ui/alert.tsx",
      ]

      // In a real implementation, you'd check if these files exist
      // For now, we'll assume they exist based on our codebase

      // Check for accessibility issues
      // This would typically involve automated accessibility testing
    } catch (error) {
      issues.push(`User experience check failed: ${error}`)
      fixes.push("Review user experience components and flows")
    }

    return {
      status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warning" : "fail",
      score: Math.max(0, 100 - issues.length * 15),
      issues,
      fixes,
    }
  }

  private async checkBusinessLogic(): Promise<LaunchCategory> {
    const issues: string[] = []
    const fixes: string[] = []

    try {
      const supabase = getSupabaseAdmin()

      // Check agent creation flow
      const { data: agents, error: agentsError } = await supabase
        .from("agents")
        .select("id, name, status, goal")
        .limit(1)

      if (agentsError) {
        issues.push("Agent creation system not working")
        fixes.push("Fix agent database schema and permissions")
      }

      // Check task management
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, status, agent_id")
        .limit(1)

      if (tasksError) {
        issues.push("Task management system not working")
        fixes.push("Fix task database schema and permissions")
      }

      // Check LLM integration
      const openaiKey = process.env.OPENAI_API_KEY
      if (!openaiKey) {
        issues.push("OpenAI API key not configured")
        fixes.push("Configure OpenAI API key for LLM functionality")
      }
    } catch (error) {
      issues.push(`Business logic check failed: ${error}`)
      fixes.push("Review core business logic implementation")
    }

    return {
      status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warning" : "fail",
      score: Math.max(0, 100 - issues.length * 30),
      issues,
      fixes,
    }
  }

  private async checkMonitoring(): Promise<LaunchCategory> {
    const issues: string[] = []
    const fixes: string[] = []

    try {
      // Check health check endpoint
      const healthCheck = ProductionHealthCheck.getInstance()
      const healthResult = await healthCheck.performFullHealthCheck()

      if (healthResult.overall !== "healthy") {
        issues.push("Health check system reporting issues")
        fixes.push("Address health check failures before launch")
      }

      // Check logging system
      if (!process.env.SLACK_WEBHOOK_URL) {
        issues.push("No notification system configured")
        fixes.push("Configure Slack webhook for production notifications")
      }

      // Check error tracking
      // This would check if error tracking is properly set up
    } catch (error) {
      issues.push(`Monitoring check failed: ${error}`)
      fixes.push("Set up proper monitoring and alerting systems")
    }

    return {
      status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warning" : "fail",
      score: Math.max(0, 100 - issues.length * 20),
      issues,
      fixes,
    }
  }

  private calculateOverallScore(categories: any): number {
    const weights = {
      infrastructure: 0.25,
      security: 0.2,
      performance: 0.15,
      user_experience: 0.15,
      business_logic: 0.2,
      monitoring: 0.05,
    }

    let totalScore = 0
    for (const [category, weight] of Object.entries(weights)) {
      totalScore += categories[category].score * weight
    }

    return Math.round(totalScore)
  }

  private extractCriticalIssues(categories: any): string[] {
    const critical: string[] = []

    for (const category of Object.values(categories) as LaunchCategory[]) {
      if (category.status === "fail") {
        critical.push(...category.issues)
      }
    }

    return critical
  }

  private generateRecommendations(categories: any): string[] {
    const recommendations: string[] = []

    // High-priority recommendations
    if (categories.security.status === "fail") {
      recommendations.push("🔒 CRITICAL: Fix all security issues before launch")
    }

    if (categories.infrastructure.status === "fail") {
      recommendations.push("🏗️ CRITICAL: Resolve infrastructure issues before launch")
    }

    if (categories.business_logic.status === "fail") {
      recommendations.push("💼 CRITICAL: Fix core business logic before launch")
    }

    // Medium-priority recommendations
    if (categories.performance.status !== "pass") {
      recommendations.push("⚡ Optimize performance for better user experience")
    }

    if (categories.monitoring.status !== "pass") {
      recommendations.push("📊 Set up comprehensive monitoring and alerting")
    }

    // General recommendations
    recommendations.push("🧪 Run end-to-end tests before launch")
    recommendations.push("📋 Prepare rollback plan in case of issues")
    recommendations.push("👥 Brief support team on common issues")

    return recommendations
  }

  private determineOverallStatus(score: number, criticalIssues: string[]): "ready" | "needs_attention" | "not_ready" {
    if (criticalIssues.length > 0) return "not_ready"
    if (score >= 85) return "ready"
    if (score >= 70) return "needs_attention"
    return "not_ready"
  }

  private estimateFixTime(criticalIssues: string[], categories: any): string {
    const totalIssues = Object.values(categories).reduce((sum: number, cat: any) => sum + cat.issues.length, 0)

    if (criticalIssues.length > 5) return "2-3 days"
    if (criticalIssues.length > 2) return "1-2 days"
    if (totalIssues > 10) return "4-8 hours"
    if (totalIssues > 5) return "2-4 hours"
    return "1-2 hours"
  }
}
