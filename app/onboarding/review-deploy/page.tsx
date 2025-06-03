import { Suspense } from "react"
import { getDefaultUserId } from "@/lib/default-user"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import ReviewDeployClient from "@/components/review-deploy-client"
import { getTemplateById } from "@/lib/agent-templates"

export default async function ReviewDeployPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    redirect("/login")
  }

  const templateSlug = typeof searchParams.template === "string" ? searchParams.template : "custom-agent"
  const agentName = typeof searchParams.name === "string" ? searchParams.name : "My Agent"

  const template = getTemplateById(templateSlug)
  const templateName = template?.name || "Custom Agent"

  return (
    <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <Suspense
        fallback={
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p>Loading review page...</p>
            </CardContent>
          </Card>
        }
      >
        <ReviewDeployClient
          userId={userId}
          templateSlug={templateSlug}
          templateName={templateName}
          agentName={agentName}
        />
      </Suspense>
    </div>
  )
}
