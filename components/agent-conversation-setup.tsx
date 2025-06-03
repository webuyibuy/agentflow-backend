"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, ArrowRight, CheckCircle, Sparkles } from "lucide-react"
import { generateConversationalResponse } from "@/app/onboarding/agent-config/conversation-actions"

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
  timestamp: Date
}

interface AgentConversationSetupProps {
  templateSlug: string
  templateName: string
  agentGoal: string
  onSetupComplete: (answers: Record<string, any>, plan: any) => void
}

export default function AgentConversationSetup({
  templateSlug,
  templateName,
  agentGoal,
  onSetupComplete,
}: AgentConversationSetupProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [setupComplete, setSetupComplete] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Initialize conversation when component mounts
  useEffect(() => {
    if (messages.length === 0 && agentGoal) {
      startConversation()
    }
  }, [agentGoal])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const startConversation = async () => {
    setIsLoading(true)
    try {
      const response = await generateConversationalResponse({
        templateSlug,
        templateName,
        agentGoal,
        messageHistory: [],
        isInitial: true,
      })

      if (response.success && response.message) {
        setMessages([
          {
            id: `init-${Date.now()}`,
            role: "assistant",
            content: response.message,
            timestamp: new Date(),
          },
        ])

        // Extract any initial questions or context
        if (response.extractedData) {
          setAnswers(response.extractedData)
        }

        // Check if the AI determined setup is complete
        if (response.setupComplete && response.plan) {
          setSetupComplete(true)
          setPlan(response.plan)
          onSetupComplete(response.extractedData || {}, response.plan)
        }
      }
    } catch (error) {
      console.error("Error starting conversation:", error)
      setMessages([
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Hello! I'm your ${templateName}. I'll help you achieve your goal: "${agentGoal}". What specific challenges are you facing right now?`,
          timestamp: new Date(),
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
      timestamp: new Date(),
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

      const response = await generateConversationalResponse({
        templateSlug,
        templateName,
        agentGoal,
        messageHistory,
        userMessage,
        currentAnswers: answers,
      })

      if (response.success && response.message) {
        // Add AI response to chat
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.message,
            timestamp: new Date(),
          },
        ])

        // Update answers with any extracted data
        if (response.extractedData) {
          setAnswers((prev) => ({
            ...prev,
            ...response.extractedData,
          }))
        }

        // Check if the AI determined setup is complete
        if (response.setupComplete && response.plan) {
          setSetupComplete(true)
          setPlan(response.plan)
          onSetupComplete({ ...answers, ...response.extractedData }, response.plan)
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "I'm having trouble processing that. Could you try rephrasing or providing more details?",
          timestamp: new Date(),
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

  // Get avatar image based on template
  const getAvatarImage = () => {
    const avatars: Record<string, string> = {
      "mental-peace-coach": "/placeholder.svg?height=40&width=40",
      "fitness-trainer": "/placeholder.svg?height=40&width=40",
      "sales-lead-generator": "/placeholder.svg?height=40&width=40",
      "marketing-content-manager": "/placeholder.svg?height=40&width=40",
      "financial-advisor": "/placeholder.svg?height=40&width=40",
      "productivity-optimizer": "/placeholder.svg?height=40&width=40",
    }

    return avatars[templateSlug] || "/placeholder.svg?height=40&width=40"
  }

  if (!agentGoal) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-gray-500">Please provide a goal for your agent to start the conversation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-[600px] rounded-lg border bg-white shadow">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Avatar className="h-10 w-10">
          <img src={getAvatarImage() || "/placeholder.svg"} alt={templateName} />
        </Avatar>
        <div>
          <h3 className="font-semibold">{templateName}</h3>
          <p className="text-xs text-gray-500">Configuring your agent through conversation</p>
        </div>
        {setupComplete && (
          <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="mr-1 h-3 w-3" /> Setup Complete
          </Badge>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "assistant" ? "bg-gray-100 text-gray-800" : "bg-blue-600 text-white"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-1 ${message.role === "assistant" ? "text-gray-500" : "text-blue-200"}`}>
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <span className="text-gray-500 text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {setupComplete && plan && (
          <div className="flex justify-center my-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-[90%]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800">Your Personalized Plan</h4>
              </div>
              <div className="text-sm text-green-700 space-y-2">
                {plan.title && <p className="font-medium">{plan.title}</p>}
                {plan.description && <p>{plan.description}</p>}
                {plan.steps && Array.isArray(plan.steps) && (
                  <ol className="list-decimal pl-5 space-y-1">
                    {plan.steps.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                )}
                <div className="pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onSetupComplete(answers, plan)}
                  >
                    Continue with this plan <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 resize-none"
            rows={1}
            disabled={isLoading || setupComplete}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || setupComplete}
            className="self-end"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
