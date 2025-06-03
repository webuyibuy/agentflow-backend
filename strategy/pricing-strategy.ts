// Pricing strategy to maximize competitive advantage
export interface PricingTier {
  name: string
  target: string
  monthlyPrice: string
  keyFeatures: string[]
  competitiveAdvantage: string
}

export const pricingStrategy: PricingTier[] = [
  {
    name: "Starter",
    target: "Small teams (5-50 employees)",
    monthlyPrice: "$49/month",
    keyFeatures: ["Up to 5 agents", "Basic templates", "Standard integrations", "Email support", "Basic analytics"],
    competitiveAdvantage: "Lower entry point than enterprise-focused competitors",
  },
  {
    name: "Professional",
    target: "Growing companies (50-500 employees)",
    monthlyPrice: "$199/month",
    keyFeatures: [
      "Up to 25 agents",
      "All templates + custom",
      "Advanced integrations",
      "Approval workflows",
      "Real-time monitoring",
      "Priority support",
    ],
    competitiveAdvantage: "Sweet spot pricing with enterprise features",
  },
  {
    name: "Enterprise",
    target: "Large organizations (500+ employees)",
    monthlyPrice: "Custom pricing",
    keyFeatures: [
      "Unlimited agents",
      "Custom templates",
      "All integrations",
      "Advanced governance",
      "Dedicated success manager",
      "SLA guarantees",
      "White-label options",
    ],
    competitiveAdvantage: "Only platform with true enterprise governance",
  },
]
