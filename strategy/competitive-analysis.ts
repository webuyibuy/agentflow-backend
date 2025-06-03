// Competitive positioning framework
export interface CompetitiveAdvantage {
  feature: string
  ourApproach: string
  competitorGap: string
  businessValue: string
}

export const competitiveAdvantages: CompetitiveAdvantage[] = [
  {
    feature: "Human-in-the-Loop Governance",
    ourApproach: "Dependency Basket with approval workflows",
    competitorGap: "Most platforms are fully autonomous or basic task queues",
    businessValue: "Reduces AI risk, ensures compliance, maintains control",
  },
  {
    feature: "Real-time Agent Orchestration",
    ourApproach: "Live monitoring, instant status updates, real-time logs",
    competitorGap: "Batch processing, delayed feedback, limited visibility",
    businessValue: "Faster issue resolution, better user experience, proactive management",
  },
  {
    feature: "Template-to-Production Pipeline",
    ourApproach: "Pre-built templates → customization → deployment → monitoring",
    competitorGap: "Either too simple (no customization) or too complex (code required)",
    businessValue: "Faster time-to-value, reduced technical barrier, scalable deployment",
  },
  {
    feature: "Multi-Agent Hierarchy",
    ourApproach: "Parent-child relationships, delegation, coordinated workflows",
    competitorGap: "Single agent focus or flat agent management",
    businessValue: "Models real organizational structures, enables complex automation",
  },
  {
    feature: "Integration Ecosystem",
    ourApproach: "n8n workflows + Lyzr AI + extensible architecture",
    competitorGap: "Vendor lock-in or limited integration options",
    businessValue: "Leverages existing tools, future-proof, best-of-breed approach",
  },
]
