"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ProjectStatus } from "@prisma/client"

interface UpdateStatusButtonProps {
  projectId: string
  currentStatus: ProjectStatus
}

const statusFlow: Record<ProjectStatus, ProjectStatus[]> = {
  REQUESTED: ["CANCELLED"],           // Only admin can approve via Approvals page
  APPROVED: ["PRINTING", "CANCELLED"],
  PRINTING: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

const statusLabels: Record<ProjectStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  PRINTING: "Printing",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

export function UpdateStatusButton({ projectId, currentStatus }: UpdateStatusButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | "">("")
  const [note, setNote] = useState("")

  const availableStatuses = statusFlow[currentStatus] || []

  const handleUpdate = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          note: note || `Status updated to ${statusLabels[selectedStatus]}`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      toast.success(`Status updated to ${statusLabels[selectedStatus]}`)
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error("Failed to update status")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show button if no valid transitions
  if (availableStatuses.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#003c71] hover:bg-[#002a52]">
          <RefreshCw className="h-4 w-4" />
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Project Status</DialogTitle>
          <DialogDescription>
            Current status: <strong>{statusLabels[currentStatus]}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">New Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as ProjectStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Input
              id="note"
              placeholder="Add a note about this status change..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading || !selectedStatus}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
