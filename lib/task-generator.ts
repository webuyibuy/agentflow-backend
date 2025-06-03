import { aiProvider } from "@/lib/ai-provider-manager"
import { errorHandler } from "@/lib/error-handler"
import { validateInput, TaskSchema } from "@/lib/validation"

export interface TaskGenerationRequest {
  description: string
  context: {
    industry?: string
    teamSize?: number
    timeline?: string
    budget?: string
    availableSkills?: string[]
    workspaceId: string
  }
  userId: string
}

export interface GeneratedTask {
  title: string
  description: string
  estimatedHours: number
  priority: "low" | "medium" | "high" | "urgent"
  category: string
  requiredSkills: string[]
  dependencies: string[]
}

export class TaskGenerator {
  private static instance: TaskGenerator

  static getInstance(): TaskGenerator {
    if (!TaskGenerator.instance) {
      TaskGenerator.instance = new TaskGenerator()
    }
    return TaskGenerator.instance
  }

  async generateTasks(request: TaskGenerationRequest): Promise<{
    success: boolean
    tasks?: GeneratedTask[]
    error?: string
    usedFallback?: boolean
  }> {
    try {
      // Validate input
      if (!request.description || request.description.length < 10) {
        return {
          success: false,
          error: "Description must be at least 10 characters long",
        }
      }

      if (request.description.length > 2000) {
        return {
          success: false,
          error: "Description is too long (max 2000 characters)",
        }
      }

      // Try AI generation first
      const aiResult = await this.generateWithAI(request)
      if (aiResult.success) {
        return aiResult
      }

      // Fallback to rule-based generation
      const fallbackResult = this.generateFallbackTasks(request)
      return {
        ...fallbackResult,
        usedFallback: true,
      }
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "generate_tasks",
        component: "task_generator",
        userId: request.userId,
        severity: "medium",
      })

      // Return fallback tasks on error
      const fallbackResult = this.generateFallbackTasks(request)
      return {
        ...fallbackResult,
        usedFallback: true,
        error: "AI generation failed, using fallback method",
      }
    }
  }

  private async generateWithAI(request: TaskGenerationRequest): Promise<{
    success: boolean
    tasks?: GeneratedTask[]
    error?: string
  }> {
    const prompt = this.buildPrompt(request)

    const response = await aiProvider.executeRequest({
      prompt,
      maxTokens: 3000,
      temperature: 0.3,
      userId: request.userId,
      timeout: 30000,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      }
    }

    try {
      const tasks = this.parseAIResponse(response.content)
      const validatedTasks = this.validateAndCleanTasks(tasks, request.context.workspaceId)

      return {
        success: true,
        tasks: validatedTasks,
      }
    } catch (error) {
      return {
        success: false,
        error: "Failed to parse AI response",
      }
    }
  }

  private buildPrompt(request: TaskGenerationRequest): string {
    const { description, context } = request

    return `
You are an expert project manager. Generate a comprehensive list of tasks for the following objective:

Objective: "${description}"

Context:
- Industry: ${context.industry || "Not specified"}
- Team Size: ${context.teamSize || "Not specified"}
- Timeline: ${context.timeline || "Not specified"}
- Budget: ${context.budget || "Not specified"}
- Available Skills: ${context.availableSkills?.join(", ") || "Not specified"}

For each task, provide:
1. title: Clear, actionable task name (max 100 characters)
2. description: Detailed requirements and acceptance criteria (max 500 characters)
3. estimatedHours: Realistic time estimate (number between 0.5 and 40)
4. priority: One of "low", "medium", "high", "urgent"
5. category: Task category/type
6. requiredSkills: Array of specific skills needed
7. dependencies: Array of task titles this depends on (can be empty)

Generate 3-10 tasks that comprehensively cover the objective.
Return ONLY a JSON array of task objects with no additional text.

Example format:
[
  {
    "title": "Research market requirements",
    "description": "Conduct comprehensive market research to understand user needs and competitive landscape",
    "estimatedHours": 8,
    "priority": "high",
    "category": "research",
    "requiredSkills": ["market research", "data analysis"],
    "dependencies": []
  }
]
`
  }

  private parseAIResponse(content: string): any[] {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // Try parsing the whole response
    return JSON.parse(content)
  }

  private validateAndCleanTasks(tasks: any[], workspaceId: string): GeneratedTask[] {
    const validTasks: GeneratedTask[] = []

    for (const task of tasks) {
      try {
        // Basic validation and cleaning
        const cleanedTask: GeneratedTask = {
          title: this.cleanString(task.title, 100),
          description: this.cleanString(task.description, 500),
          estimatedHours: this.validateNumber(task.estimatedHours, 0.5, 40, 2),
          priority: this.validatePriority(task.priority),
          category: this.cleanString(task.category, 50) || "General",
          requiredSkills: this.validateSkillsArray(task.requiredSkills),
          dependencies: this.validateDependenciesArray(task.dependencies),
        }

        // Additional validation using schema
        const validation = validateInput(TaskSchema.omit({ workspaceId: true }), {
          ...cleanedTask,
          workspaceId,
        })

        if (validation.success) {
          validTasks.push(cleanedTask)
        }
      } catch (error) {
        // Skip invalid tasks
        continue
      }
    }

    return validTasks
  }

  private cleanString(value: any, maxLength: number): string {
    if (typeof value !== "string") return ""
    return value.trim().substring(0, maxLength)
  }

  private validateNumber(value: any, min: number, max: number, defaultValue: number): number {
    const num = Number.parseFloat(value)
    if (isNaN(num) || num < min || num > max) {
      return defaultValue
    }
    return num
  }

  private validatePriority(value: any): "low" | "medium" | "high" | "urgent" {
    const validPriorities = ["low", "medium", "high", "urgent"]
    return validPriorities.includes(value) ? value : "medium"
  }

  private validateSkillsArray(value: any): string[] {
    if (!Array.isArray(value)) return []
    return value
      .filter((skill) => typeof skill === "string")
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0)
      .slice(0, 10) // Limit to 10 skills
  }

  private validateDependenciesArray(value: any): string[] {
    if (!Array.isArray(value)) return []
    return value
      .filter((dep) => typeof dep === "string")
      .map((dep) => dep.trim())
      .filter((dep) => dep.length > 0)
      .slice(0, 5) // Limit to 5 dependencies
  }

  private generateFallbackTasks(request: TaskGenerationRequest): {
    success: boolean
    tasks: GeneratedTask[]
  } {
    const { description, context } = request

    // Generate basic tasks based on common patterns
    const fallbackTasks: GeneratedTask[] = [
      {
        title: "Project Planning and Setup",
        description: `Plan and set up the project for: ${description.substring(0, 100)}`,
        estimatedHours: 4,
        priority: "high",
        category: "planning",
        requiredSkills: ["project management", "planning"],
        dependencies: [],
      },
      {
        title: "Research and Analysis",
        description: "Conduct research and analysis for the project requirements",
        estimatedHours: 6,
        priority: "high",
        category: "research",
        requiredSkills: ["research", "analysis"],
        dependencies: ["Project Planning and Setup"],
      },
      {
        title: "Implementation",
        description: "Execute the main implementation work for the project",
        estimatedHours: 12,
        priority: "medium",
        category: "implementation",
        requiredSkills: ["implementation"],
        dependencies: ["Research and Analysis"],
      },
      {
        title: "Testing and Quality Assurance",
        description: "Test and validate the project deliverables",
        estimatedHours: 4,
        priority: "medium",
        category: "testing",
        requiredSkills: ["testing", "quality assurance"],
        dependencies: ["Implementation"],
      },
      {
        title: "Review and Documentation",
        description: "Review results and create project documentation",
        estimatedHours: 3,
        priority: "low",
        category: "documentation",
        requiredSkills: ["documentation", "review"],
        dependencies: ["Testing and Quality Assurance"],
      },
    ]

    return {
      success: true,
      tasks: fallbackTasks,
    }
  }
}

export const taskGenerator = TaskGenerator.getInstance()
