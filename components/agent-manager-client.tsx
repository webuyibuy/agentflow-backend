"use client"

import { useState, useMemo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import AgentSelectionCard, { type AgentWithCounts } from "./agent-selection-card"
import AgentManagementToolbar from "./agent-management-toolbar"
import { toast } from "@/hooks/use-toast"

interface AgentManagerClientProps {
  agents: AgentWithCounts[]
  selectedAgentId: string | null
}

export default function AgentManagerClient({ agents, selectedAgentId }: AgentManagerClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("created_at_desc")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    const filtered = agents.filter((agent) => {
      const matchesSearch =
        !searchQuery ||
        agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.goal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.template_slug?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = filterStatus === "all" || agent.status === filterStatus

      return matchesSearch && matchesStatus
    })

    // Sort agents
    const [field, direction] = sortBy.split("_")
    filtered.sort((a, b) => {
      let aVal = a[field as keyof AgentWithCounts]
      let bVal = b[field as keyof AgentWithCounts]

      if (field === "created_at") {
        aVal = new Date(aVal as string).getTime()
        bVal = new Date(bVal as string).getTime()
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (direction === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    return filtered
  }, [agents, searchQuery, sortBy, filterStatus])

  const activeAgents = agents.filter((agent) => agent.status === "active").length

  const handleBulkDelete = () => {
    if (selectedAgents.length === 0) return

    toast({
      title: "Bulk Delete",
      description: `Selected ${selectedAgents.length} agents for deletion. Individual confirmations required.`,
      variant: "default",
    })

    // Reset selection after showing message
    setSelectedAgents([])
  }

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Manage Your Agents</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create, configure, and manage your AI agents</p>
        </div>
        <Button asChild className="bg-[#007AFF] hover:bg-[#0056b3]">
          <a href="/dashboard/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </a>
        </Button>
      </div>

      <AgentManagementToolbar
        totalAgents={agents.length}
        activeAgents={activeAgents}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        selectedAgents={selectedAgents}
        onBulkDelete={handleBulkDelete}
      />

      {filteredAndSortedAgents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            {agents.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No agents yet</h3>
                <p>Create your first agent to get started with AI automation.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No agents match your filters</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
          {agents.length === 0 && (
            <Button asChild className="bg-[#007AFF] hover:bg-[#0056b3]">
              <a href="/dashboard/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Agent
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredAndSortedAgents.map((agent) => (
            <AgentSelectionCard key={agent.id} agent={agent} isSelected={selectedAgentId === agent.id} />
          ))}
        </div>
      )}
    </div>
  )
}
