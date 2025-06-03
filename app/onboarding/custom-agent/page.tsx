import { Suspense } from "react"
import type { Metadata } from "next"
import { getDefaultUserId } from "@/lib/default-user"
import { redirect } from "next/navigation"
import CustomAgentChat from "@/components/custom-agent-chat"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Create Custom Agent - AgentFlow",
}

export default async function CustomAgentPage() {
  let userId: string
  try {
    userId = await getDefaultUserId()
  } catch (error) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Suspense
        fallback={
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p>Loading custom agent creator...</p>
            </CardContent>
          </Card>
        }
      >
        <CustomAgentChat userId={userId} />
      </Suspense>
    </div>
  )
}
