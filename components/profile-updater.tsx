"use client"

import { useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function ProfileUpdater() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Subscribe to profile changes
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          // Refresh the page when profile is updated
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  return null
}
