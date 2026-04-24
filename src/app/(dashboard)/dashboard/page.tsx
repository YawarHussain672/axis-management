import { prisma } from "@/lib/prisma"
import { ProjectStatus, Prisma } from "@prisma/client"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { StatusBadge } from "@/components/ui/status-badge"

// SVG Icons matching HTML file
const FolderIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const ClockIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const PrinterIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
)

const TruckIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

const CheckIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const RupeeIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

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

function StatCard({ label, value, icon, iconBg, iconColor }: {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
        </div>
        <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const projectFilter = session?.user.role === "POC" ? { pocId: session.user.id } : {}
  const stats = await getDashboardStats(projectFilter)

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Real-time insights into print operations across 480+ locations</p>
      </div>

      {/* Stats Grid - Exact from HTML */}
      <div className="stats-grid">
        <StatCard
          label="Active Projects"
          value={stats.totalProjects}
          icon={<FolderIcon />}
          iconBg="rgba(0, 168, 204, 0.1)"
          iconColor="var(--axis-accent)"
        />
        <StatCard
          label="Pending Approval"
          value={stats.pendingApproval}
          icon={<ClockIcon />}
          iconBg="rgba(139, 92, 246, 0.1)"
          iconColor="var(--status-requested)"
        />
        <StatCard
          label="In Production"
          value={stats.inProduction}
          icon={<PrinterIcon />}
          iconBg="rgba(245, 158, 11, 0.1)"
          iconColor="var(--status-printing)"
        />
        <StatCard
          label="In Transit"
          value={stats.inTransit}
          icon={<TruckIcon />}
          iconBg="rgba(6, 182, 212, 0.1)"
          iconColor="var(--status-dispatched)"
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          icon={<CheckIcon />}
          iconBg="rgba(16, 185, 129, 0.1)"
          iconColor="var(--color-success)"
        />
        <StatCard
          label="Total Spend"
          value={`₹${Math.round(stats.totalSpend / 1000)}K`}
          icon={<RupeeIcon />}
          iconBg="rgba(16, 185, 129, 0.1)"
          iconColor="var(--color-success)"
        />
      </div>

      {/* Recent Projects Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Projects</h3>
          <Link href="/projects">
            <button className="btn btn-secondary">View All</button>
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Project Name</th>
                <th>Location</th>
                <th>POC</th>
                <th>Status</th>
                <th>Delivery Date</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentProjects.map((project) => (
                <tr key={project.id}>
                  <td className="project-id">{project.projectId}</td>
                  <td><strong>{project.name}</strong></td>
                  <td>{project.location}{project.state ? `, ${project.state}` : ''}</td>
                  <td>{project.poc?.name}</td>
                  <td><StatusBadge status={project.status} /></td>
                  <td>{new Date(project.deliveryDate).toLocaleDateString('en-IN')}</td>
                  <td className="font-mono">₹{project.totalCost.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
