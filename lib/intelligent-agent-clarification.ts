export interface BusinessContext {
  industry?: string
  companySize?: string
  department?: string
  currentChallenges?: string[]
  goals?: string[]
  timeline?: string
  budget?: string
}

export interface ClarificationQuestion {
  id: string
  question: string
  type: "multiple_choice" | "text" | "scale" | "boolean"
  options?: string[]
  required: boolean
  category: "business" | "technical" | "timeline" | "resources"
}

export interface TaskRecommendation {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  estimatedHours: number
  businessValue: string
  dependencies?: string[]
  category: "analysis" | "implementation" | "optimization" | "monitoring"
}

export class IntelligentAgentClarification {
  private context: BusinessContext = {}
  private responses: Record<string, any> = {}

  generateClarificationQuestions(initialGoal: string): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = []

    // Business context questions
    questions.push({
      id: "industry",
      question: "What industry is your business in?",
      type: "multiple_choice",
      options: [
        "Technology/Software",
        "Healthcare",
        "Finance/Banking",
        "Retail/E-commerce",
        "Manufacturing",
        "Professional Services",
        "Education",
        "Other",
      ],
      required: true,
      category: "business",
    })

    questions.push({
      id: "company_size",
      question: "What's your company size?",
      type: "multiple_choice",
      options: [
        "1-10 employees (Startup)",
        "11-50 employees (Small)",
        "51-200 employees (Medium)",
        "201-1000 employees (Large)",
        "1000+ employees (Enterprise)",
      ],
      required: true,
      category: "business",
    })

    questions.push({
      id: "primary_challenge",
      question: "What's your biggest operational challenge right now?",
      type: "multiple_choice",
      options: [
        "Manual processes taking too much time",
        "Inconsistent data across systems",
        "Poor customer experience",
        "Difficulty scaling operations",
        "High operational costs",
        "Quality control issues",
        "Communication bottlenecks",
      ],
      required: true,
      category: "business",
    })

    questions.push({
      id: "success_metrics",
      question: "How do you measure success in your business?",
      type: "multiple_choice",
      options: [
        "Revenue growth",
        "Cost reduction",
        "Customer satisfaction",
        "Operational efficiency",
        "Time savings",
        "Quality improvements",
        "Employee productivity",
      ],
      required: true,
      category: "business",
    })

    questions.push({
      id: "timeline",
      question: "When do you need to see results?",
      type: "multiple_choice",
      options: ["Within 1 month", "Within 3 months", "Within 6 months", "Within 1 year", "No specific timeline"],
      required: true,
      category: "timeline",
    })

    questions.push({
      id: "budget_range",
      question: "What's your budget range for this solution?",
      type: "multiple_choice",
      options: [
        "Under $1,000/month",
        "$1,000 - $5,000/month",
        "$5,000 - $15,000/month",
        "$15,000+ /month",
        "Need cost analysis first",
      ],
      required: false,
      category: "resources",
    })

    questions.push({
      id: "technical_expertise",
      question: "What's your team's technical expertise level?",
      type: "multiple_choice",
      options: [
        "Non-technical (need full support)",
        "Basic technical skills",
        "Moderate technical skills",
        "Advanced technical team",
        "Expert technical team",
      ],
      required: true,
      category: "technical",
    })

    questions.push({
      id: "current_tools",
      question: "What tools/systems do you currently use?",
      type: "text",
      required: false,
      category: "technical",
    })

    return questions
  }

  updateContext(questionId: string, response: any): void {
    this.responses[questionId] = response

    // Update business context based on responses
    switch (questionId) {
      case "industry":
        this.context.industry = response
        break
      case "company_size":
        this.context.companySize = response
        break
      case "primary_challenge":
        this.context.currentChallenges = [response]
        break
      case "timeline":
        this.context.timeline = response
        break
      case "budget_range":
        this.context.budget = response
        break
    }
  }

  generateRelevantTasks(goal: string): TaskRecommendation[] {
    const tasks: TaskRecommendation[] = []
    const industry = this.context.industry || ""
    const challenge = this.context.currentChallenges?.[0] || ""
    const timeline = this.context.timeline || ""

    // Generate industry-specific tasks
    if (industry.includes("Technology") || industry.includes("Software")) {
      tasks.push({
        id: "tech_audit",
        title: "Technical Infrastructure Audit",
        description: "Analyze current tech stack and identify automation opportunities",
        priority: "high",
        estimatedHours: 8,
        businessValue: "Identify 20-30% efficiency gains in development processes",
        category: "analysis",
      })

      tasks.push({
        id: "api_integration",
        title: "API Integration Analysis",
        description: "Map data flows and identify integration points for automation",
        priority: "medium",
        estimatedHours: 12,
        businessValue: "Reduce manual data entry by 80%",
        category: "implementation",
      })
    }

    if (industry.includes("Healthcare")) {
      tasks.push({
        id: "patient_workflow",
        title: "Patient Workflow Optimization",
        description: "Analyze patient journey and identify automation points",
        priority: "high",
        estimatedHours: 16,
        businessValue: "Improve patient satisfaction by 25% and reduce wait times",
        category: "analysis",
      })
    }

    if (industry.includes("Finance") || industry.includes("Banking")) {
      tasks.push({
        id: "compliance_automation",
        title: "Compliance Process Automation",
        description: "Automate regulatory reporting and compliance checks",
        priority: "high",
        estimatedHours: 20,
        businessValue: "Reduce compliance costs by 40% and eliminate errors",
        category: "implementation",
      })
    }

    // Generate challenge-specific tasks
    if (challenge.includes("Manual processes")) {
      tasks.push({
        id: "process_mapping",
        title: "Manual Process Identification",
        description: "Document and prioritize manual processes for automation",
        priority: "high",
        estimatedHours: 6,
        businessValue: "Save 15-20 hours per week per employee",
        category: "analysis",
      })

      tasks.push({
        id: "automation_implementation",
        title: "Process Automation Implementation",
        description: "Implement automated workflows for identified processes",
        priority: "high",
        estimatedHours: 24,
        businessValue: "Reduce processing time by 70%",
        category: "implementation",
      })
    }

    if (challenge.includes("customer experience")) {
      tasks.push({
        id: "customer_journey_analysis",
        title: "Customer Journey Analysis",
        description: "Map customer touchpoints and identify improvement opportunities",
        priority: "high",
        estimatedHours: 10,
        businessValue: "Increase customer satisfaction by 30%",
        category: "analysis",
      })

      tasks.push({
        id: "personalization_engine",
        title: "Customer Personalization System",
        description: "Implement AI-driven personalization for customer interactions",
        priority: "medium",
        estimatedHours: 32,
        businessValue: "Increase conversion rates by 25%",
        category: "implementation",
      })
    }

    if (challenge.includes("scaling operations")) {
      tasks.push({
        id: "scalability_assessment",
        title: "Operational Scalability Assessment",
        description: "Identify bottlenecks and scalability constraints",
        priority: "high",
        estimatedHours: 8,
        businessValue: "Enable 3x growth without proportional cost increase",
        category: "analysis",
      })
    }

    // Add timeline-based prioritization
    if (timeline.includes("1 month")) {
      tasks.forEach((task) => {
        if (task.estimatedHours <= 10) {
          task.priority = "high"
        }
      })
    }

    // Add monitoring tasks
    tasks.push({
      id: "performance_monitoring",
      title: "Performance Monitoring Setup",
      description: "Implement KPI tracking and automated reporting",
      priority: "medium",
      estimatedHours: 6,
      businessValue: "Real-time visibility into business metrics",
      category: "monitoring",
    })

    // Sort by priority and business value
    return tasks
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, 8) // Return top 8 most relevant tasks
  }

  validateTaskRelevance(task: TaskRecommendation): boolean {
    const industry = this.context.industry || ""
    const challenge = this.context.currentChallenges?.[0] || ""
    const budget = this.context.budget || ""

    // Check industry relevance
    if (task.id.includes("tech") && !industry.includes("Technology")) {
      return false
    }

    if (task.id.includes("patient") && !industry.includes("Healthcare")) {
      return false
    }

    if (task.id.includes("compliance") && !industry.includes("Finance")) {
      return false
    }

    // Check budget constraints
    if (budget.includes("Under $1,000") && task.estimatedHours > 20) {
      return false
    }

    // Check challenge alignment
    if (task.id.includes("customer") && !challenge.includes("customer")) {
      return false
    }

    return true
  }

  getBusinessContext(): BusinessContext {
    return { ...this.context }
  }

  getResponses(): Record<string, any> {
    return { ...this.responses }
  }

  generateAgentConfiguration(): any {
    const context = this.getBusinessContext()
    const responses = this.getResponses()

    return {
      agentType: this.determineAgentType(),
      configuration: {
        industry: context.industry,
        focusArea: context.currentChallenges?.[0],
        timeline: context.timeline,
        technicalLevel: responses.technical_expertise,
        budget: context.budget,
      },
      recommendedTasks: this.generateRelevantTasks(""),
      successMetrics: this.generateSuccessMetrics(),
    }
  }

  private determineAgentType(): string {
    const challenge = this.context.currentChallenges?.[0] || ""

    if (challenge.includes("Manual processes") || challenge.includes("scaling")) {
      return "systematic"
    }

    if (challenge.includes("data") || challenge.includes("costs")) {
      return "business-logic"
    }

    if (challenge.includes("customer") || challenge.includes("communication")) {
      return "user-experience"
    }

    return "systematic" // default
  }

  private generateSuccessMetrics(): string[] {
    const challenge = this.context.currentChallenges?.[0] || ""
    const metrics: string[] = []

    if (challenge.includes("Manual processes")) {
      metrics.push("Time savings per process")
      metrics.push("Error reduction percentage")
      metrics.push("Employee productivity increase")
    }

    if (challenge.includes("customer")) {
      metrics.push("Customer satisfaction score")
      metrics.push("Response time improvement")
      metrics.push("Conversion rate increase")
    }

    if (challenge.includes("costs")) {
      metrics.push("Cost reduction percentage")
      metrics.push("ROI measurement")
      metrics.push("Resource utilization improvement")
    }

    return metrics.length > 0
      ? metrics
      : ["Process efficiency improvement", "Time to completion reduction", "Quality score increase"]
  }
}

export const createClarificationSystem = () => new IntelligentAgentClarification()
