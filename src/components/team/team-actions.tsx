"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, UserX, UserCheck, Loader2, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Member { id: string; name: string; phone: string; role: string; active: boolean; location?: string; branch?: string }

interface TeamActionsProps {
  mode: "add" | "edit"
  member?: Member
}

export function TeamActions({ mode, member }: TeamActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: member?.name || "",
    email: "",
    phone: member?.phone || "",
    role: member?.role || "POC",
    password: "",
    location: member?.location || "",
    branch: member?.branch || "",
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const url = mode === "add" ? "/api/team" : `/api/team/${member!.id}`
      const method = mode === "add" ? "POST" : "PUT"
      const body = mode === "add" ? form : { name: form.name, phone: form.phone, role: form.role, location: form.location, branch: form.branch }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(mode === "add" ? "Team member added!" : "Member updated!")
        setOpen(false)
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!member) return
    setLoading(true)
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !member.active }),
      })
      if (res.ok) {
        toast.success(member.active ? "Member deactivated" : "Member activated")
        router.refresh()
      }
    } catch {
      toast.error("Failed")
    } finally {
      setLoading(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!member) return
    setLoading(true)
    try {
      const res = await fetch(`/api/team/${member.id}?permanent=true`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Member permanently deleted")
        setShowDeleteConfirm(false)
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (mode === "add") {
    return (
      <>
        <Button className="gap-2 bg-[#003c71] hover:bg-[#002a52]" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Member
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Full Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@axismaxlife.com" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POC">POC</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Mumbai, Delhi" className="h-9" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Branch</Label>
                <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g., Connaught Place Branch, Andheri Branch" className="h-9" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} size="sm">Cancel</Button>
              <Button className="bg-[#003c71] hover:bg-[#002a52]" onClick={handleSave} disabled={loading} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${member?.active ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}
        onClick={handleToggleActive}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : member?.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
      </Button>

      {/* Permanent delete button - only for inactive accounts */}
      {member && !member.active && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:bg-red-50"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POC">POC</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Mumbai, Delhi" className="h-9" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Branch</Label>
              <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g., Connaught Place Branch" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} size="sm">Cancel</Button>
            <Button className="bg-[#003c71] hover:bg-[#002a52]" onClick={handleSave} disabled={loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Account?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. {member?.name}&apos;s account will be permanently removed from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
