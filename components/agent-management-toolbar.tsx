"use client"

import { useState } from "react"
import { Search, SortAsc, SortDesc, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AgentManagementToolbarProps {
  totalAgents: number
  activeAgents: number
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
  filterStatus: string
  onFilterChange: (status: string) => void
  selectedAgents: string[]
  onBulkDelete?: () => void
}

export default function AgentManagementToolbar({
  totalAgents,
  activeAgents,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterStatus,
  onFilterChange,
  selectedAgents,
  onBulkDelete,
}: AgentManagementToolbarProps) {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSortChange = (newSort: string) => {
    if (newSort === sortBy) {
      // Toggle direction if same field
      const newDirection = sortDirection === "asc" ? "desc" : "asc"
      setSortDirection(newDirection)
      onSortChange(`${newSort}_${newDirection}`)
    } else {
      // New field, default to desc
      setSortDirection("desc")
      onSortChange(`${newSort}_desc`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {totalAgents} Total
            </Badge>
            <Badge variant="default" className="text-sm bg-green-100 text-green-800 border-green-300">
              {activeAgents} Active
            </Badge>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedAgents.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedAgents.length} selected</Badge>
            <Button variant="destructive" size="sm" onClick={onBulkDelete} className="text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filter Row */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {sortDirection === "asc" ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSortChange("created_at")}>Date Created</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("name")}>Name</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("status")}>Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("template_slug")}>Type</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters Display */}
      {(searchQuery || filterStatus !== "all") && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="text-xs">
              Search: "{searchQuery}"
            </Badge>
          )}
          {filterStatus !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Status: {filterStatus}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSearchChange("")
              onFilterChange("all")
            }}
            className="text-xs h-6 px-2"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
