"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, BarChart2, Code, Users, Zap, ArrowRight } from "lucide-react"

interface AgentTemplate {
  slug: string
  name: string
  description: string
  icon: React.ElementType
}

const agentTemplates: AgentTemplate[] = [
  { slug: "sales", name: "Sales Agent", description: "Automate lead generation and outreach.", icon: BarChart2 },
  {
    slug: "marketing",
    name: "Marketing Agent",
    description: "Manage campaigns and analyze performance.",
    icon: Briefcase,
  },
  { slug: "dev", name: "Developer Agent", description: "Assist with coding tasks and CI/CD.", icon: Code },
  { slug: "hr", name: "HR Agent", description: "Streamline recruitment and onboarding.", icon: Users },
]

const customAgent: AgentTemplate = {
  slug: "custom",
  name: "Build Custom Agent",
  description: "Tailor an agent to your specific needs.",
  icon: Zap,
}

export default function AgentSuggestionForm() {
  const router = useRouter()

  const handleSelectTemplate = (slug: string) => {
    router.push(`/onboarding/agent-config?template=${slug}`)
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center">
        <Zap className="mx-auto h-12 w-12 text-[#007AFF]" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Sounds like a job for a specialist!
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Pick a pre-configured agent template or build your own from scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agentTemplates.map((template) => (
          <Card
            key={template.slug}
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
            onClick={() => handleSelectTemplate(template.slug)}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleSelectTemplate(template.slug)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <template.icon className="h-8 w-8 text-[#007AFF]" />
                <CardTitle className="text-xl group-hover:text-[#007AFF] transition-colors">{template.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{template.description}</CardDescription>
              <Button
                variant="link"
                className="p-0 h-auto mt-4 text-[#007AFF] group-hover:underline"
                onClick={(e) => {
                  e.stopPropagation() // Prevent card click handler if button is clicked directly
                  handleSelectTemplate(template.slug)
                }}
              >
                Choose {template.name} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 group border-2 border-dashed border-[#007AFF] hover:border-[#0056b3]"
        onClick={() => handleSelectTemplate(customAgent.slug)}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleSelectTemplate(customAgent.slug)}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <customAgent.icon className="h-8 w-8 text-[#007AFF]" />
            <CardTitle className="text-xl group-hover:text-[#007AFF] transition-colors">{customAgent.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>{customAgent.description}</CardDescription>
          <Button
            variant="link"
            className="p-0 h-auto mt-4 text-[#007AFF] group-hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectTemplate(customAgent.slug)
            }}
          >
            Build a Custom Agent <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
