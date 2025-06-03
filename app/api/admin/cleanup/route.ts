import { type NextRequest, NextResponse } from "next/server"
import { AdminDatabaseOperations } from "@/lib/admin-database-operations"
import { getSupabaseFromServer } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()
    const adminOps = new AdminDatabaseOperations()

    switch (action) {
      case "cleanup_duplicates":
        const cleanupResults = await adminOps.cleanupDuplicateProfiles()
        return NextResponse.json({
          success: true,
          action: "cleanup_duplicates",
          results: cleanupResults,
        })

      case "create_missing_profiles":
        const createResults = await adminOps.createMissingProfiles()
        return NextResponse.json({
          success: true,
          action: "create_missing_profiles",
          results: createResults,
        })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in cleanup operation:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
