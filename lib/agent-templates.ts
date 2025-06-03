import type React from "react"
import {
  BarChart2,
  Briefcase,
  Code,
  Users,
  MessageSquare,
  FileText,
  Zap,
  Settings,
  Heart,
  Brain,
  BookOpen,
  Palette,
  Shield,
  Home,
  ShoppingCart,
  Plane,
  Camera,
  Music,
  Dumbbell,
  Utensils,
  DollarSign,
  TrendingUp,
  Building,
  GraduationCap,
  Headphones,
  Car,
  Coffee,
  Gamepad2,
  Baby,
  PawPrint,
  Leaf,
  Moon,
  Target,
  Database,
  Shirt,
  Star,
  Award,
  Map,
  Flower2,
} from "lucide-react"

export interface AgentTemplate {
  id: string
  name: string
  description: string
  icon: React.ElementType
  category:
    | "business"
    | "health-wellness"
    | "education"
    | "creative"
    | "technology"
    | "personal"
    | "professional"
    | "ecommerce"
    | "real-estate"
    | "entertainment"
    | "finance"
    | "legal"
    | "lifestyle"
    | "automotive"
    | "food-beverage"
    | "travel"
    | "sports"
    | "parenting"
    | "pets"
    | "environment"
  defaultGoal: string
  defaultBehavior: string
  suggestedTools: string[]
  estimatedSetupTime: string
  difficulty: "beginner" | "intermediate" | "advanced"
  tags: string[]
  sampleTasks: string[]
  integrations: string[]
}

export const agentTemplates: AgentTemplate[] = [
  // BUSINESS SECTOR
  {
    id: "sales-lead-generator",
    name: "Sales Lead Generator",
    description: "Automate lead generation, qualification, and initial outreach to potential customers.",
    icon: BarChart2,
    category: "business",
    defaultGoal: "Generate 20 qualified leads per week through automated prospecting and initial outreach.",
    defaultBehavior:
      "Proactively research and identify potential customers based on defined criteria. Reach out via LinkedIn and email with personalized messages. Qualify leads based on budget, authority, need, and timeline.",
    suggestedTools: ["LinkedIn Sales Navigator", "Email automation", "CRM integration"],
    estimatedSetupTime: "15-30 minutes",
    difficulty: "intermediate",
    tags: ["sales", "lead generation", "outreach", "automation"],
    sampleTasks: [
      "Research 50 potential customers",
      "Send personalized LinkedIn requests",
      "Follow up with email sequences",
    ],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "marketing-content-manager",
    name: "Marketing Content Manager",
    description: "Create, schedule, and optimize marketing content across multiple channels.",
    icon: Briefcase,
    category: "business",
    defaultGoal: "Increase social media engagement by 25% through consistent, high-quality content creation.",
    defaultBehavior:
      "Create engaging content for social media platforms, blog posts, and email campaigns. Monitor trending topics and schedule posts for optimal engagement times.",
    suggestedTools: ["Social media scheduling", "Content creation", "Analytics tracking"],
    estimatedSetupTime: "20-40 minutes",
    difficulty: "intermediate",
    tags: ["marketing", "content", "social media", "analytics"],
    sampleTasks: ["Create 10 social media posts", "Write blog post", "Design email newsletter"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "hr-recruitment-specialist",
    name: "HR Recruitment Specialist",
    description: "Streamline recruitment process from job posting to candidate onboarding.",
    icon: Users,
    category: "business",
    defaultGoal: "Reduce time-to-hire by 40% while maintaining high-quality candidate standards.",
    defaultBehavior:
      "Post job openings across multiple platforms. Screen resumes and conduct initial candidate screenings. Schedule interviews and manage the recruitment pipeline.",
    suggestedTools: ["ATS integration", "Interview scheduling", "Background checks"],
    estimatedSetupTime: "25-45 minutes",
    difficulty: "intermediate",
    tags: ["hr", "recruitment", "hiring", "onboarding"],
    sampleTasks: ["Post job to 5 job boards", "Screen 100 resumes", "Schedule interviews"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "customer-support-agent",
    name: "Customer Support Agent",
    description: "Provide 24/7 customer support with intelligent ticket routing and response automation.",
    icon: MessageSquare,
    category: "business",
    defaultGoal: "Achieve 90% customer satisfaction while reducing response time to under 2 hours.",
    defaultBehavior:
      "Monitor support channels for incoming tickets. Categorize and prioritize based on urgency. Provide automated responses for common questions and escalate complex issues.",
    suggestedTools: ["Help desk integration", "Knowledge base", "Chat automation"],
    estimatedSetupTime: "20-35 minutes",
    difficulty: "beginner",
    tags: ["support", "customer service", "automation", "tickets"],
    sampleTasks: ["Respond to 50 support questions", "Escalate complex issues", "Update knowledge base"],
    integrations: ["n8n", "lyzr"],
  },

  // HEALTH & WELLNESS SECTOR
  {
    id: "mental-peace-coach",
    name: "Mental Peace & Mindfulness Coach",
    description: "Guide users through meditation, stress relief, and mental wellness practices for inner peace.",
    icon: Brain,
    category: "health-wellness",
    defaultGoal: "Help users achieve daily mental peace through guided meditation and mindfulness practices.",
    defaultBehavior:
      "Provide personalized meditation sessions, breathing exercises, and mindfulness reminders. Track mood patterns and suggest stress-relief techniques based on user's emotional state.",
    suggestedTools: ["Meditation timers", "Mood tracking", "Breathing exercises"],
    estimatedSetupTime: "10-20 minutes",
    difficulty: "beginner",
    tags: ["mental health", "meditation", "mindfulness", "stress relief", "peace"],
    sampleTasks: [
      "Guide 10-minute meditation",
      "Send mindfulness reminders",
      "Track daily mood",
      "Suggest breathing exercises",
    ],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "fitness-trainer",
    name: "Personal Fitness Trainer",
    description: "Create personalized workout plans, track progress, and provide fitness motivation.",
    icon: Dumbbell,
    category: "health-wellness",
    defaultGoal: "Help users achieve their fitness goals through personalized workout plans and consistent motivation.",
    defaultBehavior:
      "Design custom workout routines based on user goals and fitness level. Track exercise progress, provide form corrections, and adjust plans based on performance.",
    suggestedTools: ["Workout tracking", "Progress monitoring", "Exercise database"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "intermediate",
    tags: ["fitness", "workout", "health", "motivation", "training"],
    sampleTasks: ["Create weekly workout plan", "Track exercise progress", "Provide form tips", "Adjust difficulty"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "nutrition-advisor",
    name: "Nutrition & Diet Advisor",
    description: "Plan healthy meals, track nutrition, and provide dietary guidance for optimal health.",
    icon: Utensils,
    category: "health-wellness",
    defaultGoal: "Optimize user's nutrition through personalized meal planning and dietary guidance.",
    defaultBehavior:
      "Create balanced meal plans based on dietary preferences and health goals. Track caloric intake, suggest healthy recipes, and provide nutritional education.",
    suggestedTools: ["Meal planning", "Nutrition tracking", "Recipe database"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "intermediate",
    tags: ["nutrition", "diet", "meal planning", "health", "recipes"],
    sampleTasks: ["Create weekly meal plan", "Track daily nutrition", "Suggest healthy recipes", "Calculate calories"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "sleep-optimizer",
    name: "Sleep Quality Optimizer",
    description: "Improve sleep quality through personalized sleep schedules and bedtime routines.",
    icon: Moon,
    category: "health-wellness",
    defaultGoal: "Improve sleep quality and establish healthy sleep patterns for better rest and recovery.",
    defaultBehavior:
      "Analyze sleep patterns, suggest optimal bedtime routines, and provide sleep hygiene recommendations. Track sleep quality and adjust recommendations based on results.",
    suggestedTools: ["Sleep tracking", "Bedtime reminders", "Sleep analysis"],
    estimatedSetupTime: "10-15 minutes",
    difficulty: "beginner",
    tags: ["sleep", "rest", "recovery", "bedtime", "wellness"],
    sampleTasks: ["Analyze sleep patterns", "Set bedtime reminders", "Suggest sleep routine", "Track sleep quality"],
    integrations: ["n8n", "lyzr"],
  },

  // EDUCATION SECTOR
  {
    id: "language-tutor",
    name: "Language Learning Tutor",
    description: "Personalized language learning with conversation practice and progress tracking.",
    icon: BookOpen,
    category: "education",
    defaultGoal: "Help users achieve conversational fluency in their target language through daily practice.",
    defaultBehavior:
      "Provide interactive language lessons, conversation practice, and vocabulary building exercises. Track learning progress and adapt difficulty based on user performance.",
    suggestedTools: ["Language exercises", "Pronunciation practice", "Progress tracking"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "intermediate",
    tags: ["language", "learning", "education", "conversation", "fluency"],
    sampleTasks: ["Conduct conversation practice", "Teach new vocabulary", "Correct pronunciation", "Track progress"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "study-buddy",
    name: "Study Buddy & Academic Assistant",
    description: "Help students with homework, study schedules, and exam preparation.",
    icon: GraduationCap,
    category: "education",
    defaultGoal: "Improve academic performance through structured study plans and personalized learning support.",
    defaultBehavior:
      "Create study schedules, help with homework questions, provide exam preparation strategies, and track academic progress across subjects.",
    suggestedTools: ["Study planning", "Academic tracking", "Homework assistance"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "intermediate",
    tags: ["study", "academic", "homework", "exam prep", "learning"],
    sampleTasks: ["Create study schedule", "Help with math problems", "Prepare for exams", "Track grades"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "skill-development-coach",
    name: "Skill Development Coach",
    description: "Guide users through learning new professional and personal skills with structured programs.",
    icon: Target,
    category: "education",
    defaultGoal: "Help users master new skills through structured learning paths and consistent practice.",
    defaultBehavior:
      "Design personalized learning curricula, provide skill assessments, track progress, and suggest practice exercises based on learning goals.",
    suggestedTools: ["Skill assessment", "Learning paths", "Progress tracking"],
    estimatedSetupTime: "25-35 minutes",
    difficulty: "intermediate",
    tags: ["skills", "learning", "development", "training", "growth"],
    sampleTasks: [
      "Assess current skill level",
      "Create learning path",
      "Assign practice exercises",
      "Track improvement",
    ],
    integrations: ["n8n", "lyzr"],
  },

  // CREATIVE SECTOR
  {
    id: "content-creator",
    name: "Creative Content Creator",
    description: "Generate creative content ideas, scripts, and multimedia content for various platforms.",
    icon: Palette,
    category: "creative",
    defaultGoal: "Produce engaging creative content consistently across multiple platforms and formats.",
    defaultBehavior:
      "Generate content ideas, write scripts and copy, suggest visual concepts, and optimize content for different platforms and audiences.",
    suggestedTools: ["Content planning", "Script writing", "Visual concepts"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "intermediate",
    tags: ["content", "creative", "writing", "multimedia", "platforms"],
    sampleTasks: ["Generate content ideas", "Write video scripts", "Plan content calendar", "Optimize for platforms"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "music-composer",
    name: "Music Composition Assistant",
    description: "Help create melodies, chord progressions, and complete musical compositions.",
    icon: Music,
    category: "creative",
    defaultGoal: "Assist in creating original music compositions and improve musical creativity.",
    defaultBehavior:
      "Generate melody ideas, suggest chord progressions, help with song structure, and provide music theory guidance for composition projects.",
    suggestedTools: ["Music theory", "Composition tools", "Melody generation"],
    estimatedSetupTime: "30-45 minutes",
    difficulty: "advanced",
    tags: ["music", "composition", "melody", "creativity", "theory"],
    sampleTasks: ["Generate melody ideas", "Suggest chord progressions", "Structure songs", "Provide theory guidance"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "writing-assistant",
    name: "Creative Writing Assistant",
    description: "Help with creative writing projects, story development, and character creation.",
    icon: FileText,
    category: "creative",
    defaultGoal: "Enhance creative writing through story development, character building, and writing improvement.",
    defaultBehavior:
      "Assist with plot development, character creation, dialogue writing, and provide feedback on creative writing projects.",
    suggestedTools: ["Story planning", "Character development", "Writing feedback"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "intermediate",
    tags: ["writing", "creative", "story", "characters", "fiction"],
    sampleTasks: ["Develop story plots", "Create characters", "Write dialogue", "Provide writing feedback"],
    integrations: ["n8n", "lyzr"],
  },

  // TECHNOLOGY SECTOR
  {
    id: "developer-assistant",
    name: "Developer Assistant",
    description: "Automate development workflows, code reviews, and deployment processes.",
    icon: Code,
    category: "technology",
    defaultGoal: "Streamline development workflow by automating code reviews, testing, and deployment processes.",
    defaultBehavior:
      "Monitor code repositories, run automated tests, deploy applications, generate documentation, and maintain CI/CD pipelines.",
    suggestedTools: ["GitHub/GitLab integration", "CI/CD pipelines", "Code analysis"],
    estimatedSetupTime: "30-60 minutes",
    difficulty: "advanced",
    tags: ["development", "automation", "ci/cd", "code review"],
    sampleTasks: ["Set up testing pipeline", "Review pull requests", "Deploy to staging", "Generate documentation"],
    integrations: ["n8n"],
  },
  {
    id: "cybersecurity-monitor",
    name: "Cybersecurity Monitor",
    description: "Monitor security threats, analyze vulnerabilities, and maintain security protocols.",
    icon: Shield,
    category: "technology",
    defaultGoal: "Maintain robust cybersecurity through continuous monitoring and threat detection.",
    defaultBehavior:
      "Monitor network traffic, scan for vulnerabilities, analyze security logs, and alert on potential threats or breaches.",
    suggestedTools: ["Security scanning", "Threat detection", "Log analysis"],
    estimatedSetupTime: "45-60 minutes",
    difficulty: "advanced",
    tags: ["security", "monitoring", "threats", "vulnerabilities", "protection"],
    sampleTasks: [
      "Scan for vulnerabilities",
      "Monitor network traffic",
      "Analyze security logs",
      "Generate security reports",
    ],
    integrations: ["n8n"],
  },
  {
    id: "data-analyst",
    name: "Data Analysis Specialist",
    description: "Analyze data patterns, generate insights, and create comprehensive reports.",
    icon: Database,
    category: "technology",
    defaultGoal: "Extract actionable insights from data through comprehensive analysis and reporting.",
    defaultBehavior:
      "Process large datasets, identify patterns and trends, create visualizations, and generate detailed analytical reports with recommendations.",
    suggestedTools: ["Data processing", "Visualization tools", "Statistical analysis"],
    estimatedSetupTime: "35-50 minutes",
    difficulty: "advanced",
    tags: ["data", "analysis", "insights", "reporting", "visualization"],
    sampleTasks: ["Analyze sales data", "Create data visualizations", "Generate insights report", "Identify trends"],
    integrations: ["n8n", "lyzr"],
  },

  // PERSONAL LIFE SECTOR
  {
    id: "productivity-optimizer",
    name: "Personal Productivity Optimizer",
    description: "Optimize personal productivity through task automation and workflow management.",
    icon: Zap,
    category: "personal",
    defaultGoal: "Increase personal productivity by 30% through intelligent task management and workflow automation.",
    defaultBehavior:
      "Monitor calendars and tasks, schedule meetings, send reminders, generate productivity reports, and suggest workflow improvements.",
    suggestedTools: ["Calendar integration", "Task management", "Time tracking"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "beginner",
    tags: ["productivity", "automation", "scheduling", "optimization"],
    sampleTasks: ["Schedule meetings", "Send reminders", "Generate productivity reports", "Block focus time"],
    integrations: ["n8n"],
  },
  {
    id: "relationship-advisor",
    name: "Relationship & Communication Advisor",
    description: "Provide guidance on relationships, communication skills, and social interactions.",
    icon: Heart,
    category: "personal",
    defaultGoal: "Improve relationship quality and communication skills through personalized guidance and advice.",
    defaultBehavior:
      "Offer relationship advice, suggest communication strategies, help resolve conflicts, and provide tips for building stronger connections.",
    suggestedTools: ["Communication tips", "Relationship guidance", "Conflict resolution"],
    estimatedSetupTime: "15-20 minutes",
    difficulty: "beginner",
    tags: ["relationships", "communication", "advice", "social", "connections"],
    sampleTasks: [
      "Provide relationship advice",
      "Suggest communication strategies",
      "Help resolve conflicts",
      "Build connection tips",
    ],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "hobby-mentor",
    name: "Hobby & Interest Mentor",
    description: "Guide users in developing hobbies and pursuing personal interests with structured learning.",
    icon: Star,
    category: "personal",
    defaultGoal: "Help users develop and enjoy hobbies through structured guidance and skill building.",
    defaultBehavior:
      "Provide hobby-specific guidance, suggest practice routines, track progress, and connect users with relevant communities and resources.",
    suggestedTools: ["Hobby tracking", "Skill development", "Community connections"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "beginner",
    tags: ["hobbies", "interests", "learning", "skills", "personal growth"],
    sampleTasks: ["Suggest hobby activities", "Create practice schedules", "Track skill progress", "Find communities"],
    integrations: ["n8n", "lyzr"],
  },

  // FINANCE SECTOR
  {
    id: "financial-advisor",
    name: "Personal Financial Advisor",
    description: "Manage personal finances, budgeting, investments, and financial planning.",
    icon: DollarSign,
    category: "finance",
    defaultGoal: "Optimize personal finances through smart budgeting, investment tracking, and financial planning.",
    defaultBehavior:
      "Track expenses, create budgets, monitor investments, provide financial advice, and help with long-term financial planning.",
    suggestedTools: ["Expense tracking", "Budget planning", "Investment monitoring"],
    estimatedSetupTime: "25-35 minutes",
    difficulty: "intermediate",
    tags: ["finance", "budgeting", "investments", "planning", "money"],
    sampleTasks: ["Track monthly expenses", "Create budget plan", "Monitor investments", "Provide financial advice"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "investment-analyst",
    name: "Investment Research Analyst",
    description: "Research investment opportunities, analyze market trends, and provide investment insights.",
    icon: TrendingUp,
    category: "finance",
    defaultGoal: "Provide comprehensive investment research and market analysis for informed decision-making.",
    defaultBehavior:
      "Research stocks and markets, analyze financial data, track investment performance, and provide detailed investment recommendations.",
    suggestedTools: ["Market research", "Financial analysis", "Investment tracking"],
    estimatedSetupTime: "40-60 minutes",
    difficulty: "advanced",
    tags: ["investments", "research", "analysis", "markets", "stocks"],
    sampleTasks: [
      "Research investment opportunities",
      "Analyze market trends",
      "Track portfolio performance",
      "Generate investment reports",
    ],
    integrations: ["n8n", "lyzr"],
  },

  // REAL ESTATE SECTOR
  {
    id: "property-manager",
    name: "Property Management Assistant",
    description: "Manage rental properties, tenant communications, and maintenance scheduling.",
    icon: Home,
    category: "real-estate",
    defaultGoal: "Streamline property management through automated tenant communications and maintenance coordination.",
    defaultBehavior:
      "Handle tenant inquiries, schedule maintenance, track rent payments, manage property listings, and coordinate with service providers.",
    suggestedTools: ["Property management", "Tenant communication", "Maintenance scheduling"],
    estimatedSetupTime: "30-45 minutes",
    difficulty: "intermediate",
    tags: ["property", "management", "tenants", "maintenance", "real estate"],
    sampleTasks: ["Handle tenant inquiries", "Schedule maintenance", "Track rent payments", "Manage listings"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "real-estate-agent",
    name: "Real Estate Sales Agent",
    description: "Generate leads, manage client relationships, and automate real estate sales processes.",
    icon: Building,
    category: "real-estate",
    defaultGoal: "Increase real estate sales through automated lead generation and client relationship management.",
    defaultBehavior:
      "Generate property leads, manage client communications, schedule property showings, and track sales pipeline progress.",
    suggestedTools: ["Lead generation", "CRM integration", "Showing scheduler"],
    estimatedSetupTime: "25-40 minutes",
    difficulty: "intermediate",
    tags: ["real estate", "sales", "leads", "clients", "properties"],
    sampleTasks: ["Generate property leads", "Schedule showings", "Follow up with clients", "Track sales pipeline"],
    integrations: ["n8n", "lyzr"],
  },

  // E-COMMERCE SECTOR
  {
    id: "ecommerce-manager",
    name: "E-commerce Store Manager",
    description: "Manage online store operations, inventory, orders, and customer service.",
    icon: ShoppingCart,
    category: "ecommerce",
    defaultGoal: "Optimize e-commerce operations through automated inventory management and customer service.",
    defaultBehavior:
      "Monitor inventory levels, process orders, handle customer inquiries, update product listings, and analyze sales performance.",
    suggestedTools: ["Inventory management", "Order processing", "Customer service"],
    estimatedSetupTime: "30-45 minutes",
    difficulty: "intermediate",
    tags: ["ecommerce", "inventory", "orders", "customers", "sales"],
    sampleTasks: ["Monitor inventory", "Process orders", "Handle customer inquiries", "Update product listings"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "pricing-optimizer",
    name: "Dynamic Pricing Optimizer",
    description: "Optimize product pricing based on market conditions, competition, and demand.",
    icon: TrendingUp,
    category: "ecommerce",
    defaultGoal: "Maximize revenue through intelligent dynamic pricing strategies and market analysis.",
    defaultBehavior:
      "Monitor competitor prices, analyze market demand, adjust pricing strategies, and track pricing performance impact on sales.",
    suggestedTools: ["Price monitoring", "Market analysis", "Competitive intelligence"],
    estimatedSetupTime: "35-50 minutes",
    difficulty: "advanced",
    tags: ["pricing", "optimization", "competition", "revenue", "market"],
    sampleTasks: [
      "Monitor competitor prices",
      "Analyze demand patterns",
      "Adjust pricing strategy",
      "Track revenue impact",
    ],
    integrations: ["n8n", "lyzr"],
  },

  // TRAVEL SECTOR
  {
    id: "travel-planner",
    name: "Personal Travel Planner",
    description: "Plan trips, find deals, manage itineraries, and provide travel recommendations.",
    icon: Plane,
    category: "travel",
    defaultGoal: "Create amazing travel experiences through personalized trip planning and deal finding.",
    defaultBehavior:
      "Research destinations, find flight and hotel deals, create detailed itineraries, and provide local recommendations and travel tips.",
    suggestedTools: ["Travel booking", "Itinerary planning", "Deal finding"],
    estimatedSetupTime: "20-35 minutes",
    difficulty: "intermediate",
    tags: ["travel", "planning", "deals", "itinerary", "destinations"],
    sampleTasks: ["Research destinations", "Find flight deals", "Create itineraries", "Provide local recommendations"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "local-guide",
    name: "Local Area Guide & Explorer",
    description: "Discover local attractions, restaurants, events, and hidden gems in any area.",
    icon: Map,
    category: "travel",
    defaultGoal: "Help users discover and explore local attractions, dining, and entertainment options.",
    defaultBehavior:
      "Research local attractions, find restaurants and events, provide area recommendations, and create personalized exploration guides.",
    suggestedTools: ["Local research", "Event discovery", "Restaurant finder"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "beginner",
    tags: ["local", "attractions", "restaurants", "events", "exploration"],
    sampleTasks: ["Find local attractions", "Recommend restaurants", "Discover events", "Create exploration guides"],
    integrations: ["n8n", "lyzr"],
  },

  // ENTERTAINMENT SECTOR
  {
    id: "social-media-manager",
    name: "Social Media Manager",
    description: "Manage social media presence, create content, and engage with audiences across platforms.",
    icon: Camera,
    category: "entertainment",
    defaultGoal: "Build and maintain strong social media presence through consistent content and engagement.",
    defaultBehavior:
      "Create social media content, schedule posts, engage with followers, analyze performance, and manage multiple platform presence.",
    suggestedTools: ["Content creation", "Social scheduling", "Engagement tracking"],
    estimatedSetupTime: "25-40 minutes",
    difficulty: "intermediate",
    tags: ["social media", "content", "engagement", "platforms", "audience"],
    sampleTasks: ["Create social content", "Schedule posts", "Engage with followers", "Analyze performance"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "podcast-producer",
    name: "Podcast Production Assistant",
    description: "Help with podcast planning, content creation, editing guidance, and promotion.",
    icon: Headphones,
    category: "entertainment",
    defaultGoal: "Streamline podcast production from planning to promotion for consistent, quality content.",
    defaultBehavior:
      "Plan podcast episodes, suggest content topics, provide editing guidance, create show notes, and help with podcast promotion strategies.",
    suggestedTools: ["Content planning", "Show notes", "Promotion strategies"],
    estimatedSetupTime: "30-45 minutes",
    difficulty: "intermediate",
    tags: ["podcast", "production", "content", "editing", "promotion"],
    sampleTasks: ["Plan episodes", "Create show notes", "Suggest topics", "Develop promotion strategy"],
    integrations: ["n8n", "lyzr"],
  },

  // LIFESTYLE SECTOR
  {
    id: "home-organizer",
    name: "Home Organization Specialist",
    description: "Help organize living spaces, create cleaning schedules, and maintain household systems.",
    icon: Home,
    category: "lifestyle",
    defaultGoal: "Create and maintain organized, efficient living spaces through systematic organization and cleaning.",
    defaultBehavior:
      "Assess living spaces, create organization plans, schedule cleaning tasks, and provide maintenance tips for organized homes.",
    suggestedTools: ["Organization planning", "Cleaning schedules", "Space optimization"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "beginner",
    tags: ["organization", "cleaning", "home", "lifestyle", "efficiency"],
    sampleTasks: ["Create organization plan", "Schedule cleaning tasks", "Optimize space usage", "Maintain systems"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "fashion-stylist",
    name: "Personal Fashion Stylist",
    description: "Provide fashion advice, outfit coordination, and wardrobe management guidance.",
    icon: Shirt,
    category: "lifestyle",
    defaultGoal: "Enhance personal style through expert fashion advice and wardrobe optimization.",
    defaultBehavior:
      "Analyze personal style, suggest outfit combinations, provide fashion advice, and help build a cohesive wardrobe.",
    suggestedTools: ["Style analysis", "Outfit planning", "Wardrobe management"],
    estimatedSetupTime: "25-35 minutes",
    difficulty: "intermediate",
    tags: ["fashion", "style", "outfits", "wardrobe", "clothing"],
    sampleTasks: ["Analyze personal style", "Suggest outfits", "Plan wardrobe", "Provide fashion advice"],
    integrations: ["n8n", "lyzr"],
  },

  // PARENTING SECTOR
  {
    id: "parenting-coach",
    name: "Parenting Support Coach",
    description: "Provide parenting advice, child development guidance, and family activity suggestions.",
    icon: Baby,
    category: "parenting",
    defaultGoal: "Support parents with expert advice, development tracking, and family activity planning.",
    defaultBehavior:
      "Offer parenting advice, track child development milestones, suggest age-appropriate activities, and provide family management tips.",
    suggestedTools: ["Development tracking", "Activity planning", "Parenting resources"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "beginner",
    tags: ["parenting", "children", "development", "family", "activities"],
    sampleTasks: ["Provide parenting advice", "Track development", "Suggest activities", "Plan family time"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "education-planner",
    name: "Child Education Planner",
    description: "Plan educational activities, track academic progress, and support learning at home.",
    icon: GraduationCap,
    category: "parenting",
    defaultGoal: "Support child's educational development through structured learning plans and progress tracking.",
    defaultBehavior:
      "Create educational plans, track academic progress, suggest learning activities, and coordinate with school requirements.",
    suggestedTools: ["Educational planning", "Progress tracking", "Learning activities"],
    estimatedSetupTime: "25-35 minutes",
    difficulty: "intermediate",
    tags: ["education", "children", "learning", "academic", "development"],
    sampleTasks: [
      "Create learning plans",
      "Track academic progress",
      "Suggest educational activities",
      "Coordinate with school",
    ],
    integrations: ["n8n", "lyzr"],
  },

  // PETS SECTOR
  {
    id: "pet-care-manager",
    name: "Pet Care Manager",
    description: "Manage pet health, feeding schedules, exercise routines, and veterinary appointments.",
    icon: PawPrint,
    category: "pets",
    defaultGoal: "Ensure optimal pet health and happiness through comprehensive care management.",
    defaultBehavior:
      "Track pet health records, schedule feeding and exercise, remind about vet appointments, and provide pet care advice.",
    suggestedTools: ["Health tracking", "Schedule management", "Care reminders"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "beginner",
    tags: ["pets", "health", "care", "veterinary", "schedule"],
    sampleTasks: ["Track pet health", "Schedule feeding", "Remind vet appointments", "Provide care advice"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "pet-trainer",
    name: "Pet Training Assistant",
    description: "Provide pet training guidance, behavior modification tips, and training schedules.",
    icon: Award,
    category: "pets",
    defaultGoal: "Help train pets effectively through structured training programs and behavior guidance.",
    defaultBehavior:
      "Create training schedules, provide behavior modification techniques, track training progress, and offer training tips.",
    suggestedTools: ["Training schedules", "Behavior tracking", "Training resources"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "intermediate",
    tags: ["pets", "training", "behavior", "obedience", "development"],
    sampleTasks: ["Create training schedule", "Provide behavior tips", "Track training progress", "Suggest exercises"],
    integrations: ["n8n", "lyzr"],
  },

  // ENVIRONMENT SECTOR
  {
    id: "sustainability-coach",
    name: "Sustainability & Eco Coach",
    description: "Guide users toward sustainable living practices and environmental consciousness.",
    icon: Leaf,
    category: "environment",
    defaultGoal: "Promote sustainable living through practical eco-friendly advice and habit tracking.",
    defaultBehavior:
      "Suggest sustainable practices, track environmental impact, provide eco-friendly alternatives, and educate about environmental issues.",
    suggestedTools: ["Sustainability tracking", "Eco alternatives", "Impact measurement"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "beginner",
    tags: ["sustainability", "environment", "eco-friendly", "green living", "conservation"],
    sampleTasks: [
      "Suggest eco practices",
      "Track carbon footprint",
      "Find green alternatives",
      "Educate on environment",
    ],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "garden-manager",
    name: "Garden & Plant Care Manager",
    description: "Manage garden care, plant health, watering schedules, and seasonal gardening tasks.",
    icon: Flower2,
    category: "environment",
    defaultGoal: "Maintain healthy gardens and plants through proper care scheduling and expert guidance.",
    defaultBehavior:
      "Create watering schedules, track plant health, provide gardening advice, and plan seasonal garden activities.",
    suggestedTools: ["Plant care tracking", "Watering schedules", "Garden planning"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "intermediate",
    tags: ["gardening", "plants", "care", "watering", "seasons"],
    sampleTasks: ["Schedule watering", "Track plant health", "Plan seasonal tasks", "Provide garden advice"],
    integrations: ["n8n", "lyzr"],
  },

  // AUTOMOTIVE SECTOR
  {
    id: "car-maintenance-manager",
    name: "Vehicle Maintenance Manager",
    description: "Track vehicle maintenance, schedule services, and monitor car health and expenses.",
    icon: Car,
    category: "automotive",
    defaultGoal: "Maintain vehicle health and safety through proactive maintenance scheduling and tracking.",
    defaultBehavior:
      "Track maintenance schedules, remind about services, monitor vehicle expenses, and provide car care advice.",
    suggestedTools: ["Maintenance tracking", "Service reminders", "Expense monitoring"],
    estimatedSetupTime: "20-30 minutes",
    difficulty: "beginner",
    tags: ["automotive", "maintenance", "vehicle", "service", "expenses"],
    sampleTasks: ["Schedule maintenance", "Track service history", "Monitor expenses", "Provide car care tips"],
    integrations: ["n8n", "lyzr"],
  },

  // FOOD & BEVERAGE SECTOR
  {
    id: "recipe-curator",
    name: "Recipe Curator & Meal Planner",
    description: "Discover recipes, plan meals, manage grocery lists, and provide cooking guidance.",
    icon: Utensils,
    category: "food-beverage",
    defaultGoal: "Enhance cooking experience through personalized recipe curation and meal planning.",
    defaultBehavior:
      "Suggest recipes based on preferences, plan weekly meals, create grocery lists, and provide cooking tips and techniques.",
    suggestedTools: ["Recipe database", "Meal planning", "Grocery lists"],
    estimatedSetupTime: "15-25 minutes",
    difficulty: "beginner",
    tags: ["recipes", "cooking", "meal planning", "grocery", "food"],
    sampleTasks: ["Suggest recipes", "Plan weekly meals", "Create grocery lists", "Provide cooking tips"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "wine-sommelier",
    name: "Wine & Beverage Sommelier",
    description: "Provide wine recommendations, food pairings, and beverage education.",
    icon: Coffee,
    category: "food-beverage",
    defaultGoal: "Enhance dining experiences through expert wine and beverage recommendations.",
    defaultBehavior:
      "Recommend wines and beverages, suggest food pairings, provide tasting notes, and educate about different varieties.",
    suggestedTools: ["Wine database", "Pairing suggestions", "Tasting notes"],
    estimatedSetupTime: "25-35 minutes",
    difficulty: "intermediate",
    tags: ["wine", "beverages", "pairing", "tasting", "sommelier"],
    sampleTasks: ["Recommend wines", "Suggest pairings", "Provide tasting notes", "Educate about varieties"],
    integrations: ["n8n", "lyzr"],
  },

  // SPORTS SECTOR
  {
    id: "sports-coach",
    name: "Sports Performance Coach",
    description: "Provide sport-specific training, performance analysis, and improvement strategies.",
    icon: Award,
    category: "sports",
    defaultGoal: "Improve athletic performance through specialized training programs and performance analysis.",
    defaultBehavior:
      "Create sport-specific training plans, analyze performance metrics, provide technique feedback, and track athletic progress.",
    suggestedTools: ["Performance tracking", "Training plans", "Technique analysis"],
    estimatedSetupTime: "30-45 minutes",
    difficulty: "intermediate",
    tags: ["sports", "performance", "training", "athletics", "coaching"],
    sampleTasks: ["Create training plans", "Analyze performance", "Provide technique feedback", "Track progress"],
    integrations: ["n8n", "lyzr"],
  },
  {
    id: "fantasy-sports-manager",
    name: "Fantasy Sports Manager",
    description: "Manage fantasy sports teams, analyze player statistics, and optimize lineups.",
    icon: Gamepad2,
    category: "sports",
    defaultGoal: "Optimize fantasy sports performance through data analysis and strategic team management.",
    defaultBehavior:
      "Analyze player statistics, suggest lineup optimizations, track team performance, and provide fantasy sports strategy advice.",
    suggestedTools: ["Player analysis", "Lineup optimization", "Performance tracking"],
    estimatedSetupTime: "25-40 minutes",
    difficulty: "intermediate",
    tags: ["fantasy sports", "statistics", "lineup", "strategy", "management"],
    sampleTasks: ["Analyze player stats", "Optimize lineups", "Track team performance", "Provide strategy advice"],
    integrations: ["n8n", "lyzr"],
  },

  // CUSTOM AGENT
  {
    id: "custom-agent",
    name: "Custom Agent",
    description: "Build a completely custom agent tailored to your specific needs and requirements.",
    icon: Settings,
    category: "business",
    defaultGoal: "Define your own objective and customize the agent's behavior to match your unique requirements.",
    defaultBehavior:
      "Customize this agent's behavior, tools, and integrations to match your specific use case. Define custom workflows, set up unique triggers, and configure specialized responses.",
    suggestedTools: ["Custom integrations", "Flexible workflows", "Tailored responses"],
    estimatedSetupTime: "Variable",
    difficulty: "advanced",
    tags: ["custom", "flexible", "tailored", "advanced"],
    sampleTasks: ["Define custom workflow", "Set up integrations", "Configure responses", "Test behaviors"],
    integrations: ["n8n", "lyzr"],
  },
]

export function getTemplateById(id: string): AgentTemplate | undefined {
  return agentTemplates.find((template) => template.id === id)
}

export function getTemplatesByCategory(category: AgentTemplate["category"]): AgentTemplate[] {
  return agentTemplates.filter((template) => template.category === category)
}

export function getTemplatesByDifficulty(difficulty: AgentTemplate["difficulty"]): AgentTemplate[] {
  return agentTemplates.filter((template) => template.difficulty === difficulty)
}

export function searchTemplates(query: string): AgentTemplate[] {
  const lowercaseQuery = query.toLowerCase()
  return agentTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
  )
}

export const templateCategories = [
  { id: "business", name: "Business", description: "Sales, marketing, HR, and business operations" },
  { id: "health-wellness", name: "Health & Wellness", description: "Mental health, fitness, nutrition, and wellbeing" },
  { id: "education", name: "Education", description: "Learning, tutoring, and skill development" },
  { id: "creative", name: "Creative", description: "Content creation, art, music, and creative workflows" },
  { id: "technology", name: "Technology", description: "Development, cybersecurity, and technical workflows" },
  { id: "personal", name: "Personal", description: "Productivity, relationships, and personal growth" },
  { id: "finance", name: "Finance", description: "Financial planning, investments, and money management" },
  { id: "real-estate", name: "Real Estate", description: "Property management and real estate operations" },
  { id: "ecommerce", name: "E-commerce", description: "Online store management and e-commerce operations" },
  { id: "travel", name: "Travel", description: "Trip planning, local guides, and travel assistance" },
  { id: "entertainment", name: "Entertainment", description: "Social media, podcasts, and entertainment content" },
  { id: "lifestyle", name: "Lifestyle", description: "Home organization, fashion, and lifestyle management" },
  { id: "parenting", name: "Parenting", description: "Child care, education, and family management" },
  { id: "pets", name: "Pets", description: "Pet care, training, and animal wellness" },
  { id: "environment", name: "Environment", description: "Sustainability, gardening, and environmental care" },
  { id: "automotive", name: "Automotive", description: "Vehicle maintenance and automotive care" },
  { id: "food-beverage", name: "Food & Beverage", description: "Cooking, recipes, and culinary experiences" },
  { id: "sports", name: "Sports", description: "Athletic training, performance, and sports management" },
] as const

export const difficultyLevels = [
  { id: "beginner", name: "Beginner", description: "Easy to set up, minimal configuration required" },
  { id: "intermediate", name: "Intermediate", description: "Moderate setup, some technical knowledge helpful" },
  { id: "advanced", name: "Advanced", description: "Complex setup, technical expertise recommended" },
] as const
