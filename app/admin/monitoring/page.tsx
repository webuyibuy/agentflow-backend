import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import SystemAlertsDashboard from "@/components/system-alerts-dashboard"
import { requirePermission } from "@/lib/role-based-access"

export default async function MonitoringPage() {
  // Check if user has admin role
  await requirePermission({ resource: "system", action: "manage" })

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto" />}>
        <SystemAlertsDashboard />
      </Suspense>
    </div>
  )
}
