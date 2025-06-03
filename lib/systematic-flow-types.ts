export interface ConfigurationStage {
  id: string
  name: string
  description: string
  status: "pending" | "active" | "completed"
  dependencies?: string[]
}

export interface SmartQuestion {
  id: string
  question: string
  type: "text" | "select" | "multiselect" | "boolean" | "range"
  options?: string[]
  dependencies?: string[]
  category: "technical" | "business" | "integration" | "workflow" | "performance" | "security"
  priority: "high" | "medium" | "low"
  followUpQuestions?: string[]
  context?: string
  validation?: {
    required: boolean
    minLength?: number
    maxLength?: number
  }
}

export interface UserAnswer {
  questionId: string
  answer: string | string[] | boolean | number
  timestamp: Date
  confidence?: number
}

export interface PlanDependency {
  id: string
  name: string
  type: "technical" | "business" | "resource" | "integration"
  status: "pending" | "resolved" | "blocked"
  blockers: string[]
  estimatedResolutionTime?: string
}

export interface PlanResource {
  type: "api_key" | "integration" | "data" | "permission" | "infrastructure"
  name: string
  provider: string
  required: boolean
  configured: boolean
  cost?: string
  setupTime?: string
}

export interface PlanPhase {
  phase: string
  duration: string
  tasks: string[]
  dependencies: string[]
  deliverables: string[]
  riskLevel: "low" | "medium" | "high"
}

export interface GeneratedPlan {
  id: string
  title: string
  description: string
  objectives: string[]
  dependencies: PlanDependency[]
  resources: PlanResource[]
  timeline: PlanPhase[]
  risks: string[]
  successMetrics: string[]
  estimatedCost?: string
  estimatedTimeToValue?: string
  complexity: "low" | "medium" | "high"
}

export interface AIConsultationMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  relatedQuestions?: string[]
  planUpdates?: Partial<GeneratedPlan>
  suggestions?: string[]
}

export interface AgentTask {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  status: "todo" | "in_progress" | "blocked" | "done"
  dependencies: string[]
  assignedTo?: string
  dueDate?: string
  category: string
  estimatedHours?: number
  phase: string
  deliverables: string[]
  acceptanceCriteria: string[]
}

export interface DeploymentResult {
  success: boolean
  agentId?: string
  tasks?: AgentTask[]
  error?: string
  warnings?: string[]
  nextSteps?: string[]
}
