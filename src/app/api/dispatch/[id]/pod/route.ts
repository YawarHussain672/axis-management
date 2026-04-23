import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { v2 as cloudinary } from "cloudinary"
import { logActivity } from "@/lib/audit"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// POST /api/dispatch/[id]/pod — upload Proof of Delivery
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log("[POD Upload API] Request received")
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      console.log("[POD Upload API] Unauthorized:", session?.user?.role)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.log("[POD Upload API] Admin user:", session.user.id)

    const { id } = await params
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and images are allowed for POD" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 })
    }

    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    })
    if (!dispatch) return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })

    // Upload to Cloudinary
    console.log("[POD Upload API] Processing file:", file.name, "Type:", file.type, "Size:", file.size)
    const bytes = await file.arrayBuffer()
    const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`
    console.log("[POD Upload API] Uploading to Cloudinary...")
    const result = await cloudinary.uploader.upload(base64, {
      folder: `axis-print/${dispatch.projectId}/pod`,
      resource_type: "auto",
      public_id: `pod_${Date.now()}`,
    })

    // Save POD URL to dispatch
    await prisma.dispatch.update({
      where: { id },
      data: { podUrl: result.secure_url },
    })

    await logActivity({
      userId: session.user.id,
      action: "POD_UPLOADED",
      entityType: "dispatch",
      entityId: id,
      details: { url: result.secure_url },
    })

    await pusherServer.trigger(CHANNELS.DISPATCH, EVENTS.DISPATCH_UPDATED, { id })
    await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { projectId: dispatch.projectId })

    console.log("[POD Upload API] Success:", result.secure_url)
    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error("[POD Upload API] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
