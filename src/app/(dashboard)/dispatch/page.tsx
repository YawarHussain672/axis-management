import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/utils/formatters"
import { Truck } from "lucide-react"
import { TrackButton } from "@/components/dispatch/track-button"
import { DispatchHeaderActions } from "@/components/dispatch/dispatch-header-actions"
import { PodUploadButton } from "@/components/dispatch/pod-upload-button"

async function getDispatchData() {
  const dispatches = await prisma.dispatch.findMany({
    include: {
      project: {
        select: {
          id: true,
          projectId: true,
          name: true,
          location: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return dispatches
}

export default async function DispatchPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const dispatches = await getDispatchData()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Dispatch & Tracking</h1>
          <p className="text-gray-600 mt-1">Real-time tracking with POD details</p>
        </div>
        <DispatchHeaderActions />
      </div>

      {/* Dispatch Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Project ID</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Project Name</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Location</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Courier</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Tracking ID</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Dispatch Date</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Expected Delivery</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">POD</TableHead>
                <TableHead className="font-bold text-gray-700 uppercase text-xs tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatches.map((dispatch) => (
                <TableRow key={dispatch.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono font-bold text-[#003c71]">
                    {dispatch.project.projectId}
                  </TableCell>
                  <TableCell className="font-semibold">{dispatch.project.name}</TableCell>
                  <TableCell>{dispatch.project.location}</TableCell>
                  <TableCell>{dispatch.courier}</TableCell>
                  <TableCell className="font-mono text-[#00a8cc]">
                    {dispatch.trackingId}
                  </TableCell>
                  <TableCell>
                    {dispatch.dispatchDate ? formatDate(dispatch.dispatchDate) : "-"}
                  </TableCell>
                  <TableCell>
                    {dispatch.expectedDelivery ? formatDate(dispatch.expectedDelivery) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dispatch.project.status.toLowerCase() as Parameters<typeof Badge>[0]["variant"]}>
                      {dispatch.project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PodUploadButton dispatchId={dispatch.id} podUrl={dispatch.podUrl} />
                  </TableCell>
                  <TableCell>
                    <TrackButton
                      courier={dispatch.courier}
                      trackingId={dispatch.trackingId}
                      dispatchDate={dispatch.dispatchDate}
                      expectedDelivery={dispatch.expectedDelivery}
                      actualDelivery={dispatch.actualDelivery}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {dispatches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No dispatches yet</p>
                    <p className="text-sm mt-1">Dispatches will appear here once created</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div >
  )
}
