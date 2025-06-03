"use client"

import { useActionState, useEffect, useState } from "react"
import { updateProfile, type ProfileUpdateState } from "@/app/dashboard/settings/profile/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

interface ProfileSettingsFormProps {
  email: string
  currentDisplayName: string | null
}

export default function ProfileSettingsForm({ email, currentDisplayName }: ProfileSettingsFormProps) {
  const initialState: ProfileUpdateState = {}
  const [state, formAction, isPending] = useActionState(updateProfile, initialState)
  const [displayName, setDisplayName] = useState(currentDisplayName || "")

  // Optional: Show a toast or clear message after a delay
  useEffect(() => {
    if (state?.message || state?.error) {
      const timer = setTimeout(() => {
        // Could clear the message here if desired, or rely on user interaction
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-6 max-w-md">
      {state?.success && state.message && (
        <Alert className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {state?.error && !state.fieldErrors && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Update Failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled className="bg-gray-100 dark:bg-gray-800" />
        <p className="text-xs text-muted-foreground">Your email address cannot be changed.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          minLength={2}
          maxLength={50}
          required
          aria-describedby="displayName-error"
        />
        {state?.fieldErrors?.displayName && (
          <p id="displayName-error" className="text-sm text-red-600 mt-1">
            {state.fieldErrors.displayName.join(", ")}
          </p>
        )}
        {!state?.fieldErrors?.displayName && (
          <p className="text-xs text-muted-foreground">This name will be displayed publicly and to your agents.</p>
        )}
      </div>

      <Button type="submit" className="bg-[#007AFF] hover:bg-[#0056b3] text-white" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Profile Changes"
        )}
      </Button>
    </form>
  )
}
