import type { Metadata } from "next"
import LaunchReadinessDashboard from "@/components/launch-readiness-dashboard"
import { ProductionErrorBoundary } from "@/components/production-error-boundary"

export const metadata: Metadata = {
  title: "Launch Readiness | AgentFlow Admin",
  description: "Comprehensive pre-launch validation and health check dashboard",
}

export default function LaunchReadinessPage() {
  return (
    <ProductionErrorBoundary>
      <div className="container mx-auto py-6">
        <LaunchReadinessDashboard />
      </div>
    </ProductionErrorBoundary>
  )
}
