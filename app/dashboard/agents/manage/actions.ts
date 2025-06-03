"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { isValidUuid } from "@/lib/utils"

const SELECTED_AGENT_COOKIE_NAME = "selected_agent_id"

export async function setSelectedAgent(agentId: string) {
  if (!isValidUuid(agentId)) {
    console.error("Attempted to set an invalid agent ID:", agentId)
    return { success: false, message: "Invalid agent ID provided." }
  }

  const supabase = getSupabaseAdmin()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "User not authenticated." }
  }

  // Verify the agent belongs to the user
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("owner_id", user.id)
    .single()

  if (error || !agent) {
    console.error("Error verifying agent ownership or agent not found:", error)
    return { success: false, message: "Agent not found or not owned by user." }
  }

  cookies().set(SELECTED_AGENT_COOKIE_NAME, agentId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })

  console.log(`Selected agent ID ${agentId} set in cookie.`)
  redirect("/dashboard") // Redirect to dashboard after selection
}

export async function getSelectedAgentIdFromCookie(): Promise<string | null> {
  return cookies().get(SELECTED_AGENT_COOKIE_NAME)?.value || null
}

export async function clearSelectedAgentCookie() {
  cookies().delete(SELECTED_AGENT_COOKIE_NAME)
  console.log("Selected agent cookie cleared.")
  redirect("/dashboard") // Redirect to dashboard after clearing
}
