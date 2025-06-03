"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

interface AuthFormProps {
  onSwitchForm: (formType: "signin" | "signup" | "forgot-password") => void
}

export function SignInForm({ onSwitchForm }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
    } else {
      setMessage("Signed in successfully! Redirecting...")
      // Supabase client handles session and redirect automatically if successful
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold" style={{ color: "#007AFF" }}>
          AgentFlow
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Sign in to manage your AI agents</p>
      </div>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <Label htmlFor="email-signin" className="text-gray-700">
            Email
          </Label>
          <Input
            id="email-signin"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="password-signin" className="text-gray-700">
            Password
          </Label>
          <Input
            id="password-signin"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <button onClick={() => onSwitchForm("signup")} className="text-[#007AFF] hover:underline">
          Don't have an account? Sign Up
        </button>
        <br />
        <button onClick={() => onSwitchForm("forgot-password")} className="text-[#007AFF] hover:underline mt-2">
          Forgot your password?
        </button>
      </div>
      {message && (
        <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700">
          <Terminal className="h-4 w-4 !text-blue-700" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-center text-gray-500">By signing in, you agree to our imaginary Terms of Service.</p>
    </div>
  )
}

export function SignUpForm({ onSwitchForm }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username, // Pass username to the user metadata
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
    } else if (data.user) {
      // If email confirmation is required, Supabase sends a magic link.
      // If not, the user is signed in directly.
      setMessage("Sign up successful! Please check your email to confirm your account.")
      // For direct sign-in, you might want to redirect here
      // router.push('/dashboard');
    } else {
      setMessage("Sign up successful! Please check your email to confirm your account.")
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold" style={{ color: "#007AFF" }}>
          AgentFlow
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Create your AI AgentFlow account</p>
      </div>
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <Label htmlFor="username-signup" className="text-gray-700">
            Username
          </Label>
          <Input
            id="username-signup"
            type="text"
            placeholder="your_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="email-signup" className="text-gray-700">
            Email
          </Label>
          <Input
            id="email-signup"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="password-signup" className="text-gray-700">
            Password
          </Label>
          <Input
            id="password-signup"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white" disabled={loading}>
          {loading ? "Signing Up..." : "Sign Up"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <button onClick={() => onSwitchForm("signin")} className="text-[#007AFF] hover:underline">
          Already have an account? Sign In
        </button>
      </div>
      {message && (
        <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700">
          <Terminal className="h-4 w-4 !text-blue-700" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-center text-gray-500">By signing up, you agree to our imaginary Terms of Service.</p>
    </div>
  )
}

export function ForgotPasswordForm({ onSwitchForm }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage("Password reset email sent. Check your inbox!")
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold" style={{ color: "#007AFF" }}>
          AgentFlow
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Reset your password</p>
      </div>
      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div>
          <Label htmlFor="email-forgot" className="text-gray-700">
            Email
          </Label>
          <Input
            id="email-forgot"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <button onClick={() => onSwitchForm("signin")} className="text-[#007AFF] hover:underline">
          Back to Sign In
        </button>
      </div>
      {message && (
        <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700">
          <Terminal className="h-4 w-4 !text-blue-700" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
