import type React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Zap, Briefcase, BarChart2, Code, Users, Settings2 } from "lucide-react"

// Define a more specific type for the agent prop
export interface Agent {
  id: string
  name: string | null
  template_slug: string | null
  goal: string | null
  status: string | null
  created_at: string
}

interface AgentCardProps {
  agent: Agent
}

const templateIcons: Record<string, React.ElementType> = {
  sales: BarChart2,
  marketing: Briefcase,
  dev: Code,
  hr: Users,
  custom: Settings2,
  default: Zap,
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
  paused:
    "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700",
  completed: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700",
  error: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700",
  default: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
}

export default function AgentCard({ agent }: AgentCardProps) {
  const IconComponent = templateIcons[agent.template_slug || "default"] || templateIcons.default
  const statusColorClass = statusColors[agent.status || "default"] || statusColors.default

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <IconComponent className="h-7 w-7 text-[#007AFF]" />
            <CardTitle className="text-xl">{agent.name || "Unnamed Agent"}</CardTitle>
          </div>
          {agent.status && (
            <Badge variant="outline" className={`capitalize ${statusColorClass}`}>
              {agent.status}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2 h-[40px]">{agent.goal || "No goal defined."}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Type:{" "}
          <span className="font-medium capitalize text-gray-700 dark:text-gray-300">
            {agent.template_slug || "N/A"}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Created:{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {new Date(agent.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/dashboard/agents/${agent.id}`}>
            View Details <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
