export type Role = "admin" | "manager" | "agent_creator" | "approver" | "viewer"

export type Permission =
  | "agents.create"
  | "agents.edit"
  | "agents.delete"
  | "agents.view"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "tasks.view"
  | "dependencies.approve"
  | "dependencies.reject"
  | "dependencies.view"
  | "analytics.view"
  | "settings.manage"
  | "users.manage"
  | "audit.view"

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "agents.create",
    "agents.edit",
    "agents.delete",
    "agents.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "tasks.view",
    "dependencies.approve",
    "dependencies.reject",
    "dependencies.view",
    "analytics.view",
    "settings.manage",
    "users.manage",
    "audit.view",
  ],
  manager: [
    "agents.create",
    "agents.edit",
    "agents.view",
    "tasks.create",
    "tasks.edit",
    "tasks.view",
    "dependencies.approve",
    "dependencies.reject",
    "dependencies.view",
    "analytics.view",
    "users.manage",
  ],
  agent_creator: [
    "agents.create",
    "agents.edit",
    "agents.view",
    "tasks.create",
    "tasks.edit",
    "tasks.view",
    "dependencies.view",
  ],
  approver: ["agents.view", "tasks.view", "dependencies.approve", "dependencies.reject", "dependencies.view"],
  viewer: ["agents.view", "tasks.view", "dependencies.view", "analytics.view"],
}

export function hasPermission(userRole: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole].includes(permission)
}

export function checkPermission(userRole: Role, permission: Permission): void {
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Insufficient permissions: ${permission} required`)
  }
}
