"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Bell, X, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ApprovalActionsProps {
  approvalId: string
  reminderCount: number
  isAdmin: boolean
}

export function ApprovalActions({ approvalId, reminderCount, isAdmin }: ApprovalActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleAction = async (action: "approve" | "reject" | "reminder", notes?: string) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      })
      if (res.ok) {
        const messages = { approve: "Project approved!", reject: "Project rejected", reminder: "Reminder sent" }
        toast.success(messages[action])
        setRejectOpen(false)
        setRejectReason("")
        router.refresh()
      } else {
        toast.error("Action failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex lg:flex-col gap-2 shrink-0">
      {isAdmin && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-gray-600"
            onClick={() => handleAction("reminder")}
            disabled={loading !== null}
          >
            {loading === "reminder" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Reminder {reminderCount > 0 && `(${reminderCount})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
            onClick={() => setRejectOpen(true)}
            disabled={loading !== null}
          >
            {loading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Reject
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-[#003c71] hover:bg-[#002a52]"
            onClick={() => handleAction("approve")}
            disabled={loading !== null}
          >
            {loading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve
          </Button>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Project</DialogTitle>
                <DialogDescription>Add a clear reason so the POC can raise a revised request.</DialogDescription>
              </DialogHeader>
              <Textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Reason for rejection"
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading !== null}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      toast.error("Please add a rejection reason")
                      return
                    }
                    handleAction("reject", rejectReason.trim())
                  }}
                  disabled={loading !== null}
                >
                  {loading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
