import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/utils/formatters"
import { TrackButton } from "@/components/dispatch/track-button"
import { DispatchHeaderActions } from "@/components/dispatch/dispatch-header-actions"

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
    <div className="content-wrapper">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '8px' }}>
            Dispatch & Tracking
          </h1>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>
            Real-time tracking with POD details
          </p>
        </div>
        <DispatchHeaderActions />
      </div>

      {/* Dispatch Table Card */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Project ID</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Project Name</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Location</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Courier</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Tracking ID</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Dispatch Date</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Expected Delivery</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>POD</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '12px', color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--gray-200)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dispatches.map((dispatch) => (
              <tr key={dispatch.id} style={{ borderBottom: '1px solid var(--gray-200)', transition: 'background 0.2s' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--axis-primary)' }}>
                  <Link href={`/projects/${dispatch.project.id}`} style={{ color: 'var(--axis-primary)', textDecoration: 'none' }}>
                    {dispatch.project.projectId}
                  </Link>
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 600 }}>{dispatch.project.name}</td>
                <td style={{ padding: '14px 16px', color: 'var(--gray-600)' }}>{dispatch.project.location}</td>
                <td style={{ padding: '14px 16px', color: 'var(--gray-600)' }}>{dispatch.courier}</td>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', color: 'var(--axis-accent)', fontWeight: 600 }}>
                  {dispatch.trackingId || '-'}
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--gray-600)' }}>
                  {dispatch.dispatchDate ? formatDate(dispatch.dispatchDate) : '-'}
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--gray-600)' }}>
                  {dispatch.expectedDelivery ? formatDate(dispatch.expectedDelivery) : '-'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span className={`status-badge status-${dispatch.project.status.toLowerCase()}`}>
                    {dispatch.project.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {dispatch.podUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600, fontSize: '13px' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Available
                      </span>
                      <a
                        href={dispatch.podUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          color: '#374151',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Pending</span>
                  )}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {dispatch.courier && dispatch.trackingId ? (
                    <TrackButton
                      courier={dispatch.courier}
                      trackingId={dispatch.trackingId}
                      dispatchDate={dispatch.dispatchDate}
                      expectedDelivery={dispatch.expectedDelivery}
                      actualDelivery={dispatch.actualDelivery}
                    />
                  ) : (
                    <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>No tracking</span>
                  )}
                </td>
              </tr>
            ))}
            {dispatches.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--gray-500)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gray-400)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 7m0 13V7" />
                    </svg>
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>No dispatches yet</p>
                  <p style={{ fontSize: '14px', color: 'var(--gray-400)', margin: 0 }}>Dispatches will appear here once created</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
