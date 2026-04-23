"use client"

import { useRef, useState } from "react"
import { Upload, Loader2, FileText, Eye, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface FileUploadButtonProps {
  projectId: string
  fileType: "PO" | "CHALLAN" | "INVOICE"
  label: string
  existingFiles: { id: string; filename: string; url: string; size?: number; uploadedAt?: string }[]
  isAdmin?: boolean
}

export function FileUploadButton({ projectId, fileType, label, existingFiles, isAdmin }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

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
      // Force page refresh to get updated file list from server
      window.location.reload()
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
        {isAdmin && (
          <>
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
          </>
        )}
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
      {existingFiles.length === 0 && <p className="text-xs text-gray-400 italic">No files uploaded</p>}


      {/* Existing files */}
      {existingFiles.length > 0 ? (
        <div className="space-y-2">
          {existingFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100"
            >
              <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-800 font-medium truncate flex-1">{f.filename}</span>
              <div className="flex items-center gap-1">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-emerald-200 transition-colors inline-flex"
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5 text-emerald-700" />
                </a>
                <a
                  href={`/api/files/${f.id}/download`}
                  download={f.filename}
                  className="p-1.5 rounded hover:bg-emerald-200 transition-colors inline-flex"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-700" />
                </a>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this file?")) return
                      setDeleting(f.id)
                      try {
                        const res = await fetch(`/api/files/${f.id}`, { method: "DELETE" })
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}))
                          throw new Error(data.error || "Delete failed")
                        }
                        toast.success("File deleted")
                        // Force page refresh to get updated file list from server
                        window.location.reload()
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to delete file")
                      } finally {
                        setDeleting(null)
                      }
                    }}
                    disabled={deleting === f.id}
                    className="p-1.5 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === f.id ? (
                      <Loader2 className="h-3.5 w-3.5 text-red-600 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : isAdmin ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
        >
          <Upload className="h-5 w-5 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">Click to upload or drag & drop</p>
          <p className="text-xs text-slate-300 mt-0.5">PDF, Image, Excel · Max 10MB</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Document not uploaded yet</p>
      )}
    </div>
  )
}
