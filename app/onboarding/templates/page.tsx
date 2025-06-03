import { Suspense } from "react"
import { getDefaultUserId } from "@/lib/default-user"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import AgentTemplateSelector from "@/components/agent-template-selector"

export default async function TemplatesPage() {
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Choose an Agent Template</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select a template to quickly create an agent tailored to your specific needs
        </p>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p>Loading templates...</p>
            </CardContent>
          </Card>
        }
      >
        <AgentTemplateSelector />
      </Suspense>
    </div>
  )
}
