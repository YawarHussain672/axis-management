"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Upload, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface PodUploadButtonProps {
  dispatchId: string
  podUrl: string | null
}

export function PodUploadButton({ dispatchId, podUrl }: PodUploadButtonProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/dispatch/${dispatchId}/pod`, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        toast.success("POD uploaded successfully!")
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  if (podUrl) {
    return (
      <a
        href={podUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-green-600 hover:text-green-700 font-semibold text-sm"
      >
        <FileText className="h-4 w-4" />
        View POD
        <ExternalLink className="h-3 w-3" />
      </a>
    )
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="h-7 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {uploading ? "Uploading..." : "Upload POD"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleUpload}
      />
    </>
  )
}
