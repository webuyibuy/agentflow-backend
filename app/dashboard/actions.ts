"use server"

import { getSupabaseAdmin } from "@/lib/supabase/server"
import { getDefaultUserId } from "@/lib/default-user"
import { jsonToCsv } from "@/lib/csv" // Import the new utility

export async function exportAgentsToCsv(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = getSupabaseAdmin()
    const userId = await getDefaultUserId()

    const { data: agents, error } = await supabase
      .from("agents")
      .select("id, name, goal, template_slug, status, created_at, updated_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching agents for export:", error.message)
      return { success: false, error: "Failed to fetch agents for export." }
    }

    if (!agents || agents.length === 0) {
      return { success: true, data: "", error: "No agents found to export." }
    }

    // Define columns for CSV export (optional, but good for consistent headers)
    const columns = [
      { key: "id", header: "ID" },
      { key: "name", header: "Agent Name" },
      { key: "goal", header: "Goal" },
      { key: "template_slug", header: "Template" },
      { key: "status", header: "Status" },
      { key: "created_at", header: "Created At" },
      { key: "updated_at", header: "Last Updated" },
    ]

    const csvData = jsonToCsv(agents, columns)

    return { success: true, data: csvData }
  } catch (e) {
    console.error("Unexpected error during agent export:", e)
    return { success: false, error: "An unexpected error occurred during export." }
  }
}
