import { getSupabaseAdmin } from "@/lib/supabase/server"
import { agentExecutionEngine } from "@/lib/agent-execution-engine"

export interface QueuedExecution {
  id: string
  agent_id: string
  user_id: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  scheduled_at: string
  started_at?: string
  completed_at?: string
  error_message?: string
  retry_count: number
  max_retries: number
  metadata?: any
}

export class AgentExecutionQueue {
  private static instance: AgentExecutionQueue
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  static getInstance(): AgentExecutionQueue {
    if (!AgentExecutionQueue.instance) {
      AgentExecutionQueue.instance = new AgentExecutionQueue()
    }
    return AgentExecutionQueue.instance
  }

  /**
   * Add agent execution to queue
   */
  async enqueueExecution(
    agentId: string,
    userId: string,
    options: {
      priority?: "low" | "medium" | "high" | "urgent"
      scheduledAt?: Date
      maxRetries?: number
      metadata?: any
    } = {},
  ): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      const supabase = getSupabaseAdmin()

      // Check if agent is already queued or running
      const { data: existingQueue, error: checkError } = await supabase
        .from("execution_queue")
        .select("id, status")
        .eq("agent_id", agentId)
        .in("status", ["pending", "running"])
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" which is expected
        console.error("Error checking existing queue:", checkError)
        return { success: false, error: "Failed to check execution queue" }
      }

      if (existingQueue) {
        return {
          success: false,
          error: `Agent execution is already ${existingQueue.status}`,
        }
      }

      // Add to queue
      const queueItem = {
        agent_id: agentId,
        user_id: userId,
        priority: options.priority || "medium",
        status: "pending" as const,
        scheduled_at: (options.scheduledAt || new Date()).toISOString(),
        retry_count: 0,
        max_retries: options.maxRetries || 3,
        metadata: options.metadata || {},
        created_at: new Date().toISOString(),
      }

      const { data: inserted, error: insertError } = await supabase
        .from("execution_queue")
        .insert(queueItem)
        .select("id")
        .single()

      if (insertError) {
        console.error("Error inserting into queue:", insertError)
        return { success: false, error: "Failed to add to execution queue" }
      }

      console.log(`✅ Added agent ${agentId} to execution queue with ID ${inserted.id}`)

      // Start processing if not already running
      this.startProcessing()

      return { success: true, queueId: inserted.id }
    } catch (error) {
      console.error("Error enqueuing execution:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Start processing the queue
   */
  startProcessing(): void {
    if (this.isProcessing) return

    this.isProcessing = true
    console.log("🚀 Starting execution queue processing")

    // Process immediately
    this.processQueue()

    // Set up interval processing (every 30 seconds)
    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, 30000)
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    this.isProcessing = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    console.log("⏹️ Stopped execution queue processing")
  }

  /**
   * Process pending items in the queue
   */
  private async processQueue(): Promise<void> {
    try {
      const supabase = getSupabaseAdmin()

      // Get pending items ordered by priority and scheduled time
      const { data: pendingItems, error: fetchError } = await supabase
        .from("execution_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("priority", { ascending: false }) // urgent first
        .order("scheduled_at", { ascending: true }) // oldest first
        .limit(5) // Process up to 5 at a time

      if (fetchError) {
        console.error("Error fetching pending queue items:", fetchError)
        return
      }

      if (!pendingItems || pendingItems.length === 0) {
        return // No pending items
      }

      console.log(`📋 Processing ${pendingItems.length} pending executions`)

      // Process each item
      for (const item of pendingItems) {
        await this.processQueueItem(item)
      }
    } catch (error) {
      console.error("Error processing queue:", error)
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: QueuedExecution): Promise<void> {
    const supabase = getSupabaseAdmin()

    try {
      console.log(`🔄 Processing queue item ${item.id} for agent ${item.agent_id}`)

      // Mark as running
      await supabase
        .from("execution_queue")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .eq("id", item.id)

      // Execute the agent
      const result = await agentExecutionEngine.startAgentExecution(item.agent_id)

      if (result.success) {
        // Mark as completed
        await supabase
          .from("execution_queue")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id)

        console.log(`✅ Completed queue item ${item.id}`)
      } else {
        // Handle failure
        await this.handleQueueItemFailure(item, result.error || "Unknown error")
      }
    } catch (error) {
      console.error(`❌ Error processing queue item ${item.id}:`, error)
      await this.handleQueueItemFailure(item, error instanceof Error ? error.message : "Unknown error")
    }
  }

  /**
   * Handle queue item failure with retry logic
   */
  private async handleQueueItemFailure(item: QueuedExecution, errorMessage: string): Promise<void> {
    const supabase = getSupabaseAdmin()

    const newRetryCount = item.retry_count + 1

    if (newRetryCount <= item.max_retries) {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, newRetryCount) * 60 * 1000 // 2^n minutes
      const nextRetryAt = new Date(Date.now() + retryDelay)

      await supabase
        .from("execution_queue")
        .update({
          status: "pending",
          retry_count: newRetryCount,
          scheduled_at: nextRetryAt.toISOString(),
          error_message: errorMessage,
        })
        .eq("id", item.id)

      console.log(`🔄 Scheduled retry ${newRetryCount}/${item.max_retries} for queue item ${item.id}`)
    } else {
      // Max retries reached, mark as failed
      await supabase
        .from("execution_queue")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", item.id)

      console.log(`❌ Queue item ${item.id} failed after ${item.max_retries} retries`)
    }
  }

  /**
   * Get queue status for an agent
   */
  async getAgentQueueStatus(agentId: string): Promise<QueuedExecution | null> {
    try {
      const supabase = getSupabaseAdmin()

      const { data, error } = await supabase
        .from("execution_queue")
        .select("*")
        .eq("agent_id", agentId)
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching queue status:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error getting agent queue status:", error)
      return null
    }
  }

  /**
   * Cancel queued execution
   */
  async cancelExecution(queueId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabaseAdmin()

      const { error } = await supabase
        .from("execution_queue")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", queueId)
        .eq("status", "pending") // Can only cancel pending items

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    total: number
  }> {
    try {
      const supabase = getSupabaseAdmin()

      const { data, error } = await supabase
        .from("execution_queue")
        .select("status")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      if (error) {
        console.error("Error fetching queue stats:", error)
        return { pending: 0, running: 0, completed: 0, failed: 0, total: 0 }
      }

      const stats = {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        total: data?.length || 0,
      }

      data?.forEach((item) => {
        if (item.status in stats) {
          stats[item.status as keyof typeof stats]++
        }
      })

      return stats
    } catch (error) {
      console.error("Error calculating queue stats:", error)
      return { pending: 0, running: 0, completed: 0, failed: 0, total: 0 }
    }
  }
}

export const executionQueue = AgentExecutionQueue.getInstance()
