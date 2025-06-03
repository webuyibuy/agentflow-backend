import { getSupabaseAdmin } from "@/lib/supabase/server"
import { sendSlackNotification } from "@/lib/slack-notifications"

export interface SystemAlert {
  id: string
  alert_type: "critical" | "warning" | "info" | "maintenance"
  title: string
  message: string
  severity: number
  is_resolved: boolean
  resolved_by?: string
  resolved_at?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MonitoringRule {
  id: string
  rule_name: string
  rule_type: "threshold" | "anomaly" | "pattern"
  condition_query: string
  threshold_value: number
  alert_type: "critical" | "warning" | "info"
  notification_channels: string[]
  is_active: boolean
  last_checked?: string
  created_at: string
  updated_at: string
}

export interface MonitoringResult {
  rule_id: string
  rule_name: string
  current_value: number
  threshold_value: number
  should_alert: boolean
}

export class MonitoringSystem {
  private supabaseAdmin = getSupabaseAdmin()

  async checkAllRules(): Promise<{ alerts: SystemAlert[]; results: MonitoringResult[] }> {
    try {
      // Run the monitoring check function
      const { data: results, error: checkError } = await this.supabaseAdmin.rpc("check_monitoring_rules")

      if (checkError) {
        console.error("Error checking monitoring rules:", checkError)
        return { alerts: [], results: [] }
      }

      const alerts: SystemAlert[] = []

      // Create alerts for rules that exceeded thresholds
      for (const result of results) {
        if (result.should_alert) {
          // Get the rule details
          const { data: rule, error: ruleError } = await this.supabaseAdmin
            .from("monitoring_rules")
            .select("*")
            .eq("id", result.rule_id)
            .single()

          if (ruleError || !rule) {
            console.error("Error fetching rule details:", ruleError)
            continue
          }

          // Create an alert
          const { data: alert, error: alertError } = await this.supabaseAdmin
            .from("system_alerts")
            .insert({
              alert_type: rule.alert_type,
              title: `Monitoring Alert: ${rule.rule_name}`,
              message: `The ${rule.rule_name} rule has been triggered. Current value: ${result.current_value}, Threshold: ${rule.threshold_value}`,
              severity: rule.alert_type === "critical" ? 5 : rule.alert_type === "warning" ? 3 : 1,
              metadata: {
                rule_id: rule.id,
                rule_name: rule.rule_name,
                current_value: result.current_value,
                threshold_value: rule.threshold_value,
              },
            })
            .select()
            .single()

          if (alertError) {
            console.error("Error creating alert:", alertError)
            continue
          }

          alerts.push(alert as SystemAlert)

          // Send notifications
          await this.sendAlertNotifications(alert as SystemAlert, rule.notification_channels)
        }
      }

      return { alerts, results: results as MonitoringResult[] }
    } catch (error) {
      console.error("Error in checkAllRules:", error)
      return { alerts: [], results: [] }
    }
  }

  async getActiveAlerts(): Promise<SystemAlert[]> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from("system_alerts")
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching active alerts:", error)
        return []
      }

      return data as SystemAlert[]
    } catch (error) {
      console.error("Error in getActiveAlerts:", error)
      return []
    }
  }

  async resolveAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseAdmin
        .from("system_alerts")
        .update({
          is_resolved: true,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", alertId)

      if (error) {
        console.error("Error resolving alert:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in resolveAlert:", error)
      return false
    }
  }

  private async sendAlertNotifications(alert: SystemAlert, channels: string[]): Promise<void> {
    try {
      // Send to Slack
      if (channels.includes("slack")) {
        await sendSlackNotification(`*${alert.alert_type.toUpperCase()}*: ${alert.title}\n${alert.message}`)
      }

      // Email notifications would be implemented here
      if (channels.includes("email")) {
        // Implement email sending logic
        console.log("Would send email notification:", alert.title)
      }
    } catch (error) {
      console.error("Error sending alert notifications:", error)
    }
  }
}

// Create a singleton instance
export const monitoringSystem = new MonitoringSystem()
