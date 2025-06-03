"use client"

import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { deleteAgent } from "@/app/dashboard/agents/[id]/edit-actions"
import { Trash2, MoreVertical, AlertTriangle, Loader2, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface AgentDeleteDialogProps {
  agentId: string
  agentName: string
  agentStatus?: string
  taskCount?: number
  dependencyCount?: number
  variant?: "button" | "dropdown" | "icon"
  className?: string
}

export default function AgentDeleteDialog({
  agentId,
  agentName,
  agentStatus = "idle",
  taskCount = 0,
  dependencyCount = 0,
  variant = "button",
  className = "",
}: AgentDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const [deleteState, deleteAction, isPending] = useActionState(deleteAgent, undefined)
  const router = useRouter()

  const isConfirmationValid = confirmationText === agentName
  const hasActiveDependencies = dependencyCount > 0
  const isActiveAgent = agentStatus === "running" || agentStatus === "working"

  const getAlertType = () => {
    if (hasActiveDependencies) return "danger"
    if (isActiveAgent) return "warning"
    if (taskCount > 0) return "info"
    return "normal"
  }

  const getAlertContent = () => {
    const alertType = getAlertType()

    switch (alertType) {
      case "danger":
        return {
          title: "Cannot Delete Agent",
          description: `This agent has ${dependencyCount} active dependencies that other agents are waiting for. Complete or reassign these dependencies before deleting.`,
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          canDelete: false,
        }
      case "warning":
        return {
          title: "Delete Active Agent?",
          description: `This agent is currently ${agentStatus}. Deleting it will stop all ongoing work and may affect dependent processes.`,
          icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
          canDelete: true,
        }
      case "info":
        return {
          title: "Delete Agent with Tasks?",
          description: `This agent has ${taskCount} associated tasks. Completed tasks will be preserved in history, but pending tasks will be removed.`,
          icon: <AlertTriangle className="h-5 w-5 text-blue-500" />,
          canDelete: true,
        }
      default:
        return {
          title: "Delete Agent",
          description: "This action cannot be undone. The agent and all its data will be permanently removed.",
          icon: <Trash2 className="h-5 w-5 text-gray-500" />,
          canDelete: true,
        }
    }
  }

  const handleDelete = async () => {
    if (!isConfirmationValid) return

    const formData = new FormData()
    formData.append("agentId", agentId)

    try {
      await deleteAction(formData)

      // Check if deletion was successful
      if (deleteState?.success) {
        setOpen(false)
        // Navigate to agents list after successful deletion
        router.push("/dashboard/agents/manage")
        router.refresh()
      }
    } catch (error) {
      console.error("Delete action failed:", error)
    }
  }

  const alertContent = getAlertContent()

  const TriggerComponent = () => {
    switch (variant) {
      case "dropdown":
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={className}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      case "icon":
        return (
          <Button
            variant="ghost"
            size="sm"
            className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${className}`}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )
      default:
        return (
          <Button variant="destructive" size="sm" className={className} onClick={() => setOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Agent
          </Button>
        )
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <TriggerComponent />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {alertContent.icon}
            {alertContent.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">{alertContent.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Agent Info */}
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{agentName}</span>
            <Badge variant={agentStatus === "running" ? "default" : "secondary"}>{agentStatus}</Badge>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Tasks: {taskCount}</div>
            <div>Active Dependencies: {dependencyCount}</div>
          </div>
        </div>

        {/* Confirmation Input */}
        {alertContent.canDelete && (
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-bold">{agentName}</span> to confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={agentName}
              disabled={isPending}
            />
          </div>
        )}

        {/* Error/Success Messages */}
        {deleteState?.message && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 ${
              deleteState.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {deleteState.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span className="text-sm">{deleteState.message}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          {alertContent.canDelete && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!isConfirmationValid || isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Agent
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
