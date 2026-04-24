import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { TeamActions } from "@/components/team/team-actions"

type TeamMember = Prisma.UserGetPayload<Record<string, never>>

async function getTeamMembers() {
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } })
}

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"

  // POCs cannot access team management
  if (!isAdmin) redirect("/dashboard")

  const members = await getTeamMembers()

  // Empty state icon
  const UsersIcon = () => (
    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
  }

  // Format date
  const formatJoinedDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Team & Roles</h1>
          <p className="page-subtitle">Manage POCs and team members</p>
        </div>
        <TeamActions mode="add" />
      </div>

      {/* Team Table Card */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: TeamMember) => (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className="user-avatar"
                        style={{
                          width: '36px',
                          height: '36px',
                          fontSize: '14px',
                          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: 'white'
                        }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <strong>{member.name}</strong>
                    </div>
                  </td>
                  <td>{member.email}</td>
                  <td className="font-mono">{member.phone || "—"}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 12px',
                        background: member.role === 'ADMIN' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: member.role === 'ADMIN' ? 'var(--status-requested)' : 'var(--status-approved)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 12px',
                        background: member.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: member.active ? 'var(--color-success)' : 'var(--color-error)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      {member.active ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td>{formatJoinedDate(member.createdAt)}</td>
                  <td>
                    <TeamActions
                      mode="edit"
                      member={{
                        id: member.id,
                        name: member.name,
                        email: member.email,
                        phone: member.phone || "",
                        role: member.role,
                        active: member.active,
                        location: member.location || "",
                        branch: member.branch || ""
                      }}
                    />
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-400)' }}>
                    <div style={{ color: 'var(--gray-300)', marginBottom: '12px' }}>
                      <UsersIcon />
                    </div>
                    <p style={{ fontWeight: 500 }}>No team members yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
