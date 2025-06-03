"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Paperclip, Send, Bot, User, Upload, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  attachments?: File[]
}

interface AIStrategyConsultantChatProps {
  onComplete?: (analysis: any) => void
}

const INITIAL_QUESTIONS = [
  "What specific business challenge are you trying to solve?",
  "What industry are you in, and what's your company size?",
  "What's your current biggest operational bottleneck?",
  "What business outcomes are you hoping to achieve?",
  "What's your timeline for seeing results?",
]

export function AIStrategyConsultantChat({ onComplete }: AIStrategyConsultantChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your AI Strategy Consultant. I'll help you identify the best AI solutions for your business. Let's start with understanding your specific needs. What specific business challenge are you trying to solve?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter((file) => file.size <= 1024 * 1024) // 1MB limit

    if (validFiles.length !== files.length) {
      // Show error for files over 1MB
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Some files were too large. Please upload files under 1MB.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    setUploadedFiles((prev) => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI thinking time
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

    const responses = [
      "That's a great insight. Can you tell me more about your current process and where you see the biggest inefficiencies?",
      "I understand. What tools or systems are you currently using to address this challenge?",
      "Interesting. What would success look like for you in 6 months? What specific metrics would you want to improve?",
      "Based on what you've shared, I'm seeing some opportunities. What's your budget range for implementing new solutions?",
      "Perfect. Let me analyze your needs and recommend the best AI agent approach for your situation.",
    ]

    if (currentQuestionIndex < responses.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      return responses[currentQuestionIndex]
    } else {
      // Final analysis
      setTimeout(() => {
        onComplete?.({
          businessChallenge: "Operational efficiency",
          industry: "Technology",
          timeline: "6 months",
          budget: "Medium",
          recommendedAgent: "Business Process Optimizer",
        })
      }, 2000)

      return "Thank you for sharing those details! I'm analyzing your requirements and will recommend the perfect AI agent configuration for your business needs. This will help you achieve measurable results quickly."
    }
  }

  const handleSend = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      attachments: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setUploadedFiles([])
    setIsLoading(true)

    try {
      const aiResponse = await generateAIResponse(input)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error generating AI response:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          AI Strategy Consultant
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Question {Math.min(currentQuestionIndex + 1, INITIAL_QUESTIONS.length)} of {INITIAL_QUESTIONS.length}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Business Analysis
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs opacity-80">
                              <FileText className="h-3 w-3" />
                              {file.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xs opacity-60 mt-1">{message.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">Analyzing your response...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* File Upload Area */}
        {uploadedFiles.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-white rounded px-2 py-1 text-xs border">
                  <FileText className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your business challenge..."
                disabled={isLoading}
                className="pr-10"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Upload supporting materials (max 1MB)"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <Button onClick={handleSend} disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <Upload className="h-3 w-3" />
            <span>Upload business documents, reports, or data (max 1MB per file)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
