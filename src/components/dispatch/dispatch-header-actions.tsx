"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function DispatchHeaderActions() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)

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
        if (data.errors && data.errors.length > 0) {
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
    <div style={{ display: 'flex', gap: '12px' }}>
      {/* Upload Excel */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="btn btn-secondary"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {uploading ? "Processing..." : "Upload Courier Excel"}
      </button>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />

      {/* Export PDF */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn btn-primary"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {exporting ? "Exporting..." : "Export Report"}
      </button>
    </div>
  )
}
