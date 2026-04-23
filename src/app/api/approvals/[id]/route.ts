import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { sendProjectApprovedEmail, sendProjectRejectedEmail, sendApprovalReminderEmail } from "@/lib/email"
import { logActivity } from "@/lib/audit"
import { formatCurrency } from "@/utils/formatters"
import { notifyProjectApproved, notifyProjectRejected } from "@/lib/notifications"

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { action, notes } = await request.json()
    const notesText = typeof notes === "string" ? notes.trim() : ""

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        project: { include: { poc: true } },
        requestedBy: true,
      },
    })
    if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 })

    if (action === "approve" || action === "reject" || action === "reminder") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can manage approvals" }, { status: 403 })
      }
    }

    if (action === "approve") {
      await prisma.$transaction([
        prisma.approval.update({
          where: { id },
          data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date(), notes: notesText || undefined },
        }),
        prisma.project.update({
          where: { id: approval.projectId },
          data: {
            status: ProjectStatus.APPROVED,
            statusHistory: {
              create: { status: ProjectStatus.APPROVED, note: notesText || "Approved", changedById: session.user.id },
            },
          },
        }),
      ])

      // Send approval email to POC
      await sendProjectApprovedEmail(approval.project.poc.email, {
        pocName: approval.project.poc.name,
        projectName: approval.project.name,
        projectId: approval.project.projectId,
        location: approval.project.location,
        totalCost: formatCurrency(approval.project.totalCost),
        appUrl: APP_URL,
      })

      // In-app notification
      await notifyProjectApproved(approval.projectId, approval.project.poc.id, approval.project.name, approval.project.projectId)

      // Audit log
      await logActivity({
        userId: session.user.id,
        action: "APPROVED",
        entityType: "approval",
        entityId: id,
        details: { projectId: approval.projectId, notes: notesText || undefined },
      })

    } else if (action === "reject") {
      if (!notesText) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.approval.update({
          where: { id },
          data: { status: "REJECTED", approvedById: session.user.id, rejectedAt: new Date(), notes: notesText },
        }),
        prisma.project.update({
          where: { id: approval.projectId },
          data: {
            status: ProjectStatus.CANCELLED,
            statusHistory: {
              create: { status: ProjectStatus.CANCELLED, note: notesText, changedById: session.user.id },
            },
          },
        }),
      ])

      // Send rejection email to POC
      await sendProjectRejectedEmail(approval.project.poc.email, {
        pocName: approval.project.poc.name,
        projectName: approval.project.name,
        projectId: approval.project.projectId,
        reason: notesText,
        appUrl: APP_URL,
      })

      // In-app notification
      await notifyProjectRejected(approval.projectId, approval.project.poc.id, approval.project.name, approval.project.projectId, notesText)

      // Audit log
      await logActivity({
        userId: session.user.id,
        action: "REJECTED",
        entityType: "approval",
        entityId: id,
        details: { projectId: approval.projectId, notes: notesText },
      })

    } else if (action === "reminder") {
      const updated = await prisma.approval.update({
        where: { id },
        data: { reminderCount: { increment: 1 } },
      })

      // Send reminder email to all admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", active: true },
        select: { email: true, name: true },
      })

      await Promise.all(admins.map((admin) =>
        sendApprovalReminderEmail(admin.email, {
          adminName: admin.name,
          projectName: approval.project.name,
          projectId: approval.project.projectId,
          pocName: approval.requestedBy.name,
          totalCost: formatCurrency(approval.project.totalCost),
          reminderCount: updated.reminderCount,
          appUrl: APP_URL,
        })
      ))

      // Audit log
      await logActivity({
        userId: session.user.id,
        action: "REMINDER_SENT",
        entityType: "approval",
        entityId: id,
        details: { projectId: approval.projectId, reminderCount: updated.reminderCount },
      })
    }

    await pusherServer.trigger(CHANNELS.APPROVALS, EVENTS.APPROVAL_UPDATED, { id })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { projectId: approval.projectId })
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 })
  }
}
