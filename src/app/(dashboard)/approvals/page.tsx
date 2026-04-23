import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatCurrency } from "@/utils/formatters"
import { CheckCircle } from "lucide-react"
import { Prisma } from "@prisma/client"
import { ApprovalActions } from "@/components/approvals/approval-actions"

type ApprovalWithRelations = Prisma.ApprovalGetPayload<{
  include: {
    project: { include: { poc: { select: { id: true; name: true; email: true } }; collaterals: true } }
    requestedBy: { select: { id: true; name: true } }
  }
}>

async function getPendingApprovals(userId: string, isAdmin: boolean) {
  return prisma.approval.findMany({
    where: {
      status: "PENDING",
      ...(isAdmin ? {} : { requestedById: userId }),
    },
    include: {
      project: {
        include: {
          poc: { select: { id: true, name: true, email: true } },
          collaterals: true,
        },
      },
      requestedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"
  if (!isAdmin) redirect("/dashboard")

  const approvals = await getPendingApprovals(session.user.id, isAdmin)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-500 mt-1">Review and approve project requests</p>
      </div>

      <div className="grid gap-4">
        {approvals.map((approval: ApprovalWithRelations) => (
          <Card key={approval.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-1 bg-linear-to-r from-purple-400 to-purple-600" />
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-[#003c71] bg-blue-50 px-2 py-0.5 rounded text-sm">
                      {approval.project.projectId}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">PENDING</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{approval.project.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Requested by <strong>{approval.requestedBy?.name}</strong> · {approval.project.location}{approval.project.state ? `, ${approval.project.state}` : ""}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Materials</p>
                      <p className="font-semibold text-sm text-gray-800">
                        {approval.project.collaterals.map((c: Prisma.CollateralGetPayload<Record<string, never>>) => c.itemName).join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Quantity</p>
                      <p className="font-mono font-bold text-gray-800">
                        {approval.project.collaterals.reduce((sum: number, c: Prisma.CollateralGetPayload<Record<string, never>>) => sum + c.quantity, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Delivery Date</p>
                      <p className="font-semibold text-sm text-gray-800">{formatDate(approval.project.deliveryDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Estimated Cost</p>
                      <p className="font-mono font-bold text-[#003c71]">{formatCurrency(approval.project.totalCost)}</p>
                    </div>
                  </div>
                </div>
                <ApprovalActions approvalId={approval.id} reminderCount={approval.reminderCount} isAdmin={isAdmin} />
              </div>
            </CardContent>
          </Card>
        ))}

        {approvals.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">All caught up!</h3>
              <p className="text-gray-500">No pending approvals at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
