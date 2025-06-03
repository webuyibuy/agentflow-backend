"use server"

import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { GeneratedPlan, AgentTask, DeploymentResult } from "@/lib/systematic-flow-types"
import { getUserLLMProvider } from "@/lib/user-llm-provider"
import { getDefaultUserId } from "@/lib/default-user"

export async function generateTasksFromPlan(
  plan: GeneratedPlan,
): Promise<{ success: boolean; tasks?: AgentTask[]; error?: string }> {
  try {
    const supabase = getSupabaseFromServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const llmProvider = await getUserLLMProvider(user.id)

    // Generate tasks using AI if available, otherwise use fallback logic
    let tasks: AgentTask[] = []

    if (llmProvider) {
      try {
        const prompt = `
Based on this strategic plan, generate detailed, actionable tasks:

Plan: ${JSON.stringify(plan, null, 2)}

Generate tasks that are:
1. Specific and actionable
2. Have clear acceptance criteria
3. Include estimated hours
4. Have proper dependencies
5. Are organized by phase
6. Include deliverables

Return a JSON array of tasks with the following structure:
{
  "id": "unique_id",
  "title": "Task title",
  "description": "Detailed description",
  "priority": "high|medium|low",
  "status": "todo",
  "dependencies": ["dependency_ids"],
  "category": "category_name",
  "estimatedHours": number,
  "phase": "phase_name",
  "deliverables": ["deliverable1", "deliverable2"],
  "acceptanceCriteria": ["criteria1", "criteria2"]
}
`

        const response = await llmProvider.generateText({
          prompt,
          maxTokens: 4000,
        })

        tasks = JSON.parse(response) as AgentTask[]
      } catch (aiError) {
        console.error("AI task generation failed, using fallback:", aiError)
        tasks = generateFallbackTasks(plan)
      }
    } else {
      tasks = generateFallbackTasks(plan)
    }

    return { success: true, tasks }
  } catch (error) {
    console.error("Error generating tasks:", error)
    return { success: false, error: "Failed to generate tasks" }
  }
}

function generateFallbackTasks(plan: GeneratedPlan): AgentTask[] {
  const tasks: AgentTask[] = []
  let taskCounter = 1

  plan.timeline.forEach((phase, phaseIndex) => {
    // Create setup task for each phase
    tasks.push({
      id: `task_${taskCounter++}`,
      title: `${phase.phase} - Setup & Preparation`,
      description: `Prepare and set up requirements for the ${phase.phase} phase`,
      priority: "high",
      status: "todo",
      dependencies: phaseIndex > 0 ? [`task_${taskCounter - 2}`] : [],
      category: "setup",
      estimatedHours: 4,
      phase: phase.phase,
      deliverables: ["Phase setup documentation", "Resource allocation"],
      acceptanceCriteria: ["All prerequisites met", "Team aligned on objectives"],
    })

    // Create tasks from phase tasks
    phase.tasks.forEach((taskTitle) => {
      tasks.push({
        id: `task_${taskCounter++}`,
        title: taskTitle,
        description: `Execute: ${taskTitle} as part of ${phase.phase}`,
        priority: phase.riskLevel === "high" ? "high" : "medium",
        status: "todo",
        dependencies: [`task_${taskCounter - 2}`],
        category: phase.phase.toLowerCase().replace(/\s+/g, "_"),
        estimatedHours: 8,
        phase: phase.phase,
        deliverables: phase.deliverables,
        acceptanceCriteria: ["Task completed successfully", "Quality standards met"],
      })
    })

    // Create review task for each phase
    tasks.push({
      id: `task_${taskCounter++}`,
      title: `${phase.phase} - Review & Validation`,
      description: `Review deliverables and validate completion of ${phase.phase}`,
      priority: "medium",
      status: "todo",
      dependencies: [`task_${taskCounter - 2}`],
      category: "review",
      estimatedHours: 2,
      phase: phase.phase,
      deliverables: ["Phase completion report", "Lessons learned"],
      acceptanceCriteria: ["All deliverables reviewed", "Phase objectives met"],
    })
  })

  return tasks
}

export async function deployAgentWithTasks(
  plan: GeneratedPlan,
  agentName: string,
  agentDescription?: string,
): Promise<DeploymentResult> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    let userId: string

    // Validate plan before deployment
    if (!plan || !plan.id || !plan.title) {
      return { success: false, error: "Invalid plan data provided" }
    }

    if (!agentName || agentName.trim().length < 3) {
      return { success: false, error: "Agent name must be at least 3 characters long" }
    }

    try {
      userId = await getDefaultUserId()
    } catch (error) {
      return { success: false, error: "Authentication required" }
    }

    // Generate tasks first
    const taskResult = await generateTasksFromPlan(plan)
    if (!taskResult.success || !taskResult.tasks) {
      return { success: false, error: taskResult.error || "Failed to generate tasks" }
    }

    const tasks = taskResult.tasks

    // Create agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .insert({
        name: agentName,
        goal: plan.description,
        owner_id: userId,
        template_slug: "systematic-agent",
        template_name: "Systematically Configured Agent",
        behavior: `Agent configured through systematic planning process. Complexity: ${plan.complexity}. Estimated time to value: ${plan.estimatedTimeToValue || "TBD"}.`,
        status: "active",
        configuration_method: "systematic",
      })
      .select("id")
      .single()

    if (agentError || !agent) {
      console.error("Error creating agent:", agentError)
      return {
        success: false,
        error: `Failed to create agent: ${agentError?.message || "Unknown database error"}. Please check your connection and try again.`,
      }
    }

    const agentId = agent.id

    // Store the plan data
    const { error: planError } = await supabaseAdmin.from("agent_custom_data").insert({
      agent_id: agentId,
      custom_data: {
        plan,
        planId: plan.id,
        complexity: plan.complexity,
        estimatedCost: plan.estimatedCost,
        estimatedTimeToValue: plan.estimatedTimeToValue,
      },
      configuration_method: "systematic",
    })

    if (planError) {
      console.error("Error storing plan data:", planError)
      // Non-critical error, continue
    }

    // Create tasks in database
    const tasksToInsert = tasks.map((task) => ({
      agent_id: agentId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      is_dependency: task.dependencies.length > 0,
      blocked_reason: task.dependencies.length > 0 ? "Waiting for dependencies" : null,
      depends_on_task_id: null, // Will be updated after all tasks are created
      depends_on_agent_id: null,
      output_summary: null,
    }))

    const { data: createdTasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .insert(tasksToInsert)
      .select("id, title")

    if (tasksError) {
      console.error("Error creating tasks:", tasksError)
      return { success: false, error: `Failed to create tasks: ${tasksError.message}` }
    }

    // Update user's onboarding progress
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_step: 4,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (profileError) {
      console.error("Error updating profile:", profileError)
      // Non-critical error
    }

    // Add XP for completing systematic configuration
    const { error: xpError } = await supabaseAdmin.from("xp_log").insert({
      owner_id: userId,
      action: "completed_systematic_configuration",
      points: 200,
      description: "Completed systematic agent configuration process",
    })

    if (xpError) {
      console.error("Error adding XP:", xpError)
      // Non-critical error
    }

    // Revalidate paths
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/agents/${agentId}`)
    revalidatePath("/dashboard/dependencies")

    const warnings: string[] = []
    if (planError) warnings.push("Plan data storage had issues but agent was created successfully")
    if (profileError) warnings.push("Profile update had issues but agent was created successfully")

    const nextSteps = [
      "Review your generated tasks in the Dependency Basket",
      "Start working on high-priority tasks first",
      "Monitor progress through the agent dashboard",
      "Update task status as you complete them",
    ]

    console.log(`Successfully deployed agent ${agentId} with ${tasks.length} tasks`)

    return {
      success: true,
      agentId,
      tasks,
      warnings: warnings.length > 0 ? warnings : undefined,
      nextSteps,
    }
  } catch (error) {
    console.error("Unexpected error in deployment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred during deployment",
    }
  }
}

export async function validatePlanForDeployment(
  plan: GeneratedPlan,
): Promise<{ isValid: boolean; issues: string[]; recommendations: string[] }> {
  const issues: string[] = []
  const recommendations: string[] = []

  // Validate plan completeness
  if (!plan.title || plan.title.trim().length < 5) {
    issues.push("Plan title is too short or missing")
  }

  if (!plan.description || plan.description.trim().length < 20) {
    issues.push("Plan description is insufficient")
  }

  if (plan.objectives.length === 0) {
    issues.push("No objectives defined")
  }

  if (plan.timeline.length === 0) {
    issues.push("No timeline phases defined")
  }

  if (plan.successMetrics.length === 0) {
    issues.push("No success metrics defined")
    recommendations.push("Add measurable success criteria")
  }

  // Validate resources
  const requiredResources = plan.resources.filter((r) => r.required && !r.configured)
  if (requiredResources.length > 0) {
    issues.push(`${requiredResources.length} required resources not configured`)
    recommendations.push("Configure required resources before deployment")
  }

  // Validate dependencies
  const blockedDependencies = plan.dependencies.filter((d) => d.status === "blocked")
  if (blockedDependencies.length > 0) {
    issues.push(`${blockedDependencies.length} dependencies are blocked`)
    recommendations.push("Resolve blocked dependencies before proceeding")
  }

  // Add general recommendations
  if (plan.complexity === "high") {
    recommendations.push("Consider breaking down high-complexity plan into smaller phases")
  }

  if (plan.risks.length > 3) {
    recommendations.push("Review and mitigate identified risks before deployment")
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
  }
}
