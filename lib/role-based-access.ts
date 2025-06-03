import { getSupabaseFromServer } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export type UserRole = "admin" | "manager" | "user" | "viewer"

export interface Permission {
  resource: string
  action: "create" | "read" | "update" | "delete" | "manage"
}

// Default permissions by role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { resource: "*", action: "manage" }, // Admin can do everything
  ],
  manager: [
    { resource: "agents", action: "create" },
    { resource: "agents", action: "read" },
    { resource: "agents", action: "update" },
    { resource: "tasks", action: "create" },
    { resource: "tasks", action: "read" },
    { resource: "tasks", action: "update" },
    { resource: "dependencies", action: "read" },
    { resource: "dependencies", action: "update" },
    { resource: "analytics", action: "read" },
  ],
  user: [
    { resource: "agents", action: "create" },
    { resource: "agents", action: "read" },
    { resource: "agents", action: "update" },
    { resource: "tasks", action: "create" },
    { resource: "tasks", action: "read" },
    { resource: "tasks", action: "update" },
    { resource: "dependencies", action: "read" },
  ],
  viewer: [
    { resource: "agents", action: "read" },
    { resource: "tasks", action: "read" },
    { resource: "dependencies", action: "read" },
  ],
}

export async function getUserRole(userId?: string): Promise<UserRole> {
  try {
    const supabase = getSupabaseFromServer()

    // If no userId provided, get the current user
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id

      if (!userId) {
        return "viewer" // Default for unauthenticated users
      }
    }

    // Get the user's role from their profile
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", userId).limit(1).single()

    if (error || !profile) {
      console.error("Error fetching user role:", error)
      return "user" // Default role if not found
    }

    return (profile.role as UserRole) || "user"
  } catch (error) {
    console.error("Error in getUserRole:", error)
    return "user" // Default role on error
  }
}

export async function hasPermission(permission: Permission, userId?: string): Promise<boolean> {
  const role = await getUserRole(userId)

  // Admin has all permissions
  if (role === "admin") return true

  // Check if the role has the specific permission
  return ROLE_PERMISSIONS[role].some(
    (p) =>
      (p.resource === permission.resource || p.resource === "*") &&
      (p.action === permission.action || p.action === "manage"),
  )
}

export async function requirePermission(permission: Permission): Promise<void> {
  const hasAccess = await hasPermission(permission)

  if (!hasAccess) {
    redirect("/unauthorized")
  }
}

export async function setUserRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseFromServer()

    const { error } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error setting user role",
    }
  }
}
