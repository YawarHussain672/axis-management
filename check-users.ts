import { prisma } from "./src/lib/prisma"

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    take: 10
  })
  console.log("Users in database:")
  users.forEach(u => console.log(`- ${u.id}: ${u.email} (${u.name}) [${u.role}]`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
