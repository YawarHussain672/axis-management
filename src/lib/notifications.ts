import { prisma } from "./prisma"
import { pusherServer, CHANNELS, EVENTS } from "./pusher"
import { sendEmail } from "./email"

export async function createNotification(data: {
  userId: string
  title: string
  message: string
  type: string
  link?: string
}) {
  try {
    console.log("[Notifications] Creating notification for user:", data.userId)
    await prisma.notification.create({ data })
    // Trigger real-time update
    console.log("[Notifications] Broadcasting to Pusher channel:", CHANNELS.NOTIFICATIONS)
    console.log("[Notifications] Event name:", EVENTS.NOTIFICATION_CREATED)
    console.log("[Notifications] Payload:", { userId: data.userId })
    await pusherServer.trigger(CHANNELS.NOTIFICATIONS, EVENTS.NOTIFICATION_CREATED, { userId: data.userId })
    console.log("[Notifications] Broadcast complete")
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error)
  }
}

export async function notifyProjectApproved(projectId: string, pocId: string, projectName: string, projectIdStr: string) {
  await createNotification({
    userId: pocId,
    title: "Project Approved",
    message: `Your project "${projectName}" (${projectIdStr}) has been approved and will proceed to production.`,
    type: "approval",
    link: `/projects/${projectId}`,
  })
}

export async function notifyProjectRejected(projectId: string, pocId: string, projectName: string, projectIdStr: string, reason?: string) {
  await createNotification({
    userId: pocId,
    title: "Project Rejected",
    message: `Your project "${projectName}" (${projectIdStr}) has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
    type: "rejection",
    link: `/projects/${projectId}`,
  })
}

export async function notifyProjectDispatched(projectId: string, pocId: string, projectName: string, projectIdStr: string, courier: string, trackingId: string) {
  // Get POC email
  const poc = await prisma.user.findUnique({ where: { id: pocId }, select: { email: true } })

  await createNotification({
    userId: pocId,
    title: "Order Dispatched",
    message: `Your order "${projectName}" (${projectIdStr}) has been dispatched via ${courier}. Tracking: ${trackingId}`,
    type: "dispatch",
    link: `/projects/${projectId}`,
  })

  // Send email
  if (poc?.email) {
    await sendEmail({
      to: poc.email,
      subject: `Order Dispatched - ${projectIdStr}`,
      text: `Your order "${projectName}" (${projectIdStr}) has been dispatched via ${courier}. Tracking: ${trackingId}`,
    })
  }
}

export async function notifyAdminsNewApproval(projectId: string, projectName: string, projectIdStr: string, pocName: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true, email: true },
  })

  // Send in-app notifications
  await Promise.all(admins.map((admin) =>
    createNotification({
      userId: admin.id,
      title: "New Approval Request",
      message: `${pocName} has submitted a new project "${projectName}" (${projectIdStr}) for approval.`,
      type: "approval_request",
      link: `/approvals`,
    })
  ))

  // Send emails to all admins
  await Promise.all(admins.filter(a => a.email).map((admin) =>
    sendEmail({
      to: admin.email!,
      subject: `New Approval Request - ${projectIdStr}`,
      text: `${pocName} has submitted a new project "${projectName}" (${projectIdStr}) for approval.`,
    })
  ))
}
