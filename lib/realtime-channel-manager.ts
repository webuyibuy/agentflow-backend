import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { AccurateRealtimeMonitor } from "@/components/realtime-status-indicator"
import type { RealtimeChannel } from "@supabase/supabase-js"

export class RealtimeChannelManager {
  private static instance: RealtimeChannelManager
  private supabase = getSupabaseBrowserClient()
  private monitor = AccurateRealtimeMonitor.getInstance()
  private managedChannels: Map<string, RealtimeChannel> = new Map()

  static getInstance(): RealtimeChannelManager {
    if (!RealtimeChannelManager.instance) {
      RealtimeChannelManager.instance = new RealtimeChannelManager()
    }
    return RealtimeChannelManager.instance
  }

  /**
   * Create and manage a realtime channel with proper monitoring
   */
  createChannel(channelName: string, config?: any): RealtimeChannel {
    // Remove existing channel if it exists
    this.removeChannel(channelName)

    console.log(`🔌 Creating managed channel: ${channelName}`)

    const channel = this.supabase.channel(channelName, config)

    // Track subscription status
    channel.subscribe((status, err) => {
      console.log(`📡 Channel ${channelName} status:`, status, err)

      if (status === "SUBSCRIBED") {
        this.monitor.registerChannel(channelName, channel)
        console.log(`✅ Channel ${channelName} is now functional`)
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        this.monitor.unregisterChannel(channelName)
        this.managedChannels.delete(channelName)
        console.log(`❌ Channel ${channelName} is no longer functional`)
      }
    })

    this.managedChannels.set(channelName, channel)
    return channel
  }

  /**
   * Remove a managed channel
   */
  removeChannel(channelName: string): boolean {
    const channel = this.managedChannels.get(channelName)
    if (channel) {
      console.log(`🗑️ Removing managed channel: ${channelName}`)
      this.supabase.removeChannel(channel)
      this.monitor.unregisterChannel(channelName)
      this.managedChannels.delete(channelName)
      return true
    }
    return false
  }

  /**
   * Get all managed channels
   */
  getManagedChannels(): string[] {
    return Array.from(this.managedChannels.keys())
  }

  /**
   * Clean up all managed channels
   */
  cleanup(): void {
    console.log("🧹 Cleaning up all managed channels")
    for (const [channelName, channel] of this.managedChannels) {
      this.supabase.removeChannel(channel)
      this.monitor.unregisterChannel(channelName)
    }
    this.managedChannels.clear()
  }
}

// Convenience function for creating managed channels
export function createManagedChannel(channelName: string, config?: any): RealtimeChannel {
  return RealtimeChannelManager.getInstance().createChannel(channelName, config)
}

// Convenience function for removing managed channels
export function removeManagedChannel(channelName: string): boolean {
  return RealtimeChannelManager.getInstance().removeChannel(channelName)
}
