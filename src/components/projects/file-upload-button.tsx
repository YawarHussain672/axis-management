"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2, CheckCircle, FileText, X } from "lucide-react"
import { toast } from "sonner"

interface FileUploadButtonProps {
  projectId: string
  fileType: "PO" | "CHALLAN" | "INVOICE"
  label: string
  existingFiles: { id: string; filename: string; url: string }[]
}

export function FileUploadButton({ projectId, fileType, label, existingFiles }: FileUploadButtonProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, images, and Excel files are allowed")
      return
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB")
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("projectId", projectId)
      formData.append("fileType", fileType)

      setProgress(40)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      setProgress(90)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }

      setProgress(100)
      toast.success(`${label} uploaded successfully!`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
      // Reset input so same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-200 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <p className="font-semibold text-sm text-slate-800">{label}</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003c71] hover:bg-[#002a52] text-white text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
          onChange={handleFileChange}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="mb-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{progress}% uploaded</p>
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 ? (
        <div className="space-y-1.5">
          {existingFiles.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors group"
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-700 font-medium truncate flex-1">{f.filename}</span>
              <span className="text-xs text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
            </a>
          ))}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
        >
          <Upload className="h-5 w-5 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">Click to upload or drag & drop</p>
          <p className="text-xs text-slate-300 mt-0.5">PDF, Image, Excel · Max 10MB</p>
        </div>
      )}
    </div>
  )
}
