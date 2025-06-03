import { createClient } from "@/lib/supabase/server"

export interface AuditEvent {
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
}

export async function logAuditEvent(event: Omit<AuditEvent, "timestamp">) {
  const supabase = createClient()

  const auditEvent: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  const { error } = await supabase.from("audit_logs").insert(auditEvent)

  if (error) {
    console.error("Failed to log audit event:", error)
  }
}

export async function getAuditLogs(filters: {
  user_id?: string
  resource_type?: string
  action?: string
  start_date?: string
  end_date?: string
  limit?: number
}) {
  const supabase = createClient()

  let query = supabase.from("audit_logs").select("*, users(email, full_name)").order("timestamp", { ascending: false })

  if (filters.user_id) {
    query = query.eq("user_id", filters.user_id)
  }

  if (filters.resource_type) {
    query = query.eq("resource_type", filters.resource_type)
  }

  if (filters.action) {
    query = query.eq("action", filters.action)
  }

  if (filters.start_date) {
    query = query.gte("timestamp", filters.start_date)
  }

  if (filters.end_date) {
    query = query.lte("timestamp", filters.end_date)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
