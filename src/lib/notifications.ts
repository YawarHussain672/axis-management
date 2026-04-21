import { prisma } from "./prisma"
import { pusherServer, CHANNELS, EVENTS } from "./pusher"

export async function createNotification(data: {
  userId: string
  title: string
  message: string
  type: string
  link?: string
}) {
  try {
    await prisma.notification.create({ data })
    // Trigger real-time update
    await pusherServer.trigger(CHANNELS.NOTIFICATIONS, EVENTS.NOTIFICATION_CREATED, { userId: data.userId })
  } catch (error) {
    console.error("Failed to create notification:", error)
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
  await createNotification({
    userId: pocId,
    title: "Order Dispatched",
    message: `Your order "${projectName}" (${projectIdStr}) has been dispatched via ${courier}. Tracking: ${trackingId}`,
    type: "dispatch",
    link: `/projects/${projectId}`,
  })
}

export async function notifyAdminsNewApproval(projectId: string, projectName: string, projectIdStr: string, pocName: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true },
  })
  await Promise.all(admins.map((admin) =>
    createNotification({
      userId: admin.id,
      title: "New Approval Request",
      message: `${pocName} has submitted a new project "${projectName}" (${projectIdStr}) for approval.`,
      type: "approval_request",
      link: `/approvals`,
    })
  ))
}
