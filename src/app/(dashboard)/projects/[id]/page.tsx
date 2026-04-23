"use client"

import { use, useEffect, useState } from "react"
import { redirect, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency, getGSTAmount } from "@/utils/formatters"
import { ProjectStatus, FileType } from "@prisma/client"
import { UpdateStatusButton } from "@/components/projects/update-status-button"
import { FileUploadButton } from "@/components/projects/file-upload-button"
import { DeleteProjectButton } from "@/components/projects/delete-project-button"
import { LeadTrackingForm } from "@/components/projects/lead-tracking-form"
import { TrackButton } from "@/components/dispatch/track-button"
import { EditDispatchDialog } from "@/components/dispatch/edit-dispatch-dialog"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"
import {
  ArrowLeft, Edit, MapPin, Calendar, User, FileText,
  Truck, Package, CheckCircle, Clock, XCircle, Building2,
} from "lucide-react"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

interface ProjectFile {
  id: string
  type: "PO" | "CHALLAN" | "INVOICE"
  url: string
  filename: string
  size: number | null
  uploadedAt: string
}

interface Project {
  id: string
  projectId: string
  name: string
  status: ProjectStatus
  piNumber: string | null
  createdAt: string
  pocId: string
  location: string
  state: string
  branch: string
  totalCost: number
  deliveryDate: string | null
  instructions: string | null
  poc: { id: string; name: string; email: string; phone: string }
  collaterals: { id: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }[]
  statusHistory: { id: string; status: ProjectStatus; note: string | null; timestamp: string }[]
  files: ProjectFile[]
  dispatch: {
    dispatchDate: string | null
    courier: string
    trackingId: string
    expectedDelivery: string | null
    actualDelivery: string | null
  } | null
  approval: {
    status: string
    requestedById: string
    approvedById: string | null
    approvedAt: string | null
  } | null
  leadsGenerated: number | null
  leadsConverted: number | null
}

const statusIcons: Record<ProjectStatus, React.ReactNode> = {
  REQUESTED: <Clock className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4" />,
  PRINTING: <FileText className="h-4 w-4" />,
  DISPATCHED: <Truck className="h-4 w-4" />,
  DELIVERED: <Package className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login")
    }
    if (status === "authenticated" && id) {
      setLoading(true)
      fetch(`/api/projects/${id}`)
        .then((res) => {
          if (!res.ok) {
            router.replace("/projects")
            return null
          }
          return res.json()
        })
        .then((data) => {
          if (data) setProject(data)
        })
        .catch(() => setProject(null))
        .finally(() => setLoading(false))
    }
  }, [id, router, status])

  // Guard calculations until project is loaded
  const getStatusHistory = (status: ProjectStatus) =>
    project?.statusHistory.find((h) => h.status === status)

  const subtotal = project?.collaterals.reduce((s, c) => s + c.totalPrice, 0) ?? 0
  const gst = getGSTAmount(subtotal)

  const isAdmin = session?.user?.role === "ADMIN"
  const isOwner = project?.pocId === session?.user?.id

  // Timeline steps with real data
  const timelineSteps = project ? [
    {
      title: "Order Received",
      date: project.createdAt,
      note: `Project created by ${project.poc?.name}${project.branch ? ` • ${project.branch}` : ""}`,
      done: true,
    },
    {
      title: "PI Created",
      date: project.createdAt,
      note: `Proforma Invoice #${project.piNumber || project.projectId} generated • ${project.poc?.name}`,
      done: true,
    },
    {
      title: "PI Approved",
      date: getStatusHistory(ProjectStatus.APPROVED)?.timestamp ?? null,
      note: (() => {
        const approval = getStatusHistory(ProjectStatus.APPROVED)
        if (approval?.note) {
          return `Approved • ${approval.note}`
        }
        return project.approval?.status === "APPROVED" ? "Approved by Admin" : "Pending approval"
      })(),
      done: !!getStatusHistory(ProjectStatus.APPROVED) || project.approval?.status === "APPROVED",
      active: project.status === ProjectStatus.REQUESTED,
    },
    {
      title: "PO Generated",
      date: project.files.find((f) => f.type === FileType.PO)?.uploadedAt ?? null,
      note: project.files.some((f) => f.type === FileType.PO) ? "Purchase Order received from client" : "Pending PO",
      done: project.files.some((f) => f.type === FileType.PO),
      active: project.status === ProjectStatus.APPROVED,
    },
    {
      title: "Material Under Production",
      date: getStatusHistory(ProjectStatus.PRINTING)?.timestamp ?? null,
      note: getStatusHistory(ProjectStatus.PRINTING)?.note || "Production in progress",
      done: !!getStatusHistory(ProjectStatus.PRINTING),
      active: project.status === ProjectStatus.APPROVED && project.files.some((f) => f.type === FileType.PO),
    },
    {
      title: "Material Dispatched",
      date: project.dispatch?.dispatchDate ?? null,
      note: (() => {
        if (!project.dispatch) return "Pending dispatch"
        const dispatchInfo = `Shipped via ${project.dispatch.courier}`
        const tracking = project.dispatch.trackingId ? ` • Tracking: ${project.dispatch.trackingId}` : ""
        return dispatchInfo + tracking
      })(),
      done: !!project.dispatch?.dispatchDate,
      active: project.status === ProjectStatus.PRINTING,
    },
    {
      title: "Challan Uploaded",
      date: project.files.find((f) => f.type === FileType.CHALLAN)?.uploadedAt ?? null,
      note: project.files.some((f) => f.type === FileType.CHALLAN) ? "Delivery challan uploaded" : "Pending challan",
      done: project.files.some((f) => f.type === FileType.CHALLAN),
      active: project.status === ProjectStatus.DISPATCHED,
    },
    {
      title: "Tax Invoice Generated",
      date: project.files.find((f) => f.type === FileType.INVOICE)?.uploadedAt ?? null,
      note: project.files.some((f) => f.type === FileType.INVOICE) ? "Tax invoice generated" : "Pending invoice",
      done: project.files.some((f) => f.type === FileType.INVOICE),
      active: project.status === ProjectStatus.DISPATCHED,
    },
  ] : []

  if (!project) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center text-[#00a8cc] hover:underline font-medium text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to All Projects
      </Link>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge
                  className={
                    project.status === "DELIVERED"
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : project.status === "DISPATCHED"
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        : project.status === "PRINTING"
                          ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                          : project.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                            : project.status === "CANCELLED"
                              ? "bg-red-100 text-red-800 hover:bg-red-100"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                  }
                >
                  {statusIcons[project.status]}{project.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Project ID: <span className="font-mono text-sm">{project.projectId || project.id}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(isAdmin || (isOwner && project.status === "REQUESTED")) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {isAdmin && <UpdateStatusButton projectId={project.id} currentStatus={project.status} />}
                  <DeleteProjectButton projectId={project.id} />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Order Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {formatDate(project.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">POC Name</p>
              <p className="font-medium flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-gray-400" />
                {project.poc.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Company</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                Axis Max Life Insurance
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {project.location}, {project.state}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Branch</p>
              <p className="font-medium">{project.branch || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">PI Number</p>
              <p className="font-medium">{project.piNumber || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Items & Collaterals */}
          <Card>
            <CardHeader><CardTitle>Items & Collaterals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {project.collaterals.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{c.itemName}</p>
                    <p className="text-sm text-gray-500">Quantity: {c.quantity.toLocaleString("en-IN")} × {formatCurrency(c.unitPrice)}</p>
                  </div>
                  <p className="font-bold font-mono text-[#003c71]">{formatCurrency(c.totalPrice)}</p>
                </div>
              ))}

              {/* Cost Breakdown */}
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 flex justify-between">
                  <span className="text-sm text-slate-500">Base Cost</span>
                  <span className="font-mono font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
                </div>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-between">
                  <span className="text-sm text-slate-500">GST @ 18%</span>
                  <span className="font-mono font-semibold text-amber-600">+ {formatCurrency(gst)}</span>
                </div>
                <div className="px-4 py-3 bg-[#003c71] text-white flex justify-between items-center">
                  <span className="font-bold">Total Amount</span>
                  <span className="text-xl font-extrabold font-mono">{formatCurrency(project.totalCost)}</span>
                </div>
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                  <p className="text-xs text-amber-700">💡 All project costs are calculated with 18% GST included in final billing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Tracking */}
          {(project.status === ProjectStatus.DELIVERED || project.leadsGenerated || project.leadsConverted) && (
            <LeadTrackingForm
              projectId={project.id}
              totalCost={project.totalCost}
              leadsGenerated={project.leadsGenerated}
              leadsConverted={project.leadsConverted}
              canEdit={isAdmin || isOwner}
              onSuccess={() => {
                fetch(`/api/projects/${id}`)
                  .then((res) => res.json())
                  .then((data) => setProject(data))
              }}
            />
          )}

          {/* Dispatch */}
          {project.dispatch && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Dispatch & Delivery Information</CardTitle>
                {isAdmin && (
                  <EditDispatchDialog
                    projectId={project.id}
                    dispatch={project.dispatch}
                  />
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Dispatch Date</p>
                    <p className="font-semibold text-sm">{project.dispatch.dispatchDate ? formatDate(project.dispatch.dispatchDate) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Expected Delivery</p>
                    <p className="font-semibold text-sm">{project.dispatch.expectedDelivery ? formatDate(project.dispatch.expectedDelivery) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Courier Partner</p>
                    <p className="font-semibold text-sm">{project.dispatch.courier}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tracking Number</p>
                    <p className="font-mono font-semibold text-[#00a8cc] text-sm">{project.dispatch.trackingId}</p>
                  </div>
                </div>
                <TrackButton
                  courier={project.dispatch.courier}
                  trackingId={project.dispatch.trackingId}
                  dispatchDate={project.dispatch.dispatchDate}
                  expectedDelivery={project.dispatch.expectedDelivery}
                  actualDelivery={project.dispatch.actualDelivery}
                />
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader><CardTitle>Documents & Files</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["PO", "CHALLAN", "INVOICE"] as const).map((type) => {
                  const typeFiles = project.files
                    .filter((f) => f.type === type)
                    .map((f) => ({
                      id: f.id,
                      filename: f.filename,
                      url: f.url,
                      uploadedAt: f.uploadedAt,
                      size: f.size ?? undefined,
                    }))
                  const labels: Record<string, string> = {
                    PO: "Purchase Order (PO)",
                    CHALLAN: "Delivery Challan",
                    INVOICE: "Tax Invoice",
                  }
                  const uploadLabels: Record<string, string> = {
                    PO: "Upload PO",
                    CHALLAN: "Upload Challan",
                    INVOICE: "Upload Invoice",
                  }
                  return (
                    <div key={type} className="border border-slate-200 rounded-xl p-4 bg-white">
                      <p className="font-semibold text-sm text-slate-800 mb-3">{labels[type]}</p>
                      <FileUploadButton
                        projectId={project.id}
                        fileType={type}
                        label={uploadLabels[type]}
                        existingFiles={typeFiles}
                        isAdmin={isAdmin}
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div>
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Project Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  {timelineSteps.map((step, i) => (
                    <div key={i} className="relative pl-7">
                      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 shadow-sm ${step.done
                        ? "bg-green-500 border-green-500"
                        : step.active
                          ? "bg-[#00a8cc] border-[#00a8cc] animate-pulse"
                          : "bg-white border-gray-300"
                        }`} />
                      <div className={`rounded-lg p-3 ${step.done ? "bg-green-50" : step.active ? "bg-blue-50" : "bg-gray-50"}`}>
                        <p className={`font-bold text-sm ${step.done ? "text-green-900" : step.active ? "text-blue-900" : "text-gray-500"}`}>
                          {step.title}
                        </p>
                        {step.date && (
                          <p className={`text-xs mt-0.5 ${step.done ? "text-green-700" : "text-blue-600"}`}>
                            Date: {formatDate(step.date)}
                          </p>
                        )}
                        <p className={`text-xs mt-0.5 ${step.done ? "text-green-600" : step.active ? "text-blue-500" : "text-gray-400"}`}>
                          {step.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Project Dialog */}
      {project && (
        <EditProjectDialog
          project={project}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            fetch(`/api/projects/${id}`)
              .then((res) => res.json())
              .then((data) => setProject(data))
          }}
        />
      )}
    </div>
  )
}
