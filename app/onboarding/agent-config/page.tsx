import { redirect } from "next/navigation"
import { getDefaultUserId } from "@/lib/default-user"
import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import AgentChatSetup from "@/components/agent-chat-setup"
import { getTemplateById } from "@/lib/agent-templates"

interface PageProps {
  searchParams: {
    template?: string
    name?: string
  }
}

export default async function AgentConfigPage({ searchParams }: PageProps) {
  // Get user ID using existing pattern
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    redirect("/login")
  }

  // Get template from query params
  const templateSlug = searchParams.template || "custom-agent"
  const template = getTemplateById(templateSlug)
  const templateName = template?.name || searchParams.name || "Custom Agent"

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Suspense
        fallback={
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p>Loading agent setup...</p>
            </CardContent>
          </Card>
        }
      >
        <AgentChatSetup templateSlug={templateSlug} templateName={templateName} userId={userId} template={template} />
      </Suspense>
    </div>
  )
}
