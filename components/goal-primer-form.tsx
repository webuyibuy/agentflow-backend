"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowRight, Target } from "lucide-react"

interface GoalPrimerFormProps {
  userName?: string | null
}

export default function GoalPrimerForm({ userName }: GoalPrimerFormProps) {
  const [goal, setGoal] = useState("")
  const router = useRouter()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (goal.trim()) {
      // For now, we'll just navigate.
      // In a more complex scenario, we might pass the goal via query params or context.
      router.push("/onboarding/agent-suggestion")
    }
  }

  return (
    <div className="w-full max-w-lg space-y-8">
      <div className="text-center">
        <Target className="mx-auto h-12 w-12 text-[#007AFF]" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">Great, {userName || "there"}!</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">What big outcome are we aiming for first?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="goal" className="sr-only">
            Your Goal
          </Label>
          <Textarea
            id="goal"
            name="goal"
            placeholder="e.g., 'Double my monthly recurring revenue in 6 months', 'Streamline our new hire onboarding process', 'Find 10 qualified leads for our new SaaS product'..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
            minLength={10}
            className="min-h-[120px] text-base"
            aria-describedby="goal-description"
          />
          <p id="goal-description" className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Describe the main objective you want to achieve with your first agent. Be specific!
          </p>
        </div>
        <Button
          type="submit"
          className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white text-lg py-3 flex items-center justify-center gap-2"
          disabled={!goal.trim() || goal.trim().length < 10}
        >
          Set Goal & Continue
          <ArrowRight className="h-5 w-5" />
        </Button>
      </form>
    </div>
  )
}
