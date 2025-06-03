"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useTransition } from "react"
import { useToast } from "@/hooks/use-toast"
import { exportAgentTasksToCsv } from "@/app/dashboard/agents/[id]/actions" // Adjust path if needed

interface TaskExportButtonProps {
  agentId: string
  agentName: string
}

export default function TaskExportButton({ agentId, agentName }: TaskExportButtonProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportAgentTasksToCsv(agentId)

      if (result.success && result.csvData) {
        if (result.csvData === "") {
          toast({
            title: "No Tasks to Export",
            description: "There are no tasks for this agent to export.",
            variant: "default",
          })
          return
        }
        const blob = new Blob([result.csvData], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `${agentName.toLowerCase().replace(/\s/g, "-")}-tasks.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast({
          title: "Tasks Exported",
          description: `Successfully exported tasks for ${agentName}.`,
          variant: "success",
        })
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "An unknown error occurred during export.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Button onClick={handleExport} disabled={isPending} variant="outline" size="sm">
      {isPending ? (
        "Exporting..."
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" /> Export Tasks
        </>
      )}
    </Button>
  )
}
