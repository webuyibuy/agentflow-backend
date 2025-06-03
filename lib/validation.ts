import { z } from "zod"

// Comprehensive validation schemas
export const TaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.date().optional(),
  estimatedHours: z.number().min(0.1).max(1000).optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).default([]),
  workspaceId: z.string().uuid(),
})

export const AgentConfigSchema = z.object({
  name: z.string().min(3, "Agent name must be at least 3 characters").max(50, "Agent name too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description too long"),
  capabilities: z.array(z.string()).min(1, "At least one capability required"),
  aiProvider: z.enum(["openai", "anthropic", "groq", "xai"]),
  aiModel: z.string().min(1, "AI model is required"),
  workspaceId: z.string().uuid(),
  parameters: z.record(z.any()).default({}),
})

export const DependencySchema = z.object({
  sourceTaskId: z.string().uuid(),
  targetTaskId: z.string().uuid(),
  type: z.enum(["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"]).default("finish_to_start"),
  slaDeadline: z.date().optional(),
})

export const UserRegistrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(50, "Display name too long"),
})

// Validation helper functions
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
      }
    }
    return {
      success: false,
      errors: ["Validation failed"],
    }
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocols
    .substring(0, 10000) // Limit length
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}
