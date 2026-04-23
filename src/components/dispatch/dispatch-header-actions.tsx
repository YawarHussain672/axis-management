"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Download, Loader2, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface UploadResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
  message: string
}

export function DispatchHeaderActions() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Only Excel (.xlsx, .xls) or CSV files are supported")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB")
      return
    }

    setUploading(true)
    setShowResult(false)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/dispatch/upload", { method: "POST", body: formData })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error("Dispatch upload server response:", text)
        toast.error(res.statusText || "Upload failed")
        return
      }

      if (res.ok) {
        setUploadResult(data)
        setShowResult(true)
        if (data.errors && data.errors.length > 0) {
          // Show warning if some rows had errors
          toast.warning(`${data.message} (with ${data.errors.length} error${data.errors.length > 1 ? 's' : ''})`)
        } else {
          toast.success(data.message)
        }
        router.refresh()
      } else {
        const errorMsg = data.details || data.error || "Upload failed"
        toast.error(errorMsg)
        console.error("Dispatch upload error:", data)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error. Please try again.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { default: jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      const res = await fetch("/api/export?type=dispatch")
      if (!res.ok) throw new Error("Failed to fetch data")
      const { data } = await res.json()

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pageW = doc.internal.pageSize.getWidth()
      const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

      // Header
      doc.setFillColor(0, 60, 113)
      doc.rect(0, 0, pageW, 22, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("AXIS MAX LIFE", 14, 10)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Print Project Management System", 14, 16)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Dispatch & Tracking Report", pageW / 2, 13, { align: "center" })
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(`Generated: ${date}`, pageW - 14, 10, { align: "right" })
      doc.text(`Total Records: ${data.length}`, pageW - 14, 16, { align: "right" })

      const head = [["Project ID", "Project Name", "Location", "Courier", "Tracking ID", "Dispatch Date", "Expected Delivery", "Actual Delivery", "Status", "Notes"]]
      const body = data.map((d: {
        project: { projectId: string; name: string; location: string; status: string }
        courier: string; trackingId: string; dispatchDate?: string
        expectedDelivery?: string; actualDelivery?: string; status: string; notes?: string
      }) => [
          d.project.projectId,
          d.project.name.length > 28 ? d.project.name.slice(0, 28) + "…" : d.project.name,
          d.project.location,
          d.courier,
          d.trackingId,
          d.dispatchDate ? new Date(d.dispatchDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
          d.expectedDelivery ? new Date(d.expectedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
          d.actualDelivery ? new Date(d.actualDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
          d.project.status,
          d.notes || "—",
        ])

      autoTable(doc, {
        head, body,
        startY: 28,
        styles: { fontSize: 7.5, cellPadding: 2.5, font: "helvetica", textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: "bold", textColor: [0, 60, 113] },
          1: { cellWidth: 48 },
          2: { cellWidth: 24 },
          3: { cellWidth: 24 },
          4: { cellWidth: 32, fontStyle: "bold", textColor: [8, 145, 178] },
          5: { cellWidth: 26 },
          6: { cellWidth: 26 },
          7: { cellWidth: 26 },
          8: { cellWidth: 24 },
          9: { cellWidth: 36 },
        },
        margin: { left: 14, right: 14 },
      })

      // Footer
      const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const pageH = doc.internal.pageSize.getHeight()
        doc.setFillColor(248, 250, 252)
        doc.rect(0, pageH - 10, pageW, 10, "F")
        doc.setFontSize(7)
        doc.setTextColor(148, 163, 184)
        doc.setFont("helvetica", "normal")
        doc.text("Axis Max Life Insurance — Confidential", 14, pageH - 4)
        doc.text(`Page ${i} of ${pageCount}`, pageW / 2, pageH - 4, { align: "center" })
        doc.text("axis-print-management.internal", pageW - 14, pageH - 4, { align: "right" })
      }

      doc.save(`Dispatch_Report_${new Date().toISOString().split("T")[0]}.pdf`)
      toast.success("Dispatch report downloaded!")
    } catch (err) {
      console.error(err)
      toast.error("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex gap-2">
        {/* Upload Excel */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#003c71] hover:bg-[#002a52] text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Processing..." : "Upload Courier Excel"}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />

        {/* Template download */}
        <a
          href="/dispatch-template.xlsx"
          download
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
          title="Download Excel template"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Template
        </a>

        {/* Export PDF */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Exporting..." : "Export Report"}
        </button>
      </div>

      {/* Upload result summary */}
      {showResult && uploadResult && (
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[#003c71]" />
              <p className="font-semibold text-sm text-slate-800">Upload Complete</p>
            </div>
            <button onClick={() => setShowResult(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-2 bg-emerald-50 rounded-lg">
              <p className="text-xl font-bold text-emerald-600">{uploadResult.created}</p>
              <p className="text-xs text-emerald-600 font-medium">Created</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{uploadResult.updated}</p>
              <p className="text-xs text-blue-600 font-medium">Updated</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <p className="text-xl font-bold text-amber-600">{uploadResult.skipped}</p>
              <p className="text-xs text-amber-600 font-medium">Skipped</p>
            </div>
          </div>
          {uploadResult.errors.length > 0 && (
            <div className="space-y-1">
              {uploadResult.errors.slice(0, 3).map((err, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
              {uploadResult.errors.length > 3 && (
                <p className="text-xs text-slate-400">+{uploadResult.errors.length - 3} more issues</p>
              )}
            </div>
          )}
          {uploadResult.errors.length === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>All rows processed successfully</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
