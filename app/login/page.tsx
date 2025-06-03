"use client"

import { useState, useEffect } from "react"
import { SignInForm, SignUpForm, ForgotPasswordForm } from "@/components/auth-forms"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [formType, setFormType] = useState<"signin" | "signup" | "forgot-password">("signin")
  const [loadingSession, setLoadingSession] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        // Client-side redirect after session check
        window.location.href = "/dashboard"
      } else {
        setLoadingSession(false)
      }
    }

    checkSession()

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.href = "/dashboard"
      }
    })

    return () => {
      authListener?.unsubscribe()
    }
  }, [supabase])

  if (loadingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  const renderForm = () => {
    switch (formType) {
      case "signin":
        return <SignInForm onSwitchForm={setFormType} />
      case "signup":
        return <SignUpForm onSwitchForm={setFormType} />
      case "forgot-password":
        return <ForgotPasswordForm onSwitchForm={setFormType} />
      default:
        return <SignInForm onSwitchForm={setFormType} />
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      {renderForm()}
    </div>
  )
}
