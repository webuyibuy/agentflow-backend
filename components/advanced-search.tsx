"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Filter, X, CalendarIcon, Bot, CheckSquare, Link2, Clock, Loader2, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { useDebounce } from "@/hooks/use-debounce"
import { AdvancedSearchService, type SearchFilters, type SearchResult } from "@/lib/advanced-search"
import Link from "next/link"

interface AdvancedSearchProps {
  userId: string
  className?: string
}

export default function AdvancedSearch({ userId, className = "" }: AdvancedSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    query: searchParams.get("q") || "",
    status: [],
    dateRange: { from: null, to: null },
    tags: [],
    priority: [],
  })

  const debouncedQuery = useDebounce(filters.query || "", 300)

  const availableFilters = AdvancedSearchService.getAvailableFilters()

  const performSearch = useCallback(async () => {
    if (!debouncedQuery && !filters.status?.length && !filters.dateRange?.from) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const searchResults = await AdvancedSearchService.search(filters, userId)
      setResults(searchResults)
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, filters, userId])

  useEffect(() => {
    performSearch()
  }, [performSearch])

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleStatus = (status: string) => {
    const currentStatuses = filters.status || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status]
    updateFilter("status", newStatuses)
  }

  const clearFilters = () => {
    setFilters({
      query: "",
      status: [],
      dateRange: { from: null, to: null },
      tags: [],
      priority: [],
    })
    setResults([])
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "agent":
        return <Bot className="h-4 w-4 text-blue-600" />
      case "task":
        return <CheckSquare className="h-4 w-4 text-green-600" />
      case "dependency":
        return <Link2 className="h-4 w-4 text-orange-600" />
      default:
        return <Search className="h-4 w-4 text-gray-600" />
    }
  }

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case "agent":
        return `/dashboard/agents/${result.id}`
      case "task":
      case "dependency":
        return `/dashboard/dependencies?highlight=${result.id}`
      default:
        return "#"
    }
  }

  const hasActiveFilters = !!(filters.query || filters.status?.length || filters.dateRange?.from)

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search agents, tasks, and dependencies..."
          value={filters.query || ""}
          onChange={(e) => updateFilter("query", e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-12 h-12 text-base bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {isOpen && (
        <Card className="absolute top-14 left-0 right-0 z-50 shadow-lg border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Advanced Search</CardTitle>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Filters */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {availableFilters.statuses.map((status) => (
                  <Badge
                    key={status}
                    variant={filters.status?.includes(status) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => toggleStatus(status)}
                  >
                    {status.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? format(filters.dateRange.from, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.from || undefined}
                      onSelect={(date) => updateFilter("dateRange", { ...filters.dateRange, from: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.to ? format(filters.dateRange.to, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.to || undefined}
                      onSelect={(date) => updateFilter("dateRange", { ...filters.dateRange, to: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {(loading || results.length > 0) && (
        <Card className="absolute top-14 left-0 right-0 z-40 shadow-lg border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={getResultLink(result)}
                    onClick={() => setIsOpen(false)}
                    className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {getResultIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{result.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{result.description}</p>
                        {result.highlights.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-blue-600 dark:text-blue-400">...{result.highlights[0]}...</p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(result.updated_at).toLocaleDateString()}
                          </span>
                          {result.metadata.agent_name && <span>Agent: {result.metadata.agent_name}</span>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No results found for your search.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}
