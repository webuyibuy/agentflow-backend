"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Bot, User, Send, Loader2, CheckCircle, ArrowRight, MessageSquare, Sparkles } from "lucide-react"
import {
  initializeGeneralAgentConversation,
  sendMessageToGeneralAgent,
  getConversationHistory,
  completeOnboarding,
} from "@/app/onboarding/general-agent/enhanced-actions"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

interface ChatState {
  conversationId: string | null
  messages: Message[]
  isLoading: boolean
  isInitializing: boolean
  error: string | null
  messageCount: number
  isCompleting: boolean
}

export default function EnhancedGeneralAgentChat() {
  const [state, setState] = useState<ChatState>({
    conversationId: null,
    messages: [],
    isLoading: false,
    isInitializing: true,
    error: null,
    messageCount: 0,
    isCompleting: false,
  })

  const [currentMessage, setCurrentMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Initialize conversation on component mount
  useEffect(() => {
    initializeConversation()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [state.messages])

  const initializeConversation = async () => {
    try {
      const result = await initializeGeneralAgentConversation()

      if (result.error) {
        setState((prev) => ({
          ...prev,
          error: result.error,
          isInitializing: false,
        }))
        return
      }

      if (result.conversationId) {
        setState((prev) => ({
          ...prev,
          conversationId: result.conversationId,
          isInitializing: false,
        }))

        // Load conversation history
        await loadConversationHistory(result.conversationId)
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to initialize conversation",
        isInitializing: false,
      }))
    }
  }

  const loadConversationHistory = async (conversationId: string) => {
    try {
      const result = await getConversationHistory(conversationId)

      if (result.success && result.messages) {
        setState((prev) => ({
          ...prev,
          messages: result.messages,
          messageCount: result.messages.filter((m) => m.role === "user").length,
        }))
      }
    } catch (error) {
      console.error("Error loading conversation history:", error)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || !state.conversationId || state.isLoading) return

    const userMessage = currentMessage.trim()
    setCurrentMessage("")

    // Add user message to UI immediately
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      messageCount: prev.messageCount + 1,
    }))

    try {
      const result = await sendMessageToGeneralAgent(state.conversationId, userMessage)

      if (result.error) {
        setState((prev) => ({
          ...prev,
          error: result.error,
          isLoading: false,
        }))
        return
      }

      if (result.response) {
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
        }

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMsg],
          isLoading: false,
          error: null,
        }))
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to send message",
        isLoading: false,
      }))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleCompleteOnboarding = async () => {
    setState((prev) => ({ ...prev, isCompleting: true }))

    try {
      const result = await completeOnboarding()

      if (result.error) {
        setState((prev) => ({
          ...prev,
          error: result.error,
          isCompleting: false,
        }))
        return
      }

      // Navigate to dashboard
      router.push("/dashboard")
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "Failed to complete onboarding",
        isCompleting: false,
      }))
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (state.isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Setting up your General Agent</h3>
            <p className="text-muted-foreground text-center">
              Please wait while we prepare your personalized AI assistant...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl">General Agent</CardTitle>
                <p className="text-sm text-muted-foreground">Your AI-powered productivity assistant</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Progress indicator */}
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Step 2 of 2</div>
                <Progress value={100} className="h-2 w-24" />
              </div>

              {/* Message counter */}
              <Badge variant="secondary" className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>{state.messageCount}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Error display */}
          {state.error && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Messages area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {state.messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    <div
                      className={`p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-gray-800 border shadow-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === "user" ? "text-blue-100" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {state.isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 border shadow-sm p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                disabled={state.isLoading || !state.conversationId}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || state.isLoading || !state.conversationId}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>AI will automatically create tasks based on our conversation</span>
              </div>

              {state.messageCount >= 2 && (
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={state.isCompleting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {state.isCompleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Setup
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
