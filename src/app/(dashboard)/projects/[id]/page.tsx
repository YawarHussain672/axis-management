import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency, getGSTAmount } from "@/utils/formatters"
import { ProjectStatus, Prisma } from "@prisma/client"
import { UpdateStatusButton } from "@/components/projects/update-status-button"
import { FileUploadButton } from "@/components/projects/file-upload-button"
import { DeleteProjectButton } from "@/components/projects/delete-project-button"
import { LeadTrackingForm } from "@/components/projects/lead-tracking-form"
import { TrackButton } from "@/components/dispatch/track-button"
import {
  ArrowLeft, Edit, MapPin, Calendar, User, FileText,
  Truck, Package, CheckCircle, Clock, XCircle, Building2,
} from "lucide-react"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      poc: { select: { id: true, name: true, email: true, phone: true } },
      collaterals: true,
      statusHistory: { orderBy: { timestamp: "asc" } },
      files: { orderBy: { uploadedAt: "asc" } },
      dispatch: true,
    },
  })
}

const statusIcons: Record<ProjectStatus, React.ReactNode> = {
  REQUESTED: <Clock className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4" />,
  PRINTING: <FileText className="h-4 w-4" />,
  DISPATCHED: <Truck className="h-4 w-4" />,
  DELIVERED: <Package className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const project = await getProject(id)
  if (!project) notFound()

  const isAdmin = session.user.role === "ADMIN"
  const isOwner = project.pocId === session.user.id
  if (!isAdmin && !isOwner) redirect("/projects")

  const getStatusHistory = (status: ProjectStatus) =>
    project.statusHistory.find((h) => h.status === status)

  const subtotal = project.collaterals.reduce((s, c) => s + c.totalPrice, 0)
  const gst = getGSTAmount(subtotal)

  const canEdit = isAdmin || (isOwner && project.status === ProjectStatus.REQUESTED)
  const canDelete = isAdmin || (isOwner && project.status === ProjectStatus.REQUESTED)

  // Delivery address
  const deliveryAddress = [
    "Axis Max Life Insurance",
    project.branch,
    project.location,
    project.state,
    "India",
  ].filter(Boolean).join(", ")

  // Timeline steps with real notes
  const timelineSteps = [
    {
      title: "Order Received",
      date: project.createdAt,
      note: `Project created by ${project.poc?.name}`,
      done: true,
    },
    {
      title: "PI Created",
      date: project.createdAt,
      note: `Proforma Invoice #${project.piNumber || project.projectId} generated`,
      done: true,
    },
    {
      title: "PI Approved",
      date: getStatusHistory(ProjectStatus.APPROVED)?.timestamp ?? null,
      note: getStatusHistory(ProjectStatus.APPROVED)?.note || "Proforma Invoice approved by management",
      done: !!getStatusHistory(ProjectStatus.APPROVED),
      active: project.status === ProjectStatus.REQUESTED,
    },
    {
      title: "Material Under Production",
      date: getStatusHistory(ProjectStatus.PRINTING)?.timestamp ?? null,
      note: getStatusHistory(ProjectStatus.PRINTING)?.note || "Production in progress",
      done: !!getStatusHistory(ProjectStatus.PRINTING),
      active: project.status === ProjectStatus.APPROVED,
    },
    {
      title: "Material Dispatched",
      date: getStatusHistory(ProjectStatus.DISPATCHED)?.timestamp ?? project.dispatch?.dispatchDate ?? null,
      note: project.dispatch
        ? `Shipped via ${project.dispatch.courier} - Tracking: ${project.dispatch.trackingId}`
        : getStatusHistory(ProjectStatus.DISPATCHED)?.note || "Awaiting dispatch",
      done: !!getStatusHistory(ProjectStatus.DISPATCHED),
      active: project.status === ProjectStatus.PRINTING,
    },
    {
      title: "PO Generated",
      date: project.files.find((f) => f.type === "PO")?.uploadedAt ?? null,
      note: "Purchase Order received from client",
      done: project.files.some((f) => f.type === "PO"),
      active: project.status === ProjectStatus.APPROVED,
    },
    {
      title: "Challan Uploaded",
      date: project.files.find((f) => f.type === "CHALLAN")?.uploadedAt ?? null,
      note: "Delivery challan uploaded",
      done: project.files.some((f) => f.type === "CHALLAN"),
      active: project.status === ProjectStatus.DISPATCHED,
    },
    {
      title: "Tax Invoice Generated",
      date: project.files.find((f) => f.type === "INVOICE")?.uploadedAt ?? null,
      note: "Final tax invoice generated by finance team",
      done: project.files.some((f) => f.type === "INVOICE"),
      active: project.status === ProjectStatus.DISPATCHED,
    },
  ]

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center text-[#00a8cc] hover:underline font-medium text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to All Projects
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-extrabold text-gray-900">{project.name}</h1>
                <Badge variant={project.status.toLowerCase() as Parameters<typeof Badge>[0]["variant"]}>
                  <span className="flex items-center gap-1.5">{statusIcons[project.status]}{project.status}</span>
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>Project ID: <span className="font-mono font-bold text-[#003c71]">{project.projectId}</span></span>
                {project.piNumber && <span>PI Number: <span className="font-mono font-semibold">{project.piNumber}</span></span>}
                <span>Created: {formatDate(project.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <Link href={`/projects/${project.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-2"><Edit className="h-4 w-4" />Edit Project</Button>
                </Link>
              )}
              {isAdmin && <UpdateStatusButton projectId={project.id} currentStatus={project.status} />}
              {canDelete && <DeleteProjectButton projectId={project.id} />}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Order Date</p>
              <p className="font-semibold text-sm">{formatDate(project.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">POC Name</p>
              <p className="font-semibold text-sm flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-gray-400" />{project.poc?.name}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company</p>
              <p className="font-semibold text-sm flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />Axis Max Life Insurance
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
              <p className="font-semibold text-sm flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />{project.location}{project.state && `, ${project.state}`}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Branch</p>
              <p className="font-semibold text-sm">{project.branch || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Date</p>
              <p className="font-semibold text-sm flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />{formatDate(project.deliveryDate)}
              </p>
            </div>
          </div>

          {/* Delivery Address */}
          {project.branch && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Address</p>
              <p className="text-sm text-gray-700 font-medium">{deliveryAddress}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Items & Collaterals */}
          <Card>
            <CardHeader><CardTitle>Items & Collaterals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {project.collaterals.map((c: Prisma.CollateralGetPayload<Record<string, never>>) => (
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
            />
          )}

          {/* Dispatch */}
          {project.dispatch && (
            <Card>
              <CardHeader><CardTitle>Dispatch & Delivery Information</CardTitle></CardHeader>
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
                    .filter((f: Prisma.FileUploadGetPayload<Record<string, never>>) => f.type === type)
                    .map((f: Prisma.FileUploadGetPayload<Record<string, never>>) => ({
                      id: f.id,
                      filename: f.filename,
                      url: f.url,
                      uploadedAt: f.uploadedAt,
                      size: f.size,
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
                      {typeFiles.length > 0 ? (
                        <div className="space-y-2">
                          {typeFiles.map((f) => (
                            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors group">
                              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4 text-red-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-emerald-800 truncate">{f.filename}</p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                  Uploaded: {formatDate(f.uploadedAt)}{f.size ? ` • ${formatFileSize(f.size)}` : ""}
                                </p>
                              </div>
                            </a>
                          ))}
                          {isAdmin && (
                            <FileUploadButton
                              projectId={project.id}
                              fileType={type}
                              label={uploadLabels[type]}
                              existingFiles={typeFiles}
                            />
                          )}
                        </div>
                      ) : (
                        <FileUploadButton
                          projectId={project.id}
                          fileType={type}
                          label={uploadLabels[type]}
                          existingFiles={[]}
                        />
                      )}
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
                      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 shadow-sm ${
                        step.done
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
    </div>
  )
}
