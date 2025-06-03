"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Users, Briefcase, Code, MessageSquare, Sparkles, Lightbulb, Settings } from "lucide-react"

interface AgentCreationWizardProps {
  userId: string
}

interface AgentTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  isCustom?: boolean
}

const agentOptions: AgentTemplate[] = [
  {
    id: "sales",
    name: "Sales Assistant",
    description: "Generate leads, follow up with prospects, and manage sales pipeline",
    icon: <Users className="h-6 w-6" />,
    category: "Business",
  },
  {
    id: "marketing",
    name: "Marketing Manager",
    description: "Create content, manage social media, and run marketing campaigns",
    icon: <MessageSquare className="h-6 w-6" />,
    category: "Business",
  },
  {
    id: "developer",
    name: "Development Assistant",
    description: "Code review, documentation, testing, and development workflow automation",
    icon: <Code className="h-6 w-6" />,
    category: "Technical",
  },
  {
    id: "support",
    name: "Customer Support",
    description: "Handle customer inquiries, resolve issues, and improve satisfaction",
    icon: <Briefcase className="h-6 w-6" />,
    category: "Business",
  },
  {
    id: "custom",
    name: "Custom Agent",
    description: "Create a completely custom agent tailored to your unique needs and requirements",
    icon: <Sparkles className="h-6 w-6" />,
    category: "Custom",
    isCustom: true,
  },
]

export default function AgentCreationWizard({ userId }: AgentCreationWizardProps) {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<AgentTemplate | null>(null)

  const handleOptionSelect = (option: AgentTemplate) => {
    setSelectedOption(option)

    if (option.isCustom) {
      // Navigate to custom agent chat
      router.push(`/onboarding/custom-agent?userId=${userId}`)
    } else {
      // Navigate to template-based agent config
      router.push(`/onboarding/agent-config?template=${option.id}&userId=${userId}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Bot className="mx-auto h-12 w-12 text-[#007AFF] mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Agent Type</h2>
        <p className="text-gray-600 mt-2">Select a template or create a completely custom agent</p>
      </div>

      {/* Agent Options Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {agentOptions.map((option) => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
              option.isCustom
                ? "border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 hover:border-purple-400"
                : "hover:border-[#007AFF]/30"
            } ${selectedOption?.id === option.id ? "ring-2 ring-[#007AFF] bg-blue-50" : ""}`}
            onClick={() => handleOptionSelect(option)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    option.isCustom
                      ? "bg-gradient-to-br from-purple-500 to-blue-600 text-white"
                      : "bg-[#007AFF]/10 text-[#007AFF]"
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {option.name}
                    {option.isCustom && <Sparkles className="w-4 h-4 text-purple-500" />}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${option.isCustom ? "border-purple-300 text-purple-700" : ""}`}
                  >
                    {option.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{option.description}</p>
              {option.isCustom && (
                <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
                  <Settings className="w-3 h-3" />
                  <span>Fully customizable • Chat-based setup</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Need help choosing?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Templates provide pre-configured agents for common use cases. Choose "Custom Agent" if you have unique
                requirements or want complete control over your agent's behavior.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
