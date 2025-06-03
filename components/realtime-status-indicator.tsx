"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { WifiIcon, WifiOffIcon, ActivityIcon } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { motion } from "framer-motion"

interface RealtimeStatusIndicatorProps {
  channels?: string[]
  className?: string
  showChannelCount?: boolean
}

// Global state management for accurate realtime monitoring
class AccurateRealtimeMonitor {
  private static instance: AccurateRealtimeMonitor
  private connectionStatus: "connecting" | "connected" | "disconnected" = "connecting"
  private activeChannels: Map<string, RealtimeChannel> = new Map()
  private listeners: Set<(status: string, channels: number) => void> = new Set()
  private healthCheckChannel: RealtimeChannel | null = null
  private monitoringInterval: NodeJS.Timeout | null = null
  private supabase = getSupabaseBrowserClient()
  private isMonitoring = false

  static getInstance(): AccurateRealtimeMonitor {
    if (!AccurateRealtimeMonitor.instance) {
      AccurateRealtimeMonitor.instance = new AccurateRealtimeMonitor()
    }
    return AccurateRealtimeMonitor.instance
  }

  subscribe(callback: (status: string, channels: number) => void) {
    this.listeners.add(callback)

    // Provide current accurate status
    callback(this.connectionStatus, this.getActiveChannelCount())

    // Start monitoring if this is the first subscriber
    if (this.listeners.size === 1 && !this.isMonitoring) {
      this.startAccurateMonitoring()
    }

    return () => {
      this.listeners.delete(callback)
      // Stop monitoring if no more subscribers
      if (this.listeners.size === 0) {
        this.stopMonitoring()
      }
    }
  }

  private startAccurateMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    console.log("🔍 Starting accurate realtime monitoring...")

    // Create a health check channel to monitor actual connection
    this.healthCheckChannel = this.supabase
      .channel(`health-check-${Date.now()}`)
      .on("presence", { event: "sync" }, () => {
        console.log("✅ Presence sync - connection is healthy")
      })
      .subscribe((status, err) => {
        console.log("📡 Health check channel status:", status, err)

        if (status === "SUBSCRIBED") {
          this.updateConnectionStatus("connected")
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.updateConnectionStatus("disconnected")
        } else if (status === "JOINING") {
          this.updateConnectionStatus("connecting")
        }
      })

    // Monitor actual channel activity every 2 seconds
    this.monitoringInterval = setInterval(() => {
      this.auditActiveChannels()
    }, 2000)

    // Initial audit
    setTimeout(() => this.auditActiveChannels(), 1000)
  }

  private stopMonitoring() {
    if (!this.isMonitoring) return
    this.isMonitoring = false

    console.log("🛑 Stopping realtime monitoring...")

    if (this.healthCheckChannel) {
      this.supabase.removeChannel(this.healthCheckChannel)
      this.healthCheckChannel = null
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    // Clear all tracked channels
    this.activeChannels.clear()
    this.updateConnectionStatus("disconnected")
  }

  private auditActiveChannels() {
    try {
      // Get all channels from Supabase
      const allChannels = this.supabase.realtime.channels || []

      // Clear our tracking
      this.activeChannels.clear()

      // Only count channels that are actually subscribed and functional
      let functionalChannels = 0

      for (const channel of allChannels) {
        const isHealthCheck = channel.topic.includes("health-check")
        const isSubscribed = channel.state === "joined"
        const isAgentRelated =
          channel.topic.includes("agent") ||
          channel.topic.includes("deployment") ||
          channel.topic.includes("task") ||
          channel.topic.includes("notification")

        // Only count non-health-check channels that are actually subscribed
        if (isSubscribed && !isHealthCheck) {
          if (isAgentRelated) {
            this.activeChannels.set(channel.topic, channel)
            functionalChannels++
          }
        }
      }

      console.log(`📊 Channel audit: ${functionalChannels} functional channels out of ${allChannels.length} total`)

      // Notify listeners of the accurate count
      this.notifyListeners()
    } catch (error) {
      console.error("❌ Error during channel audit:", error)
      this.activeChannels.clear()
      this.notifyListeners()
    }
  }

  private updateConnectionStatus(status: "connecting" | "connected" | "disconnected") {
    if (this.connectionStatus !== status) {
      console.log(`🔄 Connection status changed: ${this.connectionStatus} → ${status}`)
      this.connectionStatus = status
      this.notifyListeners()
    }
  }

  private getActiveChannelCount(): number {
    return this.activeChannels.size
  }

  private notifyListeners() {
    const channelCount = this.getActiveChannelCount()
    this.listeners.forEach((callback) => {
      try {
        callback(this.connectionStatus, channelCount)
      } catch (error) {
        console.error("❌ Error notifying realtime status listener:", error)
      }
    })
  }

  // Public method to register a new functional channel
  registerChannel(channelName: string, channel: RealtimeChannel) {
    if (channel.state === "joined") {
      this.activeChannels.set(channelName, channel)
      this.notifyListeners()
      console.log(`✅ Registered functional channel: ${channelName}`)
    }
  }

  // Public method to unregister a channel
  unregisterChannel(channelName: string) {
    if (this.activeChannels.delete(channelName)) {
      this.notifyListeners()
      console.log(`🗑️ Unregistered channel: ${channelName}`)
    }
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      channels: this.getActiveChannelCount(),
      channelDetails: Array.from(this.activeChannels.keys()),
    }
  }
}

export default function RealtimeStatusIndicator({ className }: RealtimeStatusIndicatorProps) {
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")
  const [activeChannels, setActiveChannels] = useState<number>(0)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const monitor = AccurateRealtimeMonitor.getInstance()

    const unsubscribe = monitor.subscribe((status, channels) => {
      setConnectionStatus(status)
      setActiveChannels(channels)
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  const isConnected = connectionStatus === "connected"
  const isConnecting = connectionStatus === "connecting"

  return (
    <div className={`flex items-center gap-2 ${className}`} role="status" aria-live="polite">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Badge
          variant={isConnected ? "default" : isConnecting ? "secondary" : "destructive"}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all duration-200
            ${
              isConnected
                ? "bg-green-500 hover:bg-green-600 text-white border-green-600"
                : isConnecting
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600"
                  : "bg-red-500 hover:bg-red-600 text-white border-red-600"
            }
          `}
          title={`Realtime connection: ${connectionStatus}`}
        >
          {isConnected ? <WifiIcon className="h-3 w-3" /> : <WifiOffIcon className="h-3 w-3" />}
          {isConnected ? "Live" : isConnecting ? "Connecting" : "Offline"}
        </Badge>
      </motion.div>

      {activeChannels > 0 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Badge
            variant="secondary"
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 text-xs font-medium transition-all duration-200"
            title={`Active functional channels: ${activeChannels}`}
          >
            <ActivityIcon className="h-3 w-3" />
            {activeChannels} {activeChannels === 1 ? "channel" : "channels"}
          </Badge>
        </motion.div>
      )}
    </div>
  )
}

// Export the monitor for other components to register their channels
export { AccurateRealtimeMonitor }
