// Go-to-market strategy framework
export interface GTMStrategy {
  phase: string
  timeline: string
  focus: string
  keyActivities: string[]
  successMetrics: string[]
}

export const gtmPhases: GTMStrategy[] = [
  {
    phase: "Foundation (Months 1-3)",
    timeline: "Q1 2024",
    focus: "Product-Market Fit Validation",
    keyActivities: [
      "Deploy with 5-10 design partner customers",
      "Build case studies around compliance use cases",
      "Develop enterprise security features (SSO, RBAC)",
      "Create detailed ROI calculator",
      "Establish customer success processes",
    ],
    successMetrics: [
      "90%+ customer satisfaction score",
      "3+ detailed case studies",
      "Average 40%+ efficiency improvement",
      "Zero security incidents",
    ],
  },
  {
    phase: "Scale (Months 4-9)",
    timeline: "Q2-Q3 2024",
    focus: "Market Expansion & Feature Leadership",
    keyActivities: [
      "Launch enterprise marketplace integrations",
      "Build industry-specific templates (healthcare, finance, legal)",
      "Develop partner channel program",
      "Create certification program for AI governance",
      "Launch thought leadership content strategy",
    ],
    successMetrics: [
      "50+ enterprise customers",
      "3+ major partnership deals",
      "Industry recognition/awards",
      "10x agent deployment growth",
    ],
  },
  {
    phase: "Dominate (Months 10-18)",
    timeline: "Q4 2024 - Q2 2025",
    focus: "Category Leadership & Platform Expansion",
    keyActivities: [
      "Launch AI governance consulting services",
      "Build marketplace for community templates",
      "Develop white-label solutions",
      "Create industry standards/frameworks",
      "International expansion",
    ],
    successMetrics: [
      "Category leader recognition",
      "500+ enterprise customers",
      "Platform ecosystem with 100+ templates",
      "International presence in 3+ regions",
    ],
  },
]
