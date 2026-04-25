import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher"
import { notifyProjectDispatched } from "@/lib/notifications"
import ExcelJS from "exceljs"

type DispatchUploadRow = Record<string, string | number | Date | null | undefined>

function getCellValue(row: DispatchUploadRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== "") {
      return String(value)
    }
  }
  return ""
}

// POST /api/dispatch/bulk - Upload Excel with dispatch details
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can bulk upload dispatch data" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Read Excel file with ExcelJS
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(arrayBuffer) as unknown as ExcelJS.Buffer)
    const sheet = workbook.worksheets[0]

    if (!sheet) {
      return NextResponse.json({ error: "Excel file has no worksheets" }, { status: 400 })
    }

    const data: Record<string, string | number | Date | null | undefined>[] = []
    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell((cell: ExcelJS.Cell) => {
      headers.push(cell.value?.toString() || "")
    })

    sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber === 1) return // Skip header row
      const rowData: Record<string, string | number | Date | null | undefined> = {}
      row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        const header = headers[colNumber - 1]
        if (header) {
          const val = cell.value
          // Convert ExcelJS CellValue to compatible type
          if (val === null || val === undefined) {
            rowData[header] = null
          } else if (typeof val === 'string' || typeof val === 'number' || val instanceof Date) {
            rowData[header] = val
          } else {
            rowData[header] = String(val)
          }
        }
      })
      data.push(rowData)
    })

    const results = {
      processed: 0,
      errors: [] as string[],
      updated: [] as string[],
    }

    // Process each row
    for (const row of data) {
      try {
        const projectIdStr = getCellValue(row, ["Project ID", "projectId", "ProjectID"])
        const courier = getCellValue(row, ["Courier", "courier"])
        const trackingId = getCellValue(row, ["Tracking ID", "trackingId", "TrackingID"])
        const dispatchDate = getCellValue(row, ["Dispatch Date", "dispatchDate", "DispatchDate"])
        const expectedDelivery = getCellValue(row, ["Expected Delivery", "expectedDelivery", "ExpectedDelivery"])

        if (!projectIdStr || !courier || !trackingId) {
          results.errors.push(`Missing required fields for row: ${JSON.stringify(row)}`)
          continue
        }

        // Find project by projectId string (like PROJ-001)
        const project = await prisma.project.findFirst({
          where: { projectId: projectIdStr },
          include: { poc: { select: { id: true, name: true, email: true } } },
        })

        if (!project) {
          results.errors.push(`Project not found: ${projectIdStr}`)
          continue
        }

        if (project.status !== "PRINTING") {
          results.errors.push(`Project ${projectIdStr} must be in PRINTING status (current: ${project.status})`)
          continue
        }

        // Create dispatch record
        await prisma.dispatch.create({
          data: {
            projectId: project.id,
            courier,
            trackingId,
            dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
            status: "IN_TRANSIT",
          },
        })

        // Update project status to DISPATCHED
        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: "DISPATCHED",
            statusHistory: {
              create: {
                status: "DISPATCHED",
                note: `Dispatched via ${courier}, Tracking: ${trackingId}`,
                changedById: session.user.id,
              },
            },
          },
        })

        // Send notification to POC
        await notifyProjectDispatched(
          project.id,
          project.pocId,
          project.name,
          project.projectId || project.id,
          courier,
          trackingId
        )

        // Broadcast real-time updates
        await pusherServer.trigger(CHANNELS.PROJECTS, EVENTS.PROJECT_UPDATED, { id: project.id })

        results.processed++
        results.updated.push(projectIdStr)
      } catch (error) {
        results.errors.push(`Error processing row: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Broadcast dashboard update
    await pusherServer.trigger(CHANNELS.DASHBOARD, EVENTS.STATS_UPDATED, {})

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} projects`,
      errors: results.errors,
      updated: results.updated,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process bulk dispatch" }, { status: 500 })
  }
}

// GET /api/dispatch/bulk/template - Download Excel template
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create template with ExcelJS
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Dispatch Template")

    worksheet.columns = [
      { header: "Project ID", key: "projectId" },
      { header: "Courier", key: "courier" },
      { header: "Tracking ID", key: "trackingId" },
      { header: "Dispatch Date", key: "dispatchDate" },
      { header: "Expected Delivery", key: "expectedDelivery" },
    ]

    worksheet.addRow({
      projectId: "PROJ-001",
      courier: "Blue Dart",
      trackingId: "1234567890",
      dispatchDate: "2024-01-15",
      expectedDelivery: "2024-01-18",
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="dispatch-template.xlsx"',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 })
  }
}
