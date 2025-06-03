"use client"
import { useActionState } from "react"
import { useState, useEffect } from "react"
import {
  storeAgentConfiguration,
  type AgentConfigState,
  clearStoredAgentConfiguration,
} from "@/app/onboarding/agent-config/actions"
import {
  getTemplateConfigurationAction,
  type TemplateConfiguration,
} from "@/app/onboarding/agent-config/template-actions"
import { ClientTemplateManager } from "@/lib/client-template-manager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, Settings, Terminal, ArrowRight, Lock, Edit2, AlertTriangle, Loader2 } from "lucide-react"
import CustomQuestionsForm from "./custom-questions-form"
import BrainDumpAnalyzer from "./brain-dump-analyzer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface EnhancedAgentConfigFormProps {
  templateSlug: string
  templateName?: string
}

export default function EnhancedAgentConfigForm({
  templateSlug,
  templateName = "Agent",
}: EnhancedAgentConfigFormProps) {
  const initialState: AgentConfigState = {}
  const [state, formAction, isPending] = useActionState(storeAgentConfiguration, initialState)
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({})
  const [agentGoal, setAgentGoal] = useState<string>("")
  const [agentBehavior, setAgentBehavior] = useState<string>("")
  const [agentName, setAgentName] = useState<string>("")
  const [isCustomTemplate, setIsCustomTemplate] = useState(templateSlug === "custom-agent")
  const [isEditMode, setIsEditMode] = useState(false)
  const [templateConfig, setTemplateConfig] = useState<TemplateConfiguration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(isCustomTemplate ? "manual" : "template")
  const router = useRouter()
  const { toast } = useToast()

  // Handle redirect after successful form submission
  useEffect(() => {
    console.log("🔍 State changed:", state)
    if (state?.success && state?.redirectTo) {
      console.log("🎯 Redirecting to:", state.redirectTo)
      toast({
        title: "Configuration Saved",
        description: "Redirecting to review and planning...",
      })
      // Use a small timeout to ensure the toast is visible before redirect
      setTimeout(() => {
        router.push(state.redirectTo)
      }, 300)
    }
  }, [state, router, toast])

  // Load template configuration
  useEffect(() => {
    const loadTemplateConfig = async () => {
      try {
        console.log("🔄 Initiating template configuration load for:", templateSlug)
        setIsLoading(true)

        const serverConfig = await getTemplateConfigurationAction(templateSlug)

        if (serverConfig) {
          console.log("✅ Server config loaded:", serverConfig)
          setTemplateConfig(serverConfig)
          setAgentGoal(serverConfig.goal || "")
          setAgentBehavior(serverConfig.behavior || "")
        } else {
          console.log("⚠️ No server config, using client fallback")
          const clientConfig = ClientTemplateManager.getBasicTemplateConfiguration(templateSlug)
          if (clientConfig) {
            setTemplateConfig({
              ...clientConfig,
              customQuestions: [],
              defaultAnswers: {},
            })
            setAgentGoal(clientConfig.goal || "")
            setAgentBehavior(clientConfig.behavior || "")
          }
        }

        if (templateSlug === "custom-agent") {
          setAgentGoal("Help users accomplish their goals efficiently and effectively.")
          setAgentBehavior("Be helpful, professional, and provide clear guidance to users.")
          setActiveTab("manual")
          setIsEditMode(true)
        }

        setIsCustomTemplate(templateSlug === "custom-agent")
        setIsEditMode(templateSlug === "custom-agent")
      } catch (error: any) {
        console.error("❌ Error loading template configuration for:", templateSlug, error.message, error)
        const clientConfig = ClientTemplateManager.getBasicTemplateConfiguration(templateSlug)
        if (clientConfig) {
          setTemplateConfig({
            ...clientConfig,
            customQuestions: [],
            defaultAnswers: {},
          })
          setAgentGoal(clientConfig.goal || "")
          setAgentBehavior(clientConfig.behavior || "")
        }
        if (templateSlug === "custom-agent") {
          setAgentGoal("Help users accomplish their goals efficiently and effectively.")
          setAgentBehavior("Be helpful, professional, and provide clear guidance to users.")
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadTemplateConfig()
  }, [templateSlug])

  const handleBrainDumpComplete = (result: {
    goal: string
    behavior: string
    suggestedAnswers: Record<string, any>
  }) => {
    console.log("🧠 Brain dump completed:", result)
    setAgentGoal(result.goal)
    setAgentBehavior(result.behavior)
    setCustomAnswers((prev) => ({ ...prev, ...result.suggestedAnswers }))
    setActiveTab("manual")
    setIsEditMode(true)
  }

  const isFormValid = (tab: string) => {
    const nameValid = agentName.trim().length >= 3
    const goalValid = agentGoal.trim().length >= 10
    const behaviorValid = !isCustomTemplate || (agentBehavior && agentBehavior.trim().length > 0)

    switch (tab) {
      case "template":
        return nameValid && goalValid
      case "manual":
        return nameValid && goalValid && behaviorValid
      case "brain-dump":
        return nameValid && goalValid
      default:
        return false
    }
  }

  const showDebugInfo = process.env.NODE_ENV === "development" && state?.debug

  const handleClearConfiguration = async () => {
    try {
      const result = await clearStoredAgentConfiguration()
      if (result.success) {
        setAgentName("")
        if (templateSlug === "custom-agent") {
          setAgentGoal("Help users accomplish their goals efficiently and effectively.")
          setAgentBehavior("Be helpful, professional, and provide clear guidance to users.")
        } else {
          const clientConfig = ClientTemplateManager.getBasicTemplateConfiguration(templateSlug)
          const serverConfig = templateConfig

          setAgentGoal(serverConfig?.goal || clientConfig?.goal || "")
          setAgentBehavior(serverConfig?.behavior || clientConfig?.behavior || "")
        }
        setCustomAnswers({})
        setActiveTab(isCustomTemplate ? "manual" : "template")
        setIsEditMode(isCustomTemplate)
        toast({
          title: "Configuration Cleared",
          description: "Your pending agent configuration has been discarded.",
        })
      } else {
        toast({
          title: "Clearing Failed",
          description: result.message || "Could not discard pending configuration.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error clearing configuration:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while discarding changes.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-xl space-y-8 flex items-center justify-center py-12">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 text-[#007AFF] animate-spin" />
          <h2 className="mt-4 text-xl font-semibold">Loading configuration...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl space-y-8">
      <div className="text-center">
        <Settings className="mx-auto h-12 w-12 text-[#007AFF]" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">Configure Your {templateName}</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          {isCustomTemplate
            ? "Create a completely custom agent tailored to your specific needs."
            : `Configure your pre-built ${templateName} with your specific requirements.`}
        </p>
      </div>

      {/* Debug section - only show in development */}
      {process.env.NODE_ENV === "development" && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertTitle>Debug Info</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 text-sm">
              <p>Form Valid: {isFormValid(activeTab) ? "✅ Yes" : "❌ No"}</p>
              <p>Agent Name: {agentName.length} chars</p>
              <p>Agent Goal: {agentGoal.length} chars</p>
              <p>Agent Behavior: {(agentBehavior || "").length} chars</p>
              <p>Is Pending: {isPending ? "Yes" : "No"}</p>
              <p>State: {JSON.stringify(state, null, 2)}</p>
              <Button onClick={() => router.push("/onboarding/review-deploy")} variant="outline" size="sm">
                Test Manual Redirect
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showDebugInfo && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4" /> <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription>
            <pre className="text-xs mt-2 overflow-auto max-h-32">{JSON.stringify(state.debug, null, 2)}</pre>
          </AlertDescription>
        </Alert>
      )}
      {state?.message && !state.success && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" /> <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {state?.success && (
        <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
          <ArrowRight className="h-4 w-4" /> <AlertTitle>Configuration Saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {!isCustomTemplate && !isEditMode && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4" /> <AlertTitle>Pre-built Template</AlertTitle>
          <AlertDescription>
            This is a pre-configured template. You can use it as-is or{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 dark:text-blue-400 inline"
              onClick={() => {
                setIsEditMode(true)
                setActiveTab("manual")
                if (!agentGoal && templateConfig?.goal) setAgentGoal(templateConfig.goal)
                if (!agentBehavior && templateConfig?.behavior) setAgentBehavior(templateConfig.behavior)
              }}
            >
              <Edit2 className="h-3 w-3 mr-1 inline" />
              customize it
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="template" disabled={isCustomTemplate}>
            Use Template
          </TabsTrigger>
          <TabsTrigger value="manual">Manual Setup</TabsTrigger>
          <TabsTrigger value="brain-dump">Brain Dump</TabsTrigger>
        </TabsList>

        <TabsContent value="template">
          <div className="space-y-6 py-4">
            <Alert variant="default" className="bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700">
              <Lock className="h-4 w-4" />
              <AlertTitle>Pre-configured Template</AlertTitle>
              <AlertDescription>
                This template comes with pre-configured settings optimized for {templateName} use cases.
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 dark:text-blue-400"
                  onClick={() => {
                    setIsEditMode(true)
                    setActiveTab("manual")
                    if (!agentGoal && templateConfig?.goal) {
                      setAgentGoal(templateConfig.goal)
                    }
                    if (!agentBehavior && templateConfig?.behavior) {
                      setAgentBehavior(templateConfig.behavior)
                    }
                  }}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Customize
                </Button>
              </AlertDescription>
            </Alert>

            <form action={formAction} className="space-y-6">
              <input type="hidden" name="templateSlug" value={templateSlug} />
              <input type="hidden" name="agentGoal" value={agentGoal || ""} />
              <input type="hidden" name="agentBehavior" value={agentBehavior || ""} />
              <input type="hidden" name="customAnswers" value={JSON.stringify(customAnswers)} />
              <input type="hidden" name="configurationMethod" value="template" />
              <div>
                <Label htmlFor="agentName-template" className="font-medium text-gray-700 dark:text-gray-300">
                  Agent Name *
                </Label>
                <Input
                  id="agentName-template"
                  name="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder={`e.g., My ${templateName}`}
                  required
                  minLength={3}
                  maxLength={50}
                  className="mt-1"
                  aria-describedby="agentName-template-error"
                  disabled={!isEditMode && !isCustomTemplate}
                />
                {state?.errors?.agentName && (
                  <p id="agentName-template-error" className="mt-1 text-sm text-red-600">
                    {state.errors.agentName.join(", ")}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="agentGoal-template"
                  className="font-medium text-gray-700 dark:text-gray-300 flex items-center"
                >
                  Primary Goal
                  <Lock className="ml-2 h-4 w-4 text-gray-400" />
                </Label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md dark:bg-gray-800/50 dark:border-gray-700 min-h-[60px]">
                  {agentGoal || "Loading template configuration..."}
                </div>
                {agentGoal.length < 10 && (
                  <p className="mt-1 text-sm text-amber-600">
                    Template goal must be at least 10 characters. Current: {agentGoal.length}
                  </p>
                )}
                {state?.errors?.agentGoal && (
                  <p className="mt-1 text-sm text-red-600">{state.errors.agentGoal.join(", ")}</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="agentBehavior-template"
                  className="font-medium text-gray-700 dark:text-gray-300 flex items-center"
                >
                  Behavior / Instructions
                  <Lock className="ml-2 h-4 w-4 text-gray-400" />
                </Label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md dark:bg-gray-800/50 dark:border-gray-700 min-h-[100px] whitespace-pre-wrap">
                  {agentBehavior || "Loading template configuration..."}
                </div>
                {state?.errors?.agentBehavior && (
                  <p className="mt-1 text-sm text-red-600">{state.errors.agentBehavior.join(", ")}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white text-lg py-3 flex items-center justify-center gap-2"
                disabled={isPending || !isFormValid("template")}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  <>
                    Next: Review & Plan <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
              {!isFormValid("template") && (
                <p className="text-sm text-amber-600 text-center">Please ensure agent name is at least 3 characters.</p>
              )}
            </form>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <div className="space-y-6 py-4">
            <form action={formAction} className="space-y-6">
              <input type="hidden" name="templateSlug" value={templateSlug} />
              <input type="hidden" name="customAnswers" value={JSON.stringify(customAnswers)} />
              <input type="hidden" name="configurationMethod" value="manual" />
              <div>
                <Label htmlFor="agentName-manual" className="font-medium text-gray-700 dark:text-gray-300">
                  Agent Name *
                </Label>
                <Input
                  id="agentName-manual"
                  name="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder={`e.g., My ${templateName}`}
                  required
                  minLength={3}
                  maxLength={50}
                  className="mt-1"
                  aria-describedby="agentName-manual-error"
                />
                {state?.errors?.agentName && (
                  <p id="agentName-manual-error" className="mt-1 text-sm text-red-600">
                    {state.errors.agentName.join(", ")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="agentGoal-manual" className="font-medium text-gray-700 dark:text-gray-300">
                  Primary Goal *
                </Label>
                <Textarea
                  id="agentGoal-manual"
                  name="agentGoal"
                  value={agentGoal}
                  onChange={(e) => setAgentGoal(e.target.value)}
                  placeholder="What is the main objective for this agent?"
                  required
                  minLength={10}
                  maxLength={500}
                  className="mt-1 min-h-[100px]"
                  aria-describedby="agentGoal-manual-error"
                />
                <p className="mt-1 text-xs text-gray-500">{agentGoal.length}/500 characters (min 10)</p>
                {state?.errors?.agentGoal && (
                  <p id="agentGoal-manual-error" className="mt-1 text-sm text-red-600">
                    {state.errors.agentGoal.join(", ")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="agentBehavior-manual" className="font-medium text-gray-700 dark:text-gray-300">
                  Behavior / Instructions {isCustomTemplate ? "*" : "(Optional)"}
                </Label>
                <Textarea
                  id="agentBehavior-manual"
                  name="agentBehavior"
                  value={agentBehavior || ""}
                  onChange={(e) => setAgentBehavior(e.target.value)}
                  placeholder="Describe how the agent should operate, its personality, specific tasks, or constraints."
                  maxLength={1000}
                  className="mt-1 min-h-[120px]"
                  aria-describedby="agentBehavior-manual-error"
                  required={isCustomTemplate}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {(agentBehavior || "").length}/1000 characters {isCustomTemplate && "(required)"}
                </p>
                {state?.errors?.agentBehavior && (
                  <p id="agentBehavior-manual-error" className="mt-1 text-sm text-red-600">
                    {state.errors.agentBehavior.join(", ")}
                  </p>
                )}
              </div>
              <CustomQuestionsForm
                templateSlug={templateSlug}
                templateName={templateName}
                agentGoal={agentGoal}
                onAnswersChange={setCustomAnswers}
              />
              <Button
                type="submit"
                className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white text-lg py-3 flex items-center justify-center gap-2"
                disabled={isPending || !isFormValid("manual")}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  <>
                    Next: Review & Plan <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
              {!isFormValid("manual") && (
                <p className="text-sm text-amber-600 text-center">
                  Please fill in all required fields with minimum character requirements.
                </p>
              )}
            </form>
          </div>
        </TabsContent>

        <TabsContent value="brain-dump">
          <div className="space-y-6 py-4">
            <BrainDumpAnalyzer
              templateId={templateSlug}
              templateName={templateName}
              onAnalysisComplete={handleBrainDumpComplete}
            />
            {(agentGoal || agentBehavior) && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium mb-4">Review & Finalize Analyzed Configuration</h3>
                <form action={formAction} className="space-y-6">
                  <input type="hidden" name="templateSlug" value={templateSlug} />
                  <input type="hidden" name="customAnswers" value={JSON.stringify(customAnswers)} />
                  <input type="hidden" name="configurationMethod" value="brain-dump" />
                  <div>
                    <Label htmlFor="agentName-brain" className="font-medium text-gray-700 dark:text-gray-300">
                      Agent Name *
                    </Label>
                    <Input
                      id="agentName-brain"
                      name="agentName"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder={`e.g., My ${templateName}`}
                      required
                      minLength={3}
                      maxLength={50}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="agentGoal-brain" className="font-medium text-gray-700 dark:text-gray-300">
                      Primary Goal (from analysis) *
                    </Label>
                    <Textarea
                      id="agentGoal-brain"
                      name="agentGoal"
                      value={agentGoal}
                      onChange={(e) => setAgentGoal(e.target.value)}
                      className="mt-1 min-h-[100px]"
                      required
                      minLength={10}
                    />
                    <p className="mt-1 text-xs text-gray-500">{agentGoal.length}/500 characters (min 10)</p>
                  </div>
                  <div>
                    <Label htmlFor="agentBehavior-brain" className="font-medium text-gray-700 dark:text-gray-300">
                      Behavior / Instructions (from analysis)
                    </Label>
                    <Textarea
                      id="agentBehavior-brain"
                      name="agentBehavior"
                      value={agentBehavior || ""}
                      onChange={(e) => setAgentBehavior(e.target.value)}
                      className="mt-1 min-h-[120px]"
                    />
                    <p className="mt-1 text-xs text-gray-500">{(agentBehavior || "").length}/1000 characters</p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#007AFF] hover:bg-[#0056b3] text-white text-lg py-3 flex items-center justify-center gap-2"
                    disabled={isPending || !isFormValid("brain-dump")}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                      </>
                    ) : (
                      <>
                        Next: Review & Plan <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                  {!isFormValid("brain-dump") && (
                    <p className="text-sm text-amber-600 text-center">Please provide an agent name and goal.</p>
                  )}
                </form>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-6 text-center">
        <Button
          type="button"
          variant="link"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={handleClearConfiguration}
          disabled={isPending}
        >
          Discard all unsaved changes and reset this form
        </Button>
      </div>
    </div>
  )
}
