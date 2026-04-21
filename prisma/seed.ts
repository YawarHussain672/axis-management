import { PrismaClient, UserRole, ProjectStatus, ApprovalStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin@123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@axismaxlife.com" },
    update: {},
    create: {
      email: "admin@axismaxlife.com",
      name: "Admin User",
      password: adminPassword,
      role: UserRole.ADMIN,
      phone: "+91 98765 43210",
      active: true,
    },
  })
  console.log("Admin user created:", admin.email)

  // Create POC users
  const pocData = [
    { email: "harsh.gupta@axismaxlife.com", name: "Harsh Gupta", phone: "+91 98765 43211" },
    { email: "pragyata.sharma@axismaxlife.com", name: "Pragyata Sharma", phone: "+91 98765 43212" },
    { email: "balaji.kumar@axismaxlife.com", name: "Balaji Kumar", phone: "+91 98765 43213" },
    { email: "shyam.gupta@axismaxlife.com", name: "Shyam Gupta", phone: "+91 98765 43214" },
  ]

  const pocPassword = await bcrypt.hash("Poc@123", 10)
  const pocs = await Promise.all(
    pocData.map((poc) =>
      prisma.user.upsert({
        where: { email: poc.email },
        update: {},
        create: {
          email: poc.email,
          name: poc.name,
          password: pocPassword,
          role: UserRole.POC,
          phone: poc.phone,
          active: true,
        },
      })
    )
  )
  console.log("POC users created:", pocs.length)

  // Create Rate Card items
  const rateCardData = [
    {
      itemName: "Flier",
      specification: "A4 front/back, 4 + 4 Color Printing, 90 GSM sinar mass",
      volumeSlabs: [
        { slab: "1000", price: 4.95 },
        { slab: "2500", price: 3.0 },
        { slab: "5000", price: 1.92 },
        { slab: "10000", price: 1.58 },
      ],
    },
    {
      itemName: "Leaflets",
      specification: "4 Pager",
      volumeSlabs: [
        { slab: "1000", price: 6.4 },
        { slab: "2000", price: 4.55 },
        { slab: "5000", price: 2.7 },
      ],
    },
    {
      itemName: "Poster",
      specification: "19 by 29 inches, 170 GSM, Art Paper",
      volumeSlabs: [
        { slab: "100", price: 75.0 },
        { slab: "500", price: 24.75 },
        { slab: "1000", price: 19.35 },
      ],
    },
    {
      itemName: "Dangler",
      specification: "Size: A4, 300 GSM, Front Back printing",
      volumeSlabs: [
        { slab: "1000", price: 9.7 },
        { slab: "5000", price: 4.95 },
      ],
    },
    {
      itemName: "Standee",
      specification: "3 ft by 6 ft, Rollup, Star Flex",
      volumeSlabs: [
        { slab: "Less than 10", price: 1100.0 },
        { slab: "upto 100", price: 975.0 },
      ],
    },
    {
      itemName: "Tent Card",
      specification: "Size: A5, 300 GSM",
      volumeSlabs: [
        { slab: "100", price: 27.0 },
        { slab: "500", price: 12.5 },
      ],
    },
    {
      itemName: "Z Card",
      specification: "9*12 Inch, 130 GSM",
      volumeSlabs: [
        { slab: "1000", price: 8.0 },
        { slab: "5000", price: 3.95 },
      ],
    },
    {
      itemName: "Brochure",
      specification: "A4 Closed, 16 Pages+ Cover",
      volumeSlabs: [
        { slab: "1000", price: 41.71 },
        { slab: "5000", price: 28.15 },
      ],
    },
    {
      itemName: "Table Sticker",
      specification: "A5 - One sided, 4 colour",
      volumeSlabs: [
        { slab: "2000", price: 4.95 },
        { slab: "10000", price: 1.9 },
      ],
    },
    {
      itemName: "Booklet",
      specification: "Multi-page bound document",
      volumeSlabs: [
        { slab: "100", price: 35.0 },
        { slab: "500", price: 28.0 },
      ],
    },
  ]

  const rateCards = await Promise.all(
    rateCardData.map((item) =>
      prisma.rateCard.upsert({
        where: { itemName: item.itemName },
        update: {},
        create: item,
      })
    )
  )
  console.log("Rate card items created:", rateCards.length)

  // Create sample projects
  const sampleProjects = [
    {
      name: "Marketing Collateral - Sohna Road",
      location: "Gurgaon",
      state: "Haryana",
      status: ProjectStatus.DELIVERED,
      totalCost: 17756,
    },
    {
      name: "NRI Marketing Collateral",
      location: "Chennai",
      state: "Tamil Nadu",
      status: ProjectStatus.DELIVERED,
      totalCost: 10150,
    },
    {
      name: "GenX Digital Agency",
      location: "Noida",
      state: "Uttar Pradesh",
      status: ProjectStatus.PRINTING,
      totalCost: 3132,
    },
    {
      name: "GO inauguration - Kolkata",
      location: "Kolkata",
      state: "West Bengal",
      status: ProjectStatus.DELIVERED,
      totalCost: 13626,
    },
    {
      name: "Marketing Collaterals - Greater Noida",
      location: "Noida",
      state: "Uttar Pradesh",
      status: ProjectStatus.DELIVERED,
      totalCost: 24000,
    },
  ]

  const today = new Date()
  const projects = await Promise.all(
    sampleProjects.map(async (proj, index) => {
      const year = today.getFullYear()
      const random = 100 + index
      const projectId = `PRJ-${year}-${random}`
      const piNumber = (2000 + index).toString()

      return prisma.project.upsert({
        where: { projectId },
        update: {},
        create: {
          projectId,
          name: proj.name,
          piNumber,
          location: proj.location,
          state: proj.state,
          deliveryDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: proj.status,
          totalCost: proj.totalCost,
          pocId: pocs[index % pocs.length].id,
          collaterals: {
            create: [
              {
                itemName: "Poster",
                quantity: 100,
                unitPrice: 75,
                totalPrice: 7500,
              },
              {
                itemName: "Standee",
                quantity: 10,
                unitPrice: 975,
                totalPrice: 9750,
              },
            ],
          },
          statusHistory: {
            create: {
              status: proj.status,
              note: "Initial status",
            },
          },
        },
      })
    })
  )
  console.log("Sample projects created:", projects.length)

  // Create sample PENDING approvals for some projects
  const approvalProjects = projects.slice(0, 3) // First 3 projects
  for (const project of approvalProjects) {
    await prisma.approval.create({
      data: {
        projectId: project.id,
        requestedById: admin.id,
        status: ApprovalStatus.PENDING,
        reminderCount: 0,
      },
    })
  }
  console.log("Sample approvals created:", approvalProjects.length)

  // Create sample dispatch for delivered/dispatched projects
  const dispatchProjects = projects.filter(
    (p) => p.status === ProjectStatus.DISPATCHED || p.status === ProjectStatus.DELIVERED
  )
  for (const project of dispatchProjects) {
    await prisma.dispatch.create({
      data: {
        projectId: project.id,
        courier: "Blue Dart",
        trackingId: `BD${Math.floor(Math.random() * 1000000000)}`,
        dispatchDate: new Date(),
        expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        actualDelivery: project.status === ProjectStatus.DELIVERED ? new Date() : null,
        podUrl: null,
      },
    })
  }
  console.log("Sample dispatches created:", dispatchProjects.length)

  console.log("\nSeed completed successfully!")
  console.log("\nLogin credentials:")
  console.log("Admin: admin@axismaxlife.com / Admin@123")
  console.log("POCs: [name]@axismaxlife.com / Poc@123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
