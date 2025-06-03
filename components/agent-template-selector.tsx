"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  agentTemplates,
  templateCategories,
  difficultyLevels,
  searchTemplates,
  getTemplatesByCategory,
  type AgentTemplate,
} from "@/lib/agent-templates"
import { Search, Clock, Star, ArrowRight, Filter } from "lucide-react"

const difficultyColors = {
  beginner: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300",
}

export default function AgentTemplateSelector() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>(agentTemplates)
  const router = useRouter()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    updateFilteredTemplates(query, selectedCategory, selectedDifficulty)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    updateFilteredTemplates(searchQuery, category, selectedDifficulty)
  }

  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty)
    updateFilteredTemplates(searchQuery, selectedCategory, difficulty)
  }

  const updateFilteredTemplates = (query: string, category: string, difficulty: string) => {
    let templates = agentTemplates

    // Apply search filter
    if (query.trim()) {
      templates = searchTemplates(query)
    }

    // Apply category filter
    if (category !== "all") {
      templates = templates.filter((t) => t.category === category)
    }

    // Apply difficulty filter
    if (difficulty !== "all") {
      templates = templates.filter((t) => t.difficulty === difficulty)
    }

    setFilteredTemplates(templates)
  }

  const handleSelectTemplate = (template: AgentTemplate) => {
    // Navigate to agent configuration with template pre-selected
    router.push(`/onboarding/agent-config?template=${template.id}`)
  }

  const popularTemplates = agentTemplates.filter((t) =>
    ["sales-lead-generator", "customer-support-agent", "productivity-optimizer"].includes(t.id),
  )

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search agent templates..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {templateCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDifficulty} onValueChange={handleDifficultyChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {difficultyLevels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={() => handleSelectTemplate(template)} />
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Filter className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No templates found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {popularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleSelectTemplate(template)}
                isPopular
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-8">
          {templateCategories.map((category) => {
            const categoryTemplates = getTemplatesByCategory(category.id as AgentTemplate["category"])
            return (
              <div key={category.id}>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{category.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TemplateCardProps {
  template: AgentTemplate
  onSelect: () => void
  isPopular?: boolean
}

function TemplateCard({ template, onSelect, isPopular = false }: TemplateCardProps) {
  const IconComponent = template.icon
  const difficultyColor = difficultyColors[template.difficulty]

  return (
    <Card
      className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200 group cursor-pointer"
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#007AFF]/10">
              <IconComponent className="h-6 w-6 text-[#007AFF]" />
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-[#007AFF] transition-colors">
                {template.name}
                {isPopular && <Star className="inline ml-2 h-4 w-4 text-yellow-500 fill-current" />}
              </CardTitle>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed">{template.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{template.estimatedSetupTime}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={`text-xs ${difficultyColor}`}>
              {template.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {template.category}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white group-hover:shadow-md transition-all">
          Use This Template
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
