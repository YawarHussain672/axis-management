import { FolderKanban, Clock, Printer, Truck, CheckCircle, IndianRupee } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/dashboard/stats-card"
import { RecentProjectsTable } from "@/components/dashboard/recent-projects-table"
import { prisma } from "@/lib/prisma"
import { ProjectStatus, Prisma } from "@prisma/client"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

async function getDashboardStats(projectFilter: Prisma.ProjectWhereInput) {
  const [
    totalProjects,
    pendingApproval,
    inProduction,
    inTransit,
    delivered,
    totalSpend,
    recentProjects,
  ] = await Promise.all([
    prisma.project.count({ where: projectFilter }),
    prisma.project.count({ where: { ...projectFilter, status: ProjectStatus.REQUESTED } }),
    prisma.project.count({ where: { ...projectFilter, status: ProjectStatus.PRINTING } }),
    prisma.project.count({ where: { ...projectFilter, status: ProjectStatus.DISPATCHED } }),
    prisma.project.count({ where: { ...projectFilter, status: ProjectStatus.DELIVERED } }),
    prisma.project.aggregate({ where: projectFilter, _sum: { totalCost: true } }),
    prisma.project.findMany({
      where: projectFilter,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { poc: { select: { name: true } } },
    }),
  ])

  return {
    totalProjects,
    pendingApproval,
    inProduction,
    inTransit,
    delivered,
    totalSpend: totalSpend._sum.totalCost || 0,
    recentProjects,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const projectFilter = session?.user.role === "POC" ? { pocId: session.user.id } : {}
  const stats = await getDashboardStats(projectFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Real-time overview of print operations
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard title="Total Projects" value={stats.totalProjects} icon={<FolderKanban className="h-4 w-4" />} color="blue" />
        <StatsCard title="Pending" value={stats.pendingApproval} icon={<Clock className="h-4 w-4" />} color="purple" />
        <StatsCard title="Printing" value={stats.inProduction} icon={<Printer className="h-4 w-4" />} color="amber" />
        <StatsCard title="In Transit" value={stats.inTransit} icon={<Truck className="h-4 w-4" />} color="cyan" />
        <StatsCard title="Delivered" value={stats.delivered} icon={<CheckCircle className="h-4 w-4" />} color="green" />
        <StatsCard title="Total Spend" value={stats.totalSpend} isCurrency icon={<IndianRupee className="h-4 w-4" />} color="rose" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
          <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
        </CardHeader>
        <CardContent className="p-0">
          <RecentProjectsTable projects={stats.recentProjects} />
        </CardContent>
      </Card>
    </div>
  )
}
