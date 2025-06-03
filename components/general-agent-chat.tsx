"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Bot, User, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react"
import { sendMessageToGeneralAgent, completeGeneralAgentOnboarding } from "@/app/onboarding/general-agent/actions"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

interface GeneralAgentChatProps {
  userName: string
  initialMessages: any[]
  conversationId: string | null
}

export default function GeneralAgentChat({
  userName,
  initialMessages = [],
  conversationId: initialConversationId,
}: GeneralAgentChatProps) {
  const [state, action, isPending] = useActionState(sendMessageToGeneralAgent, undefined)
  const [messages, setMessages] = useState<Message[]>(() => {
    // Convert initial messages from database format
    if (initialMessages && initialMessages.length > 0) {
      return initialMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }))
    }

    // Default welcome message if no history
    return [
      {
        id: "welcome",
        role: "assistant",
        content: `Hi ${userName}! 👋 I'm your General Agent, and I'm here to help you achieve your goals by breaking them down into actionable tasks. 

What would you like to accomplish? Whether it's growing your business, improving a process, or tackling a specific project - just tell me about it and I'll help create a plan!`,
        timestamp: new Date(),
      },
    ]
  })

  const [currentMessage, setCurrentMessage] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [isNavigatingToDashboard, setIsNavigatingToDashboard] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (state?.response) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: state.response!,
          timestamp: new Date(),
        },
      ])
    }

    if (state?.conversationId && !conversationId) {
      setConversationId(state.conversationId)
    }
  }, [state?.response, state?.conversationId])

  const handleSubmit = (formData: FormData) => {
    const message = formData.get("message") as string
    if (message?.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: `user_${Date.now()}`,
          role: "user",
          content: message.trim(),
          timestamp: new Date(),
        },
      ])
      setCurrentMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (currentMessage.trim() && !isPending) {
        formRef.current?.requestSubmit()
      }
    }
  }

  const handleContinueToDashboard = async () => {
    setIsNavigatingToDashboard(true)
    await completeGeneralAgentOnboarding()
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src="/images/general-agent-avatar.png" alt="General Agent" />
              <AvatarFallback>
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">General Agent</CardTitle>
              <p className="text-sm text-muted-foreground">Your intelligent task planning assistant</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user" ? "bg-[#007AFF] text-white" : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isPending && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#007AFF]"></div>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <form
              ref={formRef}
              action={action}
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleSubmit(formData)
                action(formData)
              }}
            >
              <input type="hidden" name="userName" value={userName} />
              <input type="hidden" name="conversationId" value={conversationId || ""} />
              <div className="flex gap-2">
                <Input
                  name="message"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tell me about your goals or what you'd like to accomplish..."
                  disabled={isPending}
                  className="flex-1"
                />
                <Button type="submit" disabled={!currentMessage.trim() || isPending} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Task Suggestions */}
      {state?.taskSuggestions && state.taskSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Tasks Created
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              I've automatically created these tasks based on our conversation:
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {state.taskSuggestions.map((task, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {task.isDependency ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={
                          task.priority === "high"
                            ? "destructive"
                            : task.priority === "medium"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {task.priority} priority
                      </Badge>
                      {task.isDependency && (
                        <Badge variant="outline" className="text-amber-600">
                          Needs Approval
                        </Badge>
                      )}
                      <Badge variant="outline">{task.category}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Summary */}
      {state?.goals && state.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Identified Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {state.goals.map((goal, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {goal}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue to Dashboard */}
      <div className="text-center">
        <Button
          onClick={handleContinueToDashboard}
          size="lg"
          className="bg-[#007AFF] hover:bg-[#0056b3]"
          disabled={isNavigatingToDashboard}
        >
          {isNavigatingToDashboard ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Going to Dashboard...
            </>
          ) : (
            "Continue to Dashboard"
          )}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          You can always come back to chat with your General Agent from the dashboard
        </p>
      </div>

      {state?.error && <div className="text-center text-red-600 text-sm">{state.error}</div>}
    </div>
  )
}
