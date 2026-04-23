import { Resend } from "resend"

const FROM = process.env.EMAIL_FROM || "Axis Print Management <noreply@axismaxlife.com>"

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

function baseTemplate(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr><td style="background:#003c71;padding:24px 32px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Axis Max Life</h1>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">Print Management System</p>
        </td></tr>
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px">${title}</h2>
          ${body}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
          <p style="margin:0;color:#94a3b8;font-size:12px">This is an automated message from Axis Max Life Print Management System. Please do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px;color:#64748b;font-size:13px;width:140px">${label}</td>
    <td style="padding:8px 12px;color:#0f172a;font-size:13px;font-weight:600">${value}</td>
  </tr>`
}

function button(text: string, url: string, color = "#003c71") {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">${text}</a>`
}

export async function sendProjectApprovedEmail(to: string, data: {
  pocName: string; projectName: string; projectId: string; location: string; totalCost: string; appUrl: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM, to,
    subject: `✅ Project Approved — ${data.projectId}`,
    html: baseTemplate("Your Project Has Been Approved", `
      <p style="color:#475569;margin:0 0 20px">Hi ${data.pocName},</p>
      <p style="color:#475569;margin:0 0 20px">Your print project request has been <strong style="color:#16a34a">approved</strong> and will proceed to production.</p>
      <table style="background:#f8fafc;border-radius:8px;width:100%;border-collapse:collapse;margin-bottom:20px">
        ${infoRow("Project ID", data.projectId)}
        ${infoRow("Project Name", data.projectName)}
        ${infoRow("Location", data.location)}
        ${infoRow("Total Cost", data.totalCost)}
      </table>
      ${button("View Project", `${data.appUrl}/projects`)}
    `),
  })
}

export async function sendProjectRejectedEmail(to: string, data: {
  pocName: string; projectName: string; projectId: string; reason?: string; appUrl: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM, to,
    subject: `❌ Project Rejected — ${data.projectId}`,
    html: baseTemplate("Your Project Request Was Rejected", `
      <p style="color:#475569;margin:0 0 20px">Hi ${data.pocName},</p>
      <p style="color:#475569;margin:0 0 20px">Unfortunately, your print project request has been <strong style="color:#dc2626">rejected</strong>.</p>
      <table style="background:#f8fafc;border-radius:8px;width:100%;border-collapse:collapse;margin-bottom:20px">
        ${infoRow("Project ID", data.projectId)}
        ${infoRow("Project Name", data.projectName)}
        ${data.reason ? infoRow("Reason", data.reason) : ""}
      </table>
      <p style="color:#475569;margin:0 0 20px">Please contact your admin for more details or create a revised request.</p>
      ${button("View Projects", `${data.appUrl}/projects`)}
    `),
  })
}

export async function sendDispatchNotificationEmail(to: string, data: {
  pocName: string; projectName: string; projectId: string; courier: string
  trackingId: string; expectedDelivery: string; appUrl: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM, to,
    subject: `🚚 Your Order Has Been Dispatched — ${data.projectId}`,
    html: baseTemplate("Your Order Is On Its Way!", `
      <p style="color:#475569;margin:0 0 20px">Hi ${data.pocName},</p>
      <p style="color:#475569;margin:0 0 20px">Great news! Your print materials have been dispatched.</p>
      <table style="background:#f8fafc;border-radius:8px;width:100%;border-collapse:collapse;margin-bottom:20px">
        ${infoRow("Project ID", data.projectId)}
        ${infoRow("Project Name", data.projectName)}
        ${infoRow("Courier", data.courier)}
        ${infoRow("Tracking ID", data.trackingId)}
        ${infoRow("Expected Delivery", data.expectedDelivery)}
      </table>
      ${button("Track Shipment", `${data.appUrl}/projects`)}
    `),
  })
}

export async function sendApprovalReminderEmail(to: string, data: {
  adminName: string; projectName: string; projectId: string
  pocName: string; totalCost: string; reminderCount: number; appUrl: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM, to,
    subject: `🔔 Reminder #${data.reminderCount}: Approval Pending — ${data.projectId}`,
    html: baseTemplate(`Approval Reminder #${data.reminderCount}`, `
      <p style="color:#475569;margin:0 0 20px">Hi ${data.adminName},</p>
      <p style="color:#475569;margin:0 0 20px">This is a reminder that the following project is awaiting your approval.</p>
      <table style="background:#f8fafc;border-radius:8px;width:100%;border-collapse:collapse;margin-bottom:20px">
        ${infoRow("Project ID", data.projectId)}
        ${infoRow("Project Name", data.projectName)}
        ${infoRow("Requested By", data.pocName)}
        ${infoRow("Total Cost", data.totalCost)}
      </table>
      ${button("Review & Approve", `${data.appUrl}/approvals`)}
    `),
  })
}

export async function sendPasswordResetEmail(to: string, data: {
  name: string; resetUrl: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM, to,
    subject: "Reset Your Password — Axis Print Management",
    html: baseTemplate("Reset Your Password", `
      <p style="color:#475569;margin:0 0 20px">Hi ${data.name},</p>
      <p style="color:#475569;margin:0 0 20px">We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      ${button("Reset Password", data.resetUrl)}
      <p style="color:#94a3b8;font-size:13px;margin-top:20px">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    `),
  })
}

// Generic sendEmail for simple text notifications
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string
  subject: string
  text: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    text,
  })
}
