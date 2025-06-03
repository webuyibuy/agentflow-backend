"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2 } from "lucide-react"

interface TestButtonProps {
  agentId: string
}

export function TestButton({ agentId }: TestButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleTest = async () => {
    setIsLoading(true)
    try {
      // Simulate test execution
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log(`Testing agent ${agentId}`)
    } catch (error) {
      console.error("Test failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleTest} disabled={isLoading} variant="outline">
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Testing...
        </>
      ) : (
        <>
          <Play className="h-4 w-4 mr-2" />
          Test Agent
        </>
      )}
    </Button>
  )
}
