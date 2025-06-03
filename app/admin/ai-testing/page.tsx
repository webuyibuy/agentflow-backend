import type { Metadata } from "next"
import AITestingDashboard from "@/components/ai-testing-dashboard"

export const metadata: Metadata = {
  title: "AI System Testing | AgentFlow Admin",
  description: "Test and validate AI functions before launch",
}

export default function AITestingPage() {
  return (
    <div className="container mx-auto py-6">
      <AITestingDashboard />
    </div>
  )
}
