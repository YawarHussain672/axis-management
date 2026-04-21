"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { NewProjectForm } from "./new-project-form"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

// Global event name for triggering the modal
const OPEN_NEW_PROJECT_MODAL_EVENT = "open-new-project-modal"
const PROJECT_CREATED_EVENT = "project-created"

// Global function to open the modal from anywhere
export function openNewProjectModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_NEW_PROJECT_MODAL_EVENT))
  }
}

export function NewProjectModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleSuccess = () => {
    setIsOpen(false)
    // Notify all components that a project was created
    window.dispatchEvent(new CustomEvent(PROJECT_CREATED_EVENT))
    router.refresh()
  }

  useEffect(() => {
    window.addEventListener(OPEN_NEW_PROJECT_MODAL_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_NEW_PROJECT_MODAL_EVENT, handleOpen)
  }, [handleOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden p-0 gap-0 bg-white border-0 shadow-2xl shadow-slate-400/40 rounded-2xl">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">Create New Project</DialogTitle>
        {/* Clean Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Create New Project</h2>
              <p className="text-base text-slate-500 mt-1">Add multiple collaterals in a single project</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6 pb-10 overflow-y-auto max-h-[calc(90vh-80px)] bg-white animate-in fade-in zoom-in-95 duration-200">
          <NewProjectForm onSuccess={handleSuccess} onCancel={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
