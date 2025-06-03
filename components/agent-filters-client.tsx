"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce" // Assuming you have a debounce hook

interface AgentFiltersClientProps {
  initialQuery?: string
  initialStatus?: string
  statuses: readonly string[]
}

export default function AgentFiltersClient({
  initialQuery = "",
  initialStatus = "",
  statuses,
}: AgentFiltersClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [selectedStatus, setSelectedStatus] = useState(initialStatus)

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const createQueryString = useCallback(
    (paramsToUpdate: Record<string, string | undefined>) => {
      const currentParams = new URLSearchParams(Array.from(searchParams.entries()))
      for (const [name, value] of Object.entries(paramsToUpdate)) {
        if (value) {
          currentParams.set(name, value)
        } else {
          currentParams.delete(name)
        }
      }
      return currentParams.toString()
    },
    [searchParams],
  )

  useEffect(() => {
    // Update URL when debounced search term or status changes
    const query = createQueryString({
      query: debouncedSearchTerm || undefined,
      status: selectedStatus || undefined,
    })
    router.push(`${pathname}?${query}`, { scroll: false })
  }, [debouncedSearchTerm, selectedStatus, pathname, router, createQueryString])

  // Effect to update local state if URL changes externally (e.g., browser back/forward)
  useEffect(() => {
    setSearchTerm(searchParams.get("query") || "")
    setSelectedStatus(searchParams.get("status") || "")
  }, [searchParams])

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
      <div className="relative w-full sm:flex-grow">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search agents by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 w-full"
          aria-label="Search agents"
        />
      </div>
      <div className="relative w-full sm:w-auto sm:min-w-[180px]">
        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Select
          value={selectedStatus}
          onValueChange={(value) => {
            setSelectedStatus(value === "all" ? "" : value)
          }}
        >
          <SelectTrigger className="w-full pl-8" aria-label="Filter by status">
            <SelectValue placeholder="Filter by status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
