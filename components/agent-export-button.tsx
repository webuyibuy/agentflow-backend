"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportAgentsToCsv } from "@/app/dashboard/actions" // Adjust path if needed
import { toast } from "@/hooks/use-toast"

export default function AgentExportButton() {
  const [isPending, startTransition] = useTransition()

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportAgentsToCsv()
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        if (link.download !== undefined) {
          // Feature detection for download attribute
          const url = URL.createObjectURL(blob)
          link.setAttribute("href", url)
          link.setAttribute("download", "agents.csv")
          link.style.visibility = "hidden"
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          toast({
            title: "Export Successful",
            description: "Your agents have been exported to agents.csv.",
          })
        } else {
          // Fallback for browsers that don't support download attribute
          window.open("data:text/csv;charset=utf-8," + encodeURIComponent(result.data))
          toast({
            title: "Export Successful",
            description: "Your agents have been exported. Check your downloads.",
          })
        }
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Could not export agents. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Button onClick={handleExport} disabled={isPending} variant="outline" className="flex items-center gap-2">
      {isPending ? "Exporting..." : "Export Agents"}
      <Download className="h-4 w-4" />
    </Button>
  )
}
