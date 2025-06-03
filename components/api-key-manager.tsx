"use client"

import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useActionState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Trash2, Plus, Settings, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import {
  saveApiKey,
  deleteApiKey,
  updateApiKeyModel,
  getApiKeys,
  type ApiKeyWithModel,
} from "@/app/dashboard/settings/profile/api-key-actions"
import { LLM_PROVIDERS } from "@/lib/multi-llm-provider"

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI", description: "GPT-4, GPT-3.5 Turbo" },
  { value: "anthropic", label: "Anthropic", description: "Claude 3 Opus, Sonnet, Haiku" },
  { value: "groq", label: "Groq", description: "Llama 3, Mixtral" },
  { value: "xai", label: "xAI", description: "Grok" },
]

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeyWithModel[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedModel, setSelectedModel] = useState("")

  const [saveState, saveAction, isSaving] = useActionState(saveApiKey, undefined)
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteApiKey, undefined)
  const [updateState, updateAction, isUpdating] = useActionState(updateApiKeyModel, undefined)

  // Load API keys on component mount
  useEffect(() => {
    loadApiKeys()
  }, [])

  // Reload API keys when actions complete successfully
  useEffect(() => {
    if (saveState?.success || deleteState?.success || updateState?.success) {
      loadApiKeys()
      if (saveState?.success) {
        setShowAddForm(false)
        setSelectedProvider("")
        setSelectedModel("")
      }
    }
  }, [saveState, deleteState, updateState])

  const loadApiKeys = async () => {
    try {
      const keys = await getApiKeys()
      setApiKeys(keys)
    } catch (error) {
      console.error("Error loading API keys:", error)
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const getAvailableModels = (provider: string) => {
    const providerConfig = LLM_PROVIDERS[provider]
    return providerConfig?.models || []
  }

  const getDefaultModel = (provider: string) => {
    const providerConfig = LLM_PROVIDERS[provider]
    return providerConfig?.defaultModel || ""
  }

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    setSelectedModel(getDefaultModel(provider))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          LLM API Keys & Models
        </CardTitle>
        <CardDescription>
          Manage your API keys for different LLM providers and select preferred models. These keys are encrypted and
          stored securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success/Error Messages */}
        {(saveState?.success || deleteState?.success || updateState?.success) && (
          <Alert className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300">
            <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>{saveState?.message || deleteState?.message || updateState?.message}</AlertDescription>
          </Alert>
        )}

        {(saveState?.error || deleteState?.error || updateState?.error) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{saveState?.error || deleteState?.error || updateState?.error}</AlertDescription>
          </Alert>
        )}

        {/* Existing API Keys */}
        {apiKeys.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Your API Keys</h3>
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{apiKey.provider.toUpperCase()}</Badge>
                    <span className="font-medium">{apiKey.key_name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Added: {new Date(apiKey.created_at).toLocaleDateString()}
                  </div>
                  {apiKey.preferred_model && (
                    <div className="text-sm text-muted-foreground">
                      Preferred Model: <span className="font-medium">{apiKey.preferred_model}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Model Selection */}
                  <form action={updateAction} className="flex items-center gap-2">
                    <input type="hidden" name="keyId" value={apiKey.id} />
                    <Select
                      name="preferredModel"
                      defaultValue={apiKey.preferred_model || getDefaultModel(apiKey.provider)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableModels(apiKey.provider).map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm" variant="outline" disabled={isUpdating}>
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                    </Button>
                  </form>

                  {/* Delete Button */}
                  <form action={deleteAction}>
                    <input type="hidden" name="keyId" value={apiKey.id} />
                    <Button type="submit" variant="destructive" size="sm" disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New API Key */}
        {!showAddForm ? (
          <Button onClick={() => setShowAddForm(true)} className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add New API Key
          </Button>
        ) : (
          <form action={saveAction} className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
            <h3 className="text-lg font-medium">Add New API Key</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select name="provider" value={selectedProvider} onValueChange={handleProviderChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <div>
                          <div className="font-medium">{provider.label}</div>
                          <div className="text-xs text-muted-foreground">{provider.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  name="keyName"
                  placeholder="e.g., My OpenAI Key"
                  required
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="Enter your API key"
                required
                className="bg-white dark:bg-gray-800"
              />
            </div>

            {selectedProvider && (
              <div className="space-y-2">
                <Label htmlFor="preferredModel">Preferred Model</Label>
                <Select name="preferredModel" value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableModels(selectedProvider).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You can change this later. Default: {getDefaultModel(selectedProvider)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save API Key"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedProvider("")
                  setSelectedModel("")
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {apiKeys.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No API keys configured yet.</p>
            <p className="text-sm">Add your first API key to start using AI features.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
