"use client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useActionState } from "react"
import { deployAgent } from "@/app/onboarding/review-deploy/actions"
import { CheckCircle, Rocket, AlertTriangle, Loader2 } from "lucide-react"

interface ReviewDeployClientProps {
  userId: string
  templateSlug: string
  templateName: string
  agentName: string
}

export default function ReviewDeployClient({ userId, templateSlug, templateName, agentName }: ReviewDeployClientProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(deployAgent, {})

  // Handle successful deployment
  if (state?.success && state?.agentId) {
    return (
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">Agent Successfully Deployed!</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Your agent is now active and ready to start working.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
            <CardDescription>Your agent has been created and is ready to use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent Name</p>
              <p className="text-lg font-medium">{agentName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Template</p>
              <p>{templateName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
              <div className="flex items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
                <p>Active</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white"
              onClick={() => router.push(`/dashboard/agents/${state.agentId}`)}
            >
              View Agent Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="text-center">
        <Rocket className="mx-auto h-12 w-12 text-[#007AFF]" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">Ready to Deploy Your Agent</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Review your configuration and deploy your agent</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
          <CardDescription>Review your agent details before deployment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent Name</p>
            <p className="text-lg font-medium">{agentName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Template</p>
            <p>{templateName}</p>
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Deployment Failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="templateSlug" value={templateSlug} />
        <input type="hidden" name="agentName" value={agentName} />

        <Button
          type="submit"
          className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white text-lg py-3 flex items-center justify-center gap-2"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Deploying Agent...
            </>
          ) : (
            <>
              Deploy Agent
              <Rocket className="h-5 w-5" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
