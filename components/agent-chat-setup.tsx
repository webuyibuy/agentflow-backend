"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, ArrowRight, Sparkles, AlertCircle, Settings, CheckCircle, Bot, Zap } from "lucide-react"
import { generateChatResponse, completeAgentSetup, acceptSuggestion } from "@/app/onboarding/agent-config/chat-actions"
import type { AgentTemplate } from "@/lib/agent-templates"

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
  debugInfo?: any
}

interface AgentChatSetupProps {
  templateSlug: string
  templateName: string
  userId: string
  template?: AgentTemplate | null
}

export default function AgentChatSetup({ templateSlug, templateName, userId, template }: AgentChatSetupProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [conversationCount, setConversationCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [apiCallsMade, setApiCallsMade] = useState(0)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [agentData, setAgentData] = useState<any>({
    templateSlug,
    templateName,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (messages.length === 0) {
      startConversation()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isLoading])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const startConversation = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("🚀 [CLIENT] Starting conversation...")
      const response = await generateChatResponse({
        templateSlug,
        templateName,
        userId,
        isInitial: true,
      })

      console.log("📋 [CLIENT] Response:", response)
      setDebugInfo(response.debugInfo)

      if (response.success && response.message) {
        setMessages([
          {
            id: `init-${Date.now()}`,
            role: "assistant",
            content: response.message,
            debugInfo: response.debugInfo,
          },
        ])

        if (response.apiCallMade) {
          setApiCallsMade((prev) => prev + 1)
        }

        if (response.agentData) {
          setAgentData((prev) => ({
            ...prev,
            ...response.agentData,
          }))
        }

        if (response.suggestions) {
          setSuggestions(response.suggestions)
        }

        setConversationCount(0)
      } else {
        setError(response.error || "Failed to get AI response")
        console.error("❌ [CLIENT] API call failed:", response.error)

        if (response.error?.includes("API key")) {
          setMessages([
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              content:
                "To get started, please add your OpenAI API key in Settings → Profile. Click the 'Add API Key' button below to set it up.",
            },
          ])
        }
      }
    } catch (error) {
      console.error("💥 [CLIENT] Error:", error)
      setError("Connection error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setError(null)

    // Add user message
    const newUserMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: userMessage,
    }

    setMessages((prev) => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      console.log(`🚀 [CLIENT] Sending: "${userMessage}"`)

      const messageHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      messageHistory.push({
        role: "user",
        content: userMessage,
      })

      const response = await generateChatResponse({
        templateSlug,
        templateName,
        userId,
        messageHistory,
        userMessage,
        currentAgentData: agentData,
      })

      console.log("📋 [CLIENT] Response:", response)
      setDebugInfo(response.debugInfo)

      if (response.success && response.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.message,
            debugInfo: response.debugInfo,
          },
        ])

        if (response.apiCallMade) {
          setApiCallsMade((prev) => prev + 1)
        }

        if (response.agentData) {
          setAgentData((prev) => ({
            ...prev,
            ...response.agentData,
          }))
        }

        if (response.suggestions) {
          setSuggestions(response.suggestions)
        }

        if (response.conversationCount !== undefined) {
          setConversationCount(response.conversationCount)
        }

        if (response.setupComplete) {
          setSetupComplete(true)
        }
      } else {
        setError(response.error || "Failed to get AI response")
        console.error("❌ [CLIENT] API call failed:", response.error)
      }
    } catch (error) {
      console.error("💥 [CLIENT] Error:", error)
      setError("Failed to send message. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = async (suggestion: string) => {
    setIsLoading(true)
    try {
      const response = await acceptSuggestion(suggestion, userId, agentData)

      if (response.success && response.message) {
        // Add the suggestion as user message
        const suggestionMessage = {
          id: `suggestion-${Date.now()}`,
          role: "user" as const,
          content: suggestion,
        }

        // Add AI response
        const aiMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant" as const,
          content: response.message,
        }

        setMessages((prev) => [...prev, suggestionMessage, aiMessage])

        if (response.agentData) {
          setAgentData((prev) => ({
            ...prev,
            ...response.agentData,
          }))
        }

        setConversationCount((prev) => prev + 1)
        setSuggestions([]) // Clear suggestions after use
      }
    } catch (error) {
      console.error("Error handling suggestion:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCreateAgent = async () => {
    setIsLoading(true)
    setError(null) // Clear previous errors

    try {
      console.log("🎯 [CLIENT] Creating agent with data:", agentData)

      const result = await completeAgentSetup({
        agentData,
        userId,
      })

      console.log("📋 [CLIENT] Agent creation result:", result)

      if (result.success && result.redirectUrl) {
        console.log("✅ [CLIENT] Redirecting to:", result.redirectUrl)

        // Add a small delay to ensure database operations complete
        setTimeout(() => {
          router.push(result.redirectUrl)
        }, 500)
      } else {
        console.error("❌ [CLIENT] Agent creation failed:", result.error)
        setError(result.error || "Failed to create agent")
      }
    } catch (error) {
      console.error("💥 [CLIENT] Error creating agent:", error)
      setError("Failed to create agent. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddApiKey = () => {
    router.push("/dashboard/settings/profile")
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{templateName} Setup</h1>
            <p className="text-gray-600 dark:text-gray-400">AI-powered agent configuration</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={apiCallsMade > 0 ? "default" : "secondary"} className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {apiCallsMade} API calls
          </Badge>
          {setupComplete && (
            <Badge variant="default" className="bg-purple-600">
              <Zap className="h-3 w-3 mr-1" />
              Ready to Create
            </Badge>
          )}
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <Card className="bg-gray-50 dark:bg-gray-900">
          <CardContent className="p-3">
            <div className="text-xs space-y-1">
              <div>
                <strong>Status:</strong> API Key: {debugInfo.apiKeyFound ? "✅" : "❌"} | Call:{" "}
                {debugInfo.apiCallSuccessful ? "✅" : "❌"} | Duration: {debugInfo.apiCallDuration}ms
              </div>
              {debugInfo.tokensUsed && (
                <div>
                  <strong>Usage:</strong> {debugInfo.tokensUsed} tokens | Response: {debugInfo.aiMessageLength} chars
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {error.includes("API key") && (
              <Button variant="outline" size="sm" onClick={handleAddApiKey}>
                <Settings className="h-4 w-4 mr-2" />
                Add API Key
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {conversationCount > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Progress: {conversationCount}/3 exchanges</span>
          <div className="flex space-x-1">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${step <= conversationCount ? "bg-green-600" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <Card className="flex-1 min-h-[500px] max-h-[600px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 pt-6">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "assistant"
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-200"
                      : "bg-gray-900 text-white"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  {message.debugInfo?.apiCallSuccessful && (
                    <div className="mt-2 text-xs opacity-70 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Real OpenAI ({message.debugInfo.tokensUsed} tokens)
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-2 mt-4">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-purple-50 hover:bg-purple-100 border-purple-200"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-gray-500 text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* API Key Missing - Add Key Button */}
      {error?.includes("API key") && (
        <Button
          onClick={handleAddApiKey}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold"
        >
          <Settings className="mr-2 h-5 w-5" />
          Add Your OpenAI API Key
        </Button>
      )}

      {/* Agent Data Preview */}
      {Object.keys(agentData).length > 2 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              Agent Configuration
            </h3>
            <div className="text-xs space-y-1 text-gray-600">
              {agentData.name && (
                <div>
                  <strong>Name:</strong> {agentData.name}
                </div>
              )}
              {agentData.goal && (
                <div>
                  <strong>Goal:</strong> {agentData.goal}
                </div>
              )}
              {agentData.focus_area && (
                <div>
                  <strong>Focus:</strong> {agentData.focus_area}
                </div>
              )}
              {agentData.industry && (
                <div>
                  <strong>Industry:</strong> {agentData.industry}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Button */}
      {setupComplete && (
        <Button
          onClick={handleCreateAgent}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-6 text-lg font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Agent & Tasks...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Create Agent & Start Working <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
