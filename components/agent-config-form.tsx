"use client"
import { useActionState } from "react"
import { useState, useEffect } from "react"
import { storeAgentConfiguration, type AgentConfigState } from "@/app/onboarding/agent-config/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, Settings, Terminal, ArrowRight } from "lucide-react"
import CustomQuestionsForm from "./custom-questions-form"
import { useRouter } from "next/navigation"

interface AgentConfigFormProps {
  templateSlug: string
  templateName?: string // e.g., "Sales Agent", "Custom Agent"
}

const templatePlaceholders: Record<string, { goal?: string; behavior?: string }> = {
  "sales-lead-generator": {
    goal: "e.g., Generate 20 qualified leads per week for Product X.",
    behavior:
      "Proactively reach out to prospects on LinkedIn, follow up via email, and schedule demos for interested leads. Focus on tech startups in North America.",
  },
  "marketing-content-manager": {
    goal: "e.g., Increase social media engagement by 15% this quarter.",
    behavior:
      "Create and schedule engaging content for Twitter and LinkedIn, monitor brand mentions, and run targeted ad campaigns for new feature announcements.",
  },
  "developer-assistant": {
    goal: "e.g., Automate the deployment pipeline for the main application.",
    behavior:
      "Monitor the main branch for new commits, run automated tests, build the application, and deploy to staging. Notify the team on Slack of successes or failures.",
  },
  "hr-recruitment-specialist": {
    goal: "e.g., Shortlist 5 top candidates for the Senior Engineer role by end of next week.",
    behavior:
      "Source candidates from LinkedIn Recruiter and job boards, screen resumes based on predefined criteria, conduct initial automated screenings, and schedule interviews for qualified candidates.",
  },
  "custom-agent": {
    goal: "e.g., Organize my research notes and draft a weekly summary.",
    behavior:
      "Monitor specific RSS feeds and websites, extract relevant information, categorize notes, and compile a structured summary document every Friday.",
  },
}

export default function AgentConfigForm({ templateSlug, templateName }: AgentConfigFormProps) {
  const initialState: AgentConfigState = {}
  const [state, formAction, isPending] = useActionState(storeAgentConfiguration, initialState)
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({})
  const router = useRouter()

  const placeholders = templatePlaceholders[templateSlug] || templatePlaceholders["custom-agent"]
  const [agentGoal, setAgentGoal] = useState<string>("")

  // Handle redirect after successful form submission
  useEffect(() => {
    if (state?.success && state?.redirectTo) {
      router.push(state.redirectTo)
    }
  }, [state, router])

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="text-center">
        <Settings className="mx-auto h-12 w-12 text-[#007AFF]" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Configure Your {templateName || "Agent"}
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Let's set up the details for your new{" "}
          {templateSlug === "custom-agent" ? "custom" : templateName?.toLowerCase() || "agent"}.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="templateSlug" value={templateSlug} />

        <div>
          <Label htmlFor="agentName" className="font-medium text-gray-700 dark:text-gray-300">
            Agent Name
          </Label>
          <Input
            id="agentName"
            name="agentName"
            placeholder={`e.g., My ${templateName || "Assistant"}`}
            required
            minLength={3}
            maxLength={50}
            className="mt-1"
            aria-describedby="agentName-error"
          />
          {state?.errors?.agentName && (
            <p id="agentName-error" className="mt-1 text-sm text-red-600">
              {state.errors.agentName.join(", ")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="agentGoal" className="font-medium text-gray-700 dark:text-gray-300">
            Primary Goal
          </Label>
          <Textarea
            id="agentGoal"
            name="agentGoal"
            placeholder={placeholders.goal || "What is the main objective for this agent?"}
            required
            minLength={10}
            maxLength={500}
            className="mt-1 min-h-[100px]"
            aria-describedby="agentGoal-error"
            onChange={(e) => setAgentGoal(e.target.value)}
          />
          {state?.errors?.agentGoal && (
            <p id="agentGoal-error" className="mt-1 text-sm text-red-600">
              {state.errors.agentGoal.join(", ")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="agentBehavior" className="font-medium text-gray-700 dark:text-gray-300">
            Behavior / Instructions {templateSlug !== "custom-agent" && "(Optional)"}
          </Label>
          <Textarea
            id="agentBehavior"
            name="agentBehavior"
            placeholder={
              placeholders.behavior ||
              "Describe how the agent should operate, its personality, specific tasks, or constraints."
            }
            maxLength={1000}
            className="mt-1 min-h-[120px]"
            aria-describedby="agentBehavior-error"
            required={templateSlug === "custom-agent"}
          />
          {state?.errors?.agentBehavior && (
            <p id="agentBehavior-error" className="mt-1 text-sm text-red-600">
              {state.errors.agentBehavior.join(", ")}
            </p>
          )}
          {templateSlug === "custom-agent" && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              For custom agents, be as detailed as possible.
            </p>
          )}
        </div>

        <CustomQuestionsForm
          templateSlug={templateSlug}
          templateName={templateName || "Agent"}
          agentGoal={agentGoal}
          onAnswersChange={setCustomAnswers}
        />

        <div className="space-y-2 rounded-md border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">Tool Access</h3>
          <div className="flex items-center space-x-2 rounded-md bg-blue-50 dark:bg-blue-900/30 p-3 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-5 w-5 flex-shrink-0" />
            <p>
              Tool selection and integration (e.g., n8n, Lyzr) will be configurable here soon. For now, agents will use
              a default set of capabilities.
            </p>
          </div>
        </div>

        {state?.message && (
          <Alert variant={state.errors?._form || state.errors ? "destructive" : "default"}>
            <Terminal className="h-4 w-4" />
            <AlertTitle>{state.errors?._form || state.errors ? "Error" : "Notice"}</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <input type="hidden" name="customAnswers" value={JSON.stringify(customAnswers)} />

        <Button
          type="submit"
          className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white text-lg py-3 flex items-center justify-center gap-2"
          disabled={isPending}
        >
          {isPending ? "Saving Configuration..." : "Proceed to Review"}
          {!isPending && <ArrowRight className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  )
}
