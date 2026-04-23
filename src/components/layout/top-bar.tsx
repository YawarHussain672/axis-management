"use client"

import { Download, Plus, ChevronDown, Search, Loader2 } from "lucide-react"
import { openNewProjectModal } from "@/components/projects/new-project-modal"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDebouncedCallback } from "use-debounce"
import { NotificationBell } from "@/components/layout/notification-bell"

interface TopBarProps {
  user?: { role: string }
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter()
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; projectId: string; name: string; status: string; location: string }[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const isAdmin = user?.role === "ADMIN"

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const doSearch = useDebouncedCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setSearchOpen(false); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/projects?search=${encodeURIComponent(q)}&limit=6`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.projects || [])
        setSearchOpen(true)
      }
    } catch { /* silent */ } finally {
      setSearching(false)
    }
  }, 350)

  const statusColors: Record<string, string> = {
    REQUESTED: "bg-violet-100 text-violet-700",
    APPROVED: "bg-blue-100 text-blue-700",
    PRINTING: "bg-amber-100 text-amber-700",
    DISPATCHED: "bg-cyan-100 text-cyan-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  }

  const handleExport = async (type: "projects" | "dispatch") => {
    setExporting(type)
    setExportOpen(false)

    try {
      // Fetch data from API
      const res = await fetch(`/api/export?type=${type}`)
      if (!res.ok) throw new Error("Failed to fetch data")
      const { data } = await res.json()

      // Dynamically import jsPDF (client-side only)
      const { default: jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      const pageW = doc.internal.pageSize.getWidth()

      // ── Header bar ──
      doc.setFillColor(0, 60, 113)
      doc.rect(0, 0, pageW, 22, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("AXIS MAX LIFE", 14, 10)

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Print Project Management System", 14, 16)

      const title = type === "projects" ? "Projects Report" : "Dispatch & Tracking Report"
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(title, pageW / 2, 13, { align: "center" })

      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(`Generated: ${date}`, pageW - 14, 10, { align: "right" })
      doc.text(`Total Records: ${data.length}`, pageW - 14, 16, { align: "right" })

      // ── Table ──
      if (type === "projects") {
        const head = [["Project ID", "Name", "POC", "Location", "Status", "Delivery Date", "Cost (₹)", "Collaterals"]]
        const body = data.map((p: {
          projectId: string; name: string; poc?: { name: string }; location: string;
          status: string; deliveryDate: string; totalCost: number;
          collaterals: { itemName: string; quantity: number }[]
        }) => [
            p.projectId,
            p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name,
            p.poc?.name || "—",
            p.location,
            p.status,
            new Date(p.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
            `₹${Number(p.totalCost).toLocaleString("en-IN")}`,
            p.collaterals.map((c: { itemName: string; quantity: number }) => `${c.itemName}(${c.quantity})`).join(", "),
          ])

        const statusColors: Record<string, [number, number, number]> = {
          REQUESTED: [124, 58, 237],
          APPROVED: [37, 99, 235],
          PRINTING: [217, 119, 6],
          DISPATCHED: [8, 145, 178],
          DELIVERED: [5, 150, 105],
          CANCELLED: [220, 38, 38],
        }

        autoTable(doc, {
          head,
          body,
          startY: 28,
          styles: { fontSize: 8, cellPadding: 3, font: "helvetica", textColor: [30, 41, 59] },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 28, fontStyle: "bold", textColor: [0, 60, 113] },
            1: { cellWidth: 50 },
            2: { cellWidth: 28 },
            3: { cellWidth: 24 },
            4: { cellWidth: 24 },
            5: { cellWidth: 28 },
            6: { cellWidth: 26, halign: "right", fontStyle: "bold" },
            7: { cellWidth: 60 },
          },
          didParseCell: (hookData) => {
            if (hookData.column.index === 4 && hookData.section === "body") {
              const status = String(hookData.cell.raw)
              const color = statusColors[status]
              if (color) hookData.cell.styles.textColor = color
            }
          },
          margin: { left: 14, right: 14 },
        })
      } else {
        const head = [["Project ID", "Project Name", "Location", "Courier", "Tracking ID", "Dispatch Date", "Expected Delivery", "Status"]]
        const body = data.map((d: {
          project: { projectId: string; name: string; location: string; status: string };
          courier: string; trackingId: string; dispatchDate?: string;
          expectedDelivery?: string; status: string
        }) => [
            d.project.projectId,
            d.project.name.length > 30 ? d.project.name.slice(0, 30) + "…" : d.project.name,
            d.project.location,
            d.courier,
            d.trackingId,
            d.dispatchDate ? new Date(d.dispatchDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
            d.expectedDelivery ? new Date(d.expectedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
            d.project.status,
          ])

        autoTable(doc, {
          head,
          body,
          startY: 28,
          styles: { fontSize: 8, cellPadding: 3, font: "helvetica", textColor: [30, 41, 59] },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 30, fontStyle: "bold", textColor: [0, 60, 113] },
            1: { cellWidth: 55 },
            2: { cellWidth: 28 },
            3: { cellWidth: 28 },
            4: { cellWidth: 35, fontStyle: "bold", textColor: [8, 145, 178] },
            5: { cellWidth: 30 },
            6: { cellWidth: 30 },
            7: { cellWidth: 28 },
          },
          margin: { left: 14, right: 14 },
        })
      }

      // ── Footer on each page ──
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

      // ── Save ──
      const filename = `${type === "projects" ? "Projects" : "Dispatch"}_Report_${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(filename)
      toast.success(`${type === "projects" ? "Projects" : "Dispatch"} report downloaded!`)
    } catch (err) {
      console.error(err)
      toast.error("Export failed. Please try again.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-b border-slate-100">
      {/* Search */}
      <div className="hidden md:flex items-center max-w-md flex-1" ref={searchRef}>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); doSearch(e.target.value) }}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-slate-50 border-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {/* Dropdown results */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { router.push(`/projects/${p.id}`); setSearchOpen(false); setSearchQuery("") }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 border-b border-slate-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.projectId} · {p.location}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColors[p.status] || "bg-slate-100 text-slate-600"}`}>
                    {p.status}
                  </span>
                </button>
              ))}
              <button
                onClick={() => { router.push(`/projects?search=${encodeURIComponent(searchQuery)}`); setSearchOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-xs text-blue-600 hover:bg-blue-50 font-medium transition-colors"
              >
                See all results for &quot;{searchQuery}&quot; →
              </button>
            </div>
          )}
          {searchOpen && searchQuery && searchResults.length === 0 && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-slate-400">
              No projects found for &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Export PDF"}
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/60 z-20 overflow-hidden py-1.5">
                <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Download as PDF</p>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  onClick={() => handleExport("projects")}
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base shrink-0">📊</span>
                  <div>
                    <p className="font-medium">Projects Report</p>
                    <p className="text-xs text-slate-400">All projects with costs</p>
                  </div>
                </button>
                {isAdmin && (
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    onClick={() => handleExport("dispatch")}
                  >
                    <span className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-base shrink-0">🚚</span>
                    <div>
                      <p className="font-medium">Dispatch Report</p>
                      <p className="text-xs text-slate-400">Tracking & delivery info</p>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* New Project */}
        <button
          onClick={openNewProjectModal}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#003c71] hover:bg-[#002a52] active:bg-[#001f3d] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>
    </header>
  )
}
