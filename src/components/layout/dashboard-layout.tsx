"use client"

import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { NewProjectModal } from "@/components/projects/new-project-modal"

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: { name: string; email: string; role: string }
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar user={user} />
      <div className="ml-64">
        <TopBar />
        <main className="p-6">
          {children}
        </main>
      </div>
      <NewProjectModal />
    </div>
  )
}
