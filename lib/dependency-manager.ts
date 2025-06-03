import { dbOps } from "@/lib/database-operations"
import { errorHandler } from "@/lib/error-handler"

export interface DependencyNode {
  id: string
  status: string
  priority: number
  dueDate?: Date
}

export interface DependencyEdge {
  sourceId: string
  targetId: string
  type: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish"
}

export class DependencyManager {
  private static instance: DependencyManager
  private nodes = new Map<string, DependencyNode>()
  private edges = new Map<string, Set<string>>()

  static getInstance(): DependencyManager {
    if (!DependencyManager.instance) {
      DependencyManager.instance = new DependencyManager()
    }
    return DependencyManager.instance
  }

  async buildGraph(workspaceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear existing graph
      this.nodes.clear()
      this.edges.clear()

      // Load tasks and dependencies from database
      const [tasksResult, dependenciesResult] = await Promise.all([
        this.loadTasks(workspaceId),
        this.loadDependencies(workspaceId),
      ])

      if (!tasksResult.success || !dependenciesResult.success) {
        return {
          success: false,
          error: "Failed to load graph data from database",
        }
      }

      // Build nodes
      tasksResult.tasks.forEach((task) => {
        this.nodes.set(task.id, {
          id: task.id,
          status: task.status,
          priority: task.priority || 3,
          dueDate: task.due_date ? new Date(task.due_date) : undefined,
        })
      })

      // Build edges
      dependenciesResult.dependencies.forEach((dep) => {
        if (!this.edges.has(dep.source_task_id)) {
          this.edges.set(dep.source_task_id, new Set())
        }
        this.edges.get(dep.source_task_id)!.add(dep.target_task_id)
      })

      return { success: true }
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "build_dependency_graph",
        component: "dependency_manager",
        severity: "medium",
        metadata: { workspaceId },
      })

      return {
        success: false,
        error: "Failed to build dependency graph",
      }
    }
  }

  private async loadTasks(workspaceId: string): Promise<{ success: boolean; tasks: any[] }> {
    try {
      // This would be replaced with actual database call
      // For now, return empty array
      return { success: true, tasks: [] }
    } catch (error) {
      return { success: false, tasks: [] }
    }
  }

  private async loadDependencies(workspaceId: string): Promise<{ success: boolean; dependencies: any[] }> {
    try {
      // This would be replaced with actual database call
      // For now, return empty array
      return { success: true, dependencies: [] }
    } catch (error) {
      return { success: false, dependencies: [] }
    }
  }

  canAddDependency(sourceId: string, targetId: string): { canAdd: boolean; reason?: string } {
    // Check if both nodes exist
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return {
        canAdd: false,
        reason: "One or both tasks do not exist in the graph",
      }
    }

    // Check if dependency already exists
    if (this.edges.has(sourceId) && this.edges.get(sourceId)!.has(targetId)) {
      return {
        canAdd: false,
        reason: "Dependency already exists",
      }
    }

    // Check for circular dependencies
    if (this.wouldCreateCycle(sourceId, targetId)) {
      return {
        canAdd: false,
        reason: "Would create a circular dependency",
      }
    }

    return { canAdd: true }
  }

  private wouldCreateCycle(sourceId: string, targetId: string): boolean {
    const visited = new Set<string>()

    const checkCycle = (currentId: string): boolean => {
      if (currentId === sourceId) return true
      if (visited.has(currentId)) return false

      visited.add(currentId)
      const dependencies = this.edges.get(currentId) || new Set()

      for (const depId of dependencies) {
        if (checkCycle(depId)) return true
      }

      return false
    }

    return checkCycle(targetId)
  }

  async addDependency(
    sourceId: string,
    targetId: string,
    type: DependencyEdge["type"] = "finish_to_start",
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if dependency can be added
      const canAdd = this.canAddDependency(sourceId, targetId)
      if (!canAdd.canAdd) {
        return {
          success: false,
          error: canAdd.reason,
        }
      }

      // Add to database
      const dbResult = await dbOps.createDependency(
        {
          sourceTaskId: sourceId,
          targetTaskId: targetId,
          type,
        },
        userId,
      )

      if (!dbResult.success) {
        return {
          success: false,
          error: dbResult.error,
        }
      }

      // Add to local graph
      if (!this.edges.has(sourceId)) {
        this.edges.set(sourceId, new Set())
      }
      this.edges.get(sourceId)!.add(targetId)

      // Update task availability
      await this.updateTaskAvailability(targetId)

      return { success: true }
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "add_dependency",
        component: "dependency_manager",
        userId,
        severity: "medium",
        metadata: { sourceId, targetId, type },
      })

      return {
        success: false,
        error: "Failed to add dependency",
      }
    }
  }

  private async updateTaskAvailability(taskId: string): Promise<void> {
    try {
      const blockers = this.getBlockingTasks(taskId)
      const allCompleted = blockers.every((blockerId) => {
        const node = this.nodes.get(blockerId)
        return node && node.status === "done"
      })

      const currentNode = this.nodes.get(taskId)
      if (!currentNode) return

      if (allCompleted && currentNode.status === "blocked") {
        // Update local node
        currentNode.status = "ready"
        this.nodes.set(taskId, currentNode)

        // This would trigger a database update in real implementation
        console.log(`Task ${taskId} is now ready`)
      } else if (!allCompleted && currentNode.status !== "blocked") {
        // Update local node
        currentNode.status = "blocked"
        this.nodes.set(taskId, currentNode)

        // This would trigger a database update in real implementation
        console.log(`Task ${taskId} is now blocked`)
      }
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "update_task_availability",
        component: "dependency_manager",
        severity: "low",
        metadata: { taskId },
      })
    }
  }

  private getBlockingTasks(taskId: string): string[] {
    const blockers: string[] = []

    for (const [sourceId, targets] of this.edges.entries()) {
      if (targets.has(taskId)) {
        blockers.push(sourceId)
      }
    }

    return blockers
  }

  findCriticalPath(): string[] {
    try {
      // Simplified critical path algorithm
      const criticalPath: string[] = []
      const visited = new Set<string>()

      // Find nodes with no dependencies (start nodes)
      const startNodes = Array.from(this.nodes.keys()).filter((nodeId) => this.getBlockingTasks(nodeId).length === 0)

      // For each start node, find the longest path
      let longestPath: string[] = []

      for (const startNode of startNodes) {
        const path = this.findLongestPath(startNode, visited)
        if (path.length > longestPath.length) {
          longestPath = path
        }
      }

      return longestPath
    } catch (error) {
      errorHandler.captureError(error as Error, {
        action: "find_critical_path",
        component: "dependency_manager",
        severity: "low",
      })
      return []
    }
  }

  private findLongestPath(nodeId: string, visited: Set<string>): string[] {
    if (visited.has(nodeId)) return []

    visited.add(nodeId)
    const dependencies = this.edges.get(nodeId) || new Set()

    let longestSubPath: string[] = []

    for (const depId of dependencies) {
      const subPath = this.findLongestPath(depId, new Set(visited))
      if (subPath.length > longestSubPath.length) {
        longestSubPath = subPath
      }
    }

    visited.delete(nodeId)
    return [nodeId, ...longestSubPath]
  }

  getGraphMetrics(): {
    totalNodes: number
    totalEdges: number
    criticalPathLength: number
    blockedTasks: number
    readyTasks: number
  } {
    const totalEdges = Array.from(this.edges.values()).reduce((sum, targets) => sum + targets.size, 0)

    const criticalPath = this.findCriticalPath()

    const blockedTasks = Array.from(this.nodes.values()).filter((node) => node.status === "blocked").length

    const readyTasks = Array.from(this.nodes.values()).filter((node) => node.status === "ready").length

    return {
      totalNodes: this.nodes.size,
      totalEdges,
      criticalPathLength: criticalPath.length,
      blockedTasks,
      readyTasks,
    }
  }

  exportGraph(): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
    const nodes = Array.from(this.nodes.values())
    const edges: DependencyEdge[] = []

    for (const [sourceId, targets] of this.edges.entries()) {
      for (const targetId of targets) {
        edges.push({
          sourceId,
          targetId,
          type: "finish_to_start", // Default type
        })
      }
    }

    return { nodes, edges }
  }
}

export const dependencyManager = DependencyManager.getInstance()
