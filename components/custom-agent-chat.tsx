"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, ArrowRight, Sparkles, Settings, Zap } from "lucide-react"
import { generateCustomChatResponse, completeCustomAgentSetup } from "@/app/onboarding/custom-agent/chat-actions"

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
}

interface CustomAgentChatProps {
  userId: string
}

export default function CustomAgentChat({ userId }: CustomAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [agentData, setAgentData] = useState<any>({
    isCustom: true,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Initialize conversation when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      startConversation()
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const startConversation = async () => {
    setIsLoading(true)
    try {
      const response = await generateCustomChatResponse({
        userId,
        isInitial: true,
      })

      if (response.success && response.message) {
        setMessages([
          {
            id: `init-${Date.now()}`,
            role: "assistant",
            content: response.message,
          },
        ])

        // Update agent data with any initial values
        if (response.agentData) {
          setAgentData((prev) => ({
            ...prev,
            ...response.agentData,
          }))
        }
      }
    } catch (error) {
      console.error("Error starting custom conversation:", error)
      setMessages([
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Hi there! I'm excited to help you create a completely custom AI agent tailored to your unique needs. What specific tasks or challenges would you like your custom agent to help you with?",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")

    // Add user message to chat
    const newUserMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: userMessage,
    }

    setMessages((prev) => [...prev, newUserMessage])
    setIsLoading(true)

    // Focus back on input after sending
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)

    try {
      // Convert messages to the format expected by the API
      const messageHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Add the new user message
      messageHistory.push({
        role: "user",
        content: userMessage,
      })

      const response = await generateCustomChatResponse({
        userId,
        messageHistory,
        userMessage,
        currentAgentData: agentData,
      })

      if (response.success && response.message) {
        // Add AI response to chat
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.message,
          },
        ])

        // Update agent data with any new information
        if (response.agentData) {
          setAgentData((prev) => ({
            ...prev,
            ...response.agentData,
          }))
        }

        // Check if setup is complete
        if (response.setupComplete) {
          setSetupComplete(true)

          // Add completion message
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: `complete-${Date.now()}`,
                role: "assistant",
                content:
                  "Perfect! Your custom agent is ready to be created. Click 'Create Custom Agent' below to bring it to life!",
              },
            ])
          }, 1000)
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "I'm having trouble processing that. Could you try rephrasing or providing more details about your custom agent needs?",
        },
      ])
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
    try {
      const result = await completeCustomAgentSetup({
        agentData,
        userId,
      })

      if (result.success && result.redirectUrl) {
        router.push(result.redirectUrl)
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: result.error || "There was an issue creating your custom agent. Please try again.",
          },
        ])
      }
    } catch (error) {
      console.error("Error creating custom agent:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "There was an error creating your custom agent. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Show current agent data as badges
  const getAgentDataBadges = () => {
    const badges = []
    if (agentData.purpose) badges.push({ label: "Purpose", value: agentData.purpose })
    if (agentData.industry) badges.push({ label: "Industry", value: agentData.industry })
    if (agentData.name) badges.push({ label: "Name", value: agentData.name })
    if (agentData.personality) badges.push({ label: "Style", value: agentData.personality })
    if (agentData.tools) badges.push({ label: "Tools", value: agentData.tools })
    return badges
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Custom Agent Creation</h1>
          <p className="text-gray-600 dark:text-gray-400">Let's build your unique AI agent together</p>
        </div>
      </div>

      {/* Agent Data Progress */}
      {getAgentDataBadges().length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Configuration</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {getAgentDataBadges().map((badge, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <span className="font-medium">{badge.label}:</span>
                  <span className="ml-1 truncate max-w-[100px]">{badge.value}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat container */}
      <Card className="flex-1 min-h-[500px] max-h-[600px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 pt-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === "assistant"
                    ? "bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 text-gray-800 dark:text-gray-200 border border-purple-100 dark:border-purple-800"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  <span className="text-purple-600 dark:text-purple-400 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Chat input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your custom agent needs..."
              className="flex-1"
              disabled={isLoading || setupComplete}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || setupComplete}
              size="icon"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {setupComplete && (
        <Button
          onClick={handleCreateAgent}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-6 text-lg font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Custom Agent...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-5 w-5" />
              Create Custom Agent <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
