import { NextResponse } from "next/server"
import { monitoringSystem } from "@/lib/monitoring-system"
import { getUserRole } from "@/lib/role-based-access"

export async function POST() {
  try {
    // Check if user is admin
    const userRole = await getUserRole()
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Run the monitoring checks
    const results = await monitoringSystem.checkAllRules()

    return NextResponse.json({
      success: true,
      results: results.results,
      alerts: results.alerts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in monitoring check API:", error)
    return NextResponse.json({ error: "Failed to run monitoring checks" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if user is admin
    const userRole = await getUserRole()
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get active alerts
    const alerts = await monitoringSystem.getActiveAlerts()

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in get alerts API:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
