"use client"

/**
 * Production-ready navigation system with robust error handling
 */

import { useRouter } from "next/navigation"

export class NavigationManager {
  private static instance: NavigationManager
  private navigationHistory: string[] = []
  private retryAttempts = 0
  private maxRetries = 3

  static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager()
    }
    return NavigationManager.instance
  }

  constructor() {
    this.router = useRouter()
  }

  private router: any

  async navigateWithFallback(
    targetUrl: string,
    options: {
      method?: "router" | "window" | "both"
      timeout?: number
      onSuccess?: () => void
      onError?: (error: Error) => void
      retryOnFailure?: boolean
    } = {},
  ): Promise<boolean> {
    const { method = "both", timeout = 5000, onSuccess, onError, retryOnFailure = true } = options

    try {
      // Track navigation attempt
      this.navigationHistory.push(targetUrl)

      if (method === "router" || method === "both") {
        // Try Next.js router first
        const navigationPromise = new Promise<boolean>((resolve) => {
          this.router.push(targetUrl)

          // Check if navigation succeeded after a delay
          setTimeout(() => {
            if (window.location.pathname === targetUrl) {
              resolve(true)
            } else {
              resolve(false)
            }
          }, 1000)
        })

        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), timeout)
        })

        const success = await Promise.race([navigationPromise, timeoutPromise])

        if (success) {
          onSuccess?.()
          this.retryAttempts = 0
          return true
        }
      }

      if (method === "window" || method === "both") {
        // Fallback to window.location
        window.location.href = targetUrl
        return true
      }

      throw new Error("Navigation method not supported")
    } catch (error) {
      console.error("Navigation failed:", error)

      if (retryOnFailure && this.retryAttempts < this.maxRetries) {
        this.retryAttempts++
        console.log(`Retrying navigation (attempt ${this.retryAttempts}/${this.maxRetries})`)

        return new Promise((resolve) => {
          setTimeout(() => {
            this.navigateWithFallback(targetUrl, options).then(resolve)
          }, 1000 * this.retryAttempts)
        })
      }

      onError?.(error as Error)
      return false
    }
  }

  getNavigationHistory(): string[] {
    return [...this.navigationHistory]
  }

  clearHistory(): void {
    this.navigationHistory = []
    this.retryAttempts = 0
  }
}
