import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { FileType } from "@prisma/client"
import { v2 as cloudinary } from "cloudinary"
import { logActivity } from "@/lib/audit"

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// POST /api/upload
// Body: FormData with fields: file (File), projectId (string), fileType (PO | CHALLAN | INVOICE)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const projectId = formData.get("projectId") as string | null
    const fileType = formData.get("fileType") as string | null

    if (!file || !projectId || !fileType) {
      return NextResponse.json({ error: "file, projectId and fileType are required" }, { status: 400 })
    }

    if (!["PO", "CHALLAN", "INVOICE"].includes(fileType)) {
      return NextResponse.json({ error: "Invalid fileType" }, { status: 400 })
    }

    // Verify project exists and check access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { pocId: true, status: true },
    })
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const isAdmin = session.user.role === "ADMIN"
    const isOwner = project.pocId === session.user.id

    // PO, Challan, Invoice are admin-only uploads (vendor documents)
    // POC can only view them, not upload
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "You can only upload files to your own projects" }, { status: 403 })
    }
    if (!isAdmin && ["PO", "CHALLAN", "INVOICE"].includes(fileType)) {
      return NextResponse.json({ error: "Only admins can upload PO, Challan and Invoice documents" }, { status: 403 })
    }

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: `axis-print/${projectId}/${fileType.toLowerCase()}`,
      resource_type: "auto",
      public_id: `${fileType.toLowerCase()}_${Date.now()}`,
    })

    // Save to database
    const fileRecord = await prisma.fileUpload.create({
      data: {
        projectId,
        type: fileType as FileType,
        url: uploadResult.secure_url,
        filename: file.name,
        size: file.size,
        uploadedById: session.user.id,
      },
    })

    await logActivity({
      userId: session.user.id,
      action: `${fileType}_UPLOADED`,
      entityType: "project",
      entityId: projectId,
      details: { filename: file.name, size: file.size },
    })

    return NextResponse.json({
      id: fileRecord.id,
      url: uploadResult.secure_url,
      filename: file.name,
      size: file.size,
    }, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
