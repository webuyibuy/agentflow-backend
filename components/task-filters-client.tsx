"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDebounce } from "@/hooks/use-debounce" // Assuming you have this hook
import { Search, ListFilter } from "lucide-react"

interface TaskFiltersClientProps {
  initialTaskQuery?: string
  initialTaskStatus?: string
}

const taskStatuses = [
  { value: "all", label: "All Statuses" },
  { value: "todo", label: "To Do" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  // Add 'in_progress' if it becomes a status
]

export default function TaskFiltersClient({
  initialTaskQuery = "",
  initialTaskStatus = "all",
}: TaskFiltersClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [taskSearchTerm, setTaskSearchTerm] = useState(initialTaskQuery)
  const [selectedTaskStatus, setSelectedTaskStatus] = useState(initialTaskStatus)

  const debouncedTaskSearch = useDebounce(taskSearchTerm, 500)

  useEffect(() => {
    setTaskSearchTerm(searchParams.get("taskQuery") || "")
    setSelectedTaskStatus(searchParams.get("taskStatus") || "all")
  }, [searchParams])

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))

    if (debouncedTaskSearch) {
      current.set("taskQuery", debouncedTaskSearch)
    } else {
      current.delete("taskQuery")
    }

    if (selectedTaskStatus && selectedTaskStatus !== "all") {
      current.set("taskStatus", selectedTaskStatus)
    } else {
      current.delete("taskStatus")
    }

    const search = current.toString()
    const query = search ? `?${search}` : ""

    // Only push if the query string has actually changed
    if (query !== (window.location.search || (search ? "?" : ""))) {
      router.push(`${pathname}${query}`, { scroll: false })
    }
  }, [debouncedTaskSearch, selectedTaskStatus, pathname, router, searchParams])

  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-3 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search tasks by title..."
          value={taskSearchTerm}
          onChange={(e) => setTaskSearchTerm(e.target.value)}
          className="pl-10 w-full"
          aria-label="Search tasks"
        />
      </div>
      <div className="flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-gray-500 dark:text-gray-400 sm:hidden" />
        <Select value={selectedTaskStatus} onValueChange={setSelectedTaskStatus}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter tasks by status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {taskStatuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
