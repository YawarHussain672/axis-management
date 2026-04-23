import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserRole, Prisma } from "@prisma/client"
import { Users } from "lucide-react"
import { TeamActions } from "@/components/team/team-actions"

type TeamMember = Prisma.UserGetPayload<Record<string, never>>

async function getTeamMembers() {
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } })
}

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"

  // POCs cannot access team management
  if (!isAdmin) redirect("/dashboard")

  const members = await getTeamMembers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Team & Roles</h1>
          <p className="text-gray-500 mt-1">Manage POCs and team members</p>
        </div>
        <TeamActions mode="add" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Name</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Email</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Phone</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Location</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Branch</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Role</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Joined</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member: TeamMember) => (
                <TableRow key={member.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-semibold text-gray-900">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{member.email}</TableCell>
                  <TableCell className="font-mono text-gray-600">{member.phone || "—"}</TableCell>
                  <TableCell className="text-gray-600">{member.location || "—"}</TableCell>
                  <TableCell className="text-gray-600">{member.branch || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === UserRole.ADMIN ? "default" : "approved"} className="text-xs">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${member.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.active ? "bg-green-500" : "bg-gray-400"}`} />
                      {member.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(member.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell>
                    <TeamActions mode="edit" member={{ id: member.id, name: member.name, phone: member.phone || "", role: member.role, active: member.active, location: member.location || "", branch: member.branch || "" }} />
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">No team members yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
