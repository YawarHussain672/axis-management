import { prisma } from "./src/lib/prisma"

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, projectId: true, name: true, status: true },
    orderBy: { projectId: 'asc' },
    take: 20
  })
  console.log("Projects in database:")
  projects.forEach(p => console.log(`- ${p.projectId}: ${p.name} [${p.status}] (ID: ${p.id})`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
