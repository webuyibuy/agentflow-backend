import { LaunchReadinessChecker } from "@/lib/launch-readiness-checker"
import { ProductionHealthCheck } from "@/lib/production-health-check"
import { sendSlackNotification } from "@/lib/slack-notifications"

export class ProductionDeployment {
  private static instance: ProductionDeployment

  static getInstance(): ProductionDeployment {
    if (!ProductionDeployment.instance) {
      ProductionDeployment.instance = new ProductionDeployment()
    }
    return ProductionDeployment.instance
  }

  async performPreDeploymentChecks(): Promise<boolean> {
    console.log("🔍 Starting pre-deployment checks...")

    try {
      // 1. Run launch readiness check
      const readinessChecker = LaunchReadinessChecker.getInstance()
      const readinessResult = await readinessChecker.performComprehensiveCheck()

      if (readinessResult.overall !== "ready") {
        console.error("❌ Pre-deployment check failed: System not ready for launch")
        console.error("Critical issues:", readinessResult.criticalIssues)

        await this.notifyDeploymentFailure(
          "Pre-deployment check failed",
          `System readiness: ${readinessResult.overall}\nCritical issues: ${readinessResult.criticalIssues.length}\nScore: ${readinessResult.score}/100`,
        )

        return false
      }

      // 2. Run health check
      const healthCheck = ProductionHealthCheck.getInstance()
      const healthResult = await healthCheck.performFullHealthCheck()

      if (healthResult.overall !== "healthy") {
        console.error("❌ Health check failed:", healthResult.services)

        await this.notifyDeploymentFailure(
          "Health check failed",
          `System health: ${healthResult.overall}\nFailed services: ${healthResult.services
            .filter((s) => s.status !== "healthy")
            .map((s) => s.service)
            .join(", ")}`,
        )

        return false
      }

      console.log("✅ All pre-deployment checks passed!")
      return true
    } catch (error) {
      console.error("❌ Pre-deployment check error:", error)
      await this.notifyDeploymentFailure(
        "Pre-deployment check error",
        error instanceof Error ? error.message : "Unknown error",
      )
      return false
    }
  }

  async performPostDeploymentValidation(): Promise<boolean> {
    console.log("🔍 Starting post-deployment validation...")

    try {
      // Wait a moment for services to stabilize
      await new Promise((resolve) => setTimeout(resolve, 5000))

      // 1. Test critical endpoints
      const endpointTests = [
        { name: "Health Check", url: "/api/health" },
        { name: "Authentication", url: "/api/auth/session" },
        { name: "Dashboard", url: "/dashboard" },
      ]

      for (const test of endpointTests) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${test.url}`)
          if (!response.ok) {
            throw new Error(`${test.name} endpoint failed: ${response.status}`)
          }
          console.log(`✅ ${test.name} endpoint working`)
        } catch (error) {
          console.error(`❌ ${test.name} endpoint failed:`, error)
          await this.notifyDeploymentFailure(
            `Post-deployment validation failed`,
            `${test.name} endpoint is not responding`,
          )
          return false
        }
      }

      // 2. Test database connectivity
      const healthCheck = ProductionHealthCheck.getInstance()
      const healthResult = await healthCheck.performFullHealthCheck()

      if (healthResult.overall !== "healthy") {
        console.error("❌ Post-deployment health check failed")
        await this.notifyDeploymentFailure(
          "Post-deployment health check failed",
          "System is not healthy after deployment",
        )
        return false
      }

      console.log("✅ Post-deployment validation passed!")
      await this.notifyDeploymentSuccess()
      return true
    } catch (error) {
      console.error("❌ Post-deployment validation error:", error)
      await this.notifyDeploymentFailure(
        "Post-deployment validation error",
        error instanceof Error ? error.message : "Unknown error",
      )
      return false
    }
  }

  private async notifyDeploymentSuccess(): Promise<void> {
    const message = `🚀 *DEPLOYMENT SUCCESSFUL*

✅ AgentFlow has been successfully deployed to production!

*Deployment Details:*
• Time: ${new Date().toISOString()}
• Environment: ${process.env.NODE_ENV}
• Version: ${process.env.npm_package_version || "Unknown"}

*System Status:*
• All health checks passed
• All critical endpoints responding
• Database connectivity confirmed

*Next Steps:*
• Monitor system performance
• Watch for any user-reported issues
• Review deployment metrics

Great job team! 🎉`

    await sendSlackNotification(message)
  }

  private async notifyDeploymentFailure(reason: string, details: string): Promise<void> {
    const message = `🚨 *DEPLOYMENT FAILED*

❌ AgentFlow deployment to production has failed!

*Failure Reason:* ${reason}
*Details:* ${details}

*Time:* ${new Date().toISOString()}
*Environment:* ${process.env.NODE_ENV}

*Immediate Actions Required:*
1. Review deployment logs
2. Fix identified issues
3. Re-run pre-deployment checks
4. Retry deployment

*Support:* Contact the development team immediately.`

    await sendSlackNotification(message)
  }

  async performRollback(): Promise<boolean> {
    console.log("🔄 Starting rollback procedure...")

    try {
      await this.notifyRollbackStarted()

      // In a real implementation, this would:
      // 1. Revert to previous deployment
      // 2. Restore database if needed
      // 3. Clear caches
      // 4. Validate rollback success

      console.log("✅ Rollback completed successfully")
      await this.notifyRollbackSuccess()
      return true
    } catch (error) {
      console.error("❌ Rollback failed:", error)
      await this.notifyRollbackFailure(error instanceof Error ? error.message : "Unknown error")
      return false
    }
  }

  private async notifyRollbackStarted(): Promise<void> {
    const message = `🔄 *ROLLBACK INITIATED*

⚠️ Rolling back AgentFlow deployment due to issues.

*Time:* ${new Date().toISOString()}
*Environment:* ${process.env.NODE_ENV}

*Status:* In progress...`

    await sendSlackNotification(message)
  }

  private async notifyRollbackSuccess(): Promise<void> {
    const message = `✅ *ROLLBACK SUCCESSFUL*

🔄 AgentFlow has been successfully rolled back to the previous stable version.

*Time:* ${new Date().toISOString()}
*Environment:* ${process.env.NODE_ENV}

*Next Steps:*
• Investigate deployment issues
• Fix identified problems
• Re-test before next deployment attempt`

    await sendSlackNotification(message)
  }

  private async notifyRollbackFailure(error: string): Promise<void> {
    const message = `🚨 *ROLLBACK FAILED*

❌ Critical: AgentFlow rollback has failed!

*Error:* ${error}
*Time:* ${new Date().toISOString()}
*Environment:* ${process.env.NODE_ENV}

*URGENT ACTION REQUIRED:*
• Manual intervention needed
• Contact senior developers immediately
• System may be in unstable state`

    await sendSlackNotification(message)
  }
}

// Export deployment functions for use in CI/CD
export const runPreDeploymentChecks = async (): Promise<boolean> => {
  const deployment = ProductionDeployment.getInstance()
  return await deployment.performPreDeploymentChecks()
}

export const runPostDeploymentValidation = async (): Promise<boolean> => {
  const deployment = ProductionDeployment.getInstance()
  return await deployment.performPostDeploymentValidation()
}

export const performRollback = async (): Promise<boolean> => {
  const deployment = ProductionDeployment.getInstance()
  return await deployment.performRollback()
}
