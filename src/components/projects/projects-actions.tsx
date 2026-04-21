"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

// Global event for project deleted (syncs with projects-page-client)
const PROJECT_DELETED_EVENT = "project-deleted"

interface ProjectsActionsProps {
  projectId: string
}

export function ProjectsActions({ projectId }: ProjectsActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Project deleted")
        // Notify all components that a project was deleted
        window.dispatchEvent(new CustomEvent(PROJECT_DELETED_EVENT))
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete project")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <Link href={`/projects/${projectId}`}>
        <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Eye className="h-4 w-4" />
        </button>
      </Link>
      <Link href={`/projects/${projectId}/edit`}>
        <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Pencil className="h-4 w-4" />
        </button>
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  )
}
