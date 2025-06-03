// Marketing messages that highlight competitive advantages
export interface MarketingMessage {
  audience: string
  painPoint: string
  solution: string
  proof: string
}

export const marketingMessages: MarketingMessage[] = [
  {
    audience: "IT Directors",
    painPoint: "AI initiatives fail due to lack of governance and control",
    solution: "AgentFlow provides enterprise-grade AI orchestration with built-in approval workflows and audit trails",
    proof: "Customers report 90% reduction in AI-related compliance issues",
  },
  {
    audience: "Operations Leaders",
    painPoint: "AI agents work in silos, creating operational chaos",
    solution: "Our hierarchical agent management mirrors your org structure, enabling coordinated automation",
    proof: "Teams see 3x faster process completion with coordinated agent workflows",
  },
  {
    audience: "CTO/Technical Leaders",
    painPoint: "Vendor lock-in and integration nightmares with AI platforms",
    solution: "Multi-vendor architecture with n8n workflows ensures you're never locked into one AI provider",
    proof: "Customers integrate with average of 5+ existing tools in first month",
  },
  {
    audience: "Business Process Owners",
    painPoint: "AI automation breaks existing approval processes",
    solution: "Dependency Basket maintains human oversight while enabling AI acceleration",
    proof: "Maintain 100% compliance while achieving 40% process acceleration",
  },
]
