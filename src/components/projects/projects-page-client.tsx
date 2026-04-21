"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/utils/formatters"
import Link from "next/link"
import { ProjectsFilters } from "@/components/projects/projects-filters"
import { ProjectsActions } from "@/components/projects/projects-actions"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { openNewProjectModal } from "@/components/projects/new-project-modal"
import { useRouter, useSearchParams } from "next/navigation"

const PAGE_SIZE = 20

const statusVariants: Record<string, string> = {
  REQUESTED: "requested", APPROVED: "approved", PRINTING: "printing",
  DISPATCHED: "dispatched", DELIVERED: "delivered", CANCELLED: "rejected",
}

interface POC {
  id: string
  name: string
}

interface Project {
  id: string
  projectId: string
  name: string
  status: string
  location: string
  deliveryDate: string
  totalCost: number
  poc?: { id: string; name: string }
  collaterals?: { itemName: string; quantity: number }[]
}

// Global event for project created
const PROJECT_CREATED_EVENT = "project-created"

// Global event for project deleted
const PROJECT_DELETED_EVENT = "project-deleted"

export function ProjectsPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [pocs, setPocs] = useState<POC[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const params = {
    status: searchParams.get("status") || undefined,
    poc: searchParams.get("poc") || undefined,
    location: searchParams.get("location") || undefined,
    search: searchParams.get("search") || undefined,
    page: searchParams.get("page") || "1",
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (params.status && params.status !== "all") queryParams.set("status", params.status)
      if (params.poc && params.poc !== "all") queryParams.set("poc", params.poc)
      if (params.location && params.location !== "all") queryParams.set("location", params.location)
      if (params.search) queryParams.set("search", params.search)
      queryParams.set("page", params.page || "1")

      const res = await fetch(`/api/projects?${queryParams}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects)
        setTotal(data.total)
        setPocs(data.pocs)
        setLocations(data.locations)
        setPage(data.page)
        setTotalPages(data.totalPages)
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [params.status, params.poc, params.location, params.search, params.page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const buildUrl = (newParams: Record<string, string>) => {
    const p = { ...params, ...newParams }
    const qs = new URLSearchParams()
    Object.entries(p).forEach(([k, v]) => {
      if (v && v !== "all") qs.set(k, v)
    })
    return `/projects?${qs.toString()}`
  }

  const handleProjectCreated = useCallback(() => {
    fetchData()
    router.refresh()
  }, [fetchData, router])

  const handleProjectDeleted = useCallback(() => {
    fetchData()
    router.refresh()
  }, [fetchData, router])

  useEffect(() => {
    window.addEventListener(PROJECT_CREATED_EVENT, handleProjectCreated)
    window.addEventListener(PROJECT_DELETED_EVENT, handleProjectDeleted)
    return () => {
      window.removeEventListener(PROJECT_CREATED_EVENT, handleProjectCreated)
      window.removeEventListener(PROJECT_DELETED_EVENT, handleProjectDeleted)
    }
  }, [handleProjectCreated, handleProjectDeleted])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Projects</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} project{total !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={openNewProjectModal}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#003c71] hover:bg-[#002a52] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      <ProjectsFilters pocs={pocs} locations={locations} currentParams={params} />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="animate-spin h-8 w-8 border-2 border-[#003c71] border-t-transparent rounded-full mx-auto" />
              <p className="mt-3 text-sm">Loading projects...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                    {["Project ID", "Name", "POC", "Location", "Materials", "Qty", "Status", "Delivery Date", "Total Cost", "Actions"].map((h) => (
                      <TableHead key={h} className="font-semibold text-slate-500 uppercase text-xs tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="font-mono font-bold text-[#003c71] hover:underline text-sm">
                          {project.projectId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="font-semibold text-slate-800 hover:text-[#003c71] hover:underline">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">{project.poc?.name || "—"}</TableCell>
                      <TableCell className="text-slate-600">{project.location}</TableCell>
                      <TableCell className="max-w-[140px] truncate text-slate-600 text-sm">
                        {project.collaterals?.map((c) => c.itemName).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-slate-700">
                        {project.collaterals?.reduce((s, c) => s + c.quantity, 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[project.status] as Parameters<typeof Badge>[0]["variant"]}>
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {project.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{formatDate(project.deliveryDate)}</TableCell>
                      <TableCell className="font-mono font-semibold text-slate-800">{formatCurrency(project.totalCost)}</TableCell>
                      <TableCell>
                        <ProjectsActions projectId={project.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16 text-slate-400">
                        <p className="font-medium text-base">No projects found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or create a new project</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    {page > 1 ? (
                      <Link href={buildUrl({ page: String(page - 1) })} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                      </Link>
                    ) : (
                      <span className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-100 opacity-40 cursor-not-allowed">
                        <ChevronLeft className="h-4 w-4 text-slate-400" />
                      </span>
                    )}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const p = i + 1
                      return (
                        <Link key={p} href={buildUrl({ page: String(p) })}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-[#003c71] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                          {p}
                        </Link>
                      )
                    })}
                    {page < totalPages ? (
                      <Link href={buildUrl({ page: String(page + 1) })} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </Link>
                    ) : (
                      <span className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-100 opacity-40 cursor-not-allowed">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
