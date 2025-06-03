import { type NextRequest, NextResponse } from "next/server"
import { AdminDatabaseOperations } from "@/lib/admin-database-operations"
import { getSupabaseFromServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin privileges
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For now, we'll allow any authenticated user to access health metrics
    // In production, you'd want to check for admin role
    const adminOps = new AdminDatabaseOperations()
    const healthMetrics = await adminOps.getSystemHealthMetrics()

    if (!healthMetrics) {
      return NextResponse.json({ error: "Failed to fetch health metrics" }, { status: 500 })
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      metrics: healthMetrics,
    })
  } catch (error) {
    console.error("Error in health check:", error)
    return NextResponse.json(
      {
        status: "error",
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
