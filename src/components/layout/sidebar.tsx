"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, FolderKanban, CheckCircle, Truck,
  Plus, Receipt, Users, BarChart3, LogOut, ChevronDown,
  Printer, AlertTriangle,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { useState, useEffect } from "react"
import { openNewProjectModal } from "@/components/projects/new-project-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface NavItem { label: string; href: string; icon: React.ReactNode; count?: number }
interface SidebarProps { user?: { name: string; email: string; role: string } }

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [counts, setCounts] = useState({ totalProjects: 0, pendingApprovals: 0 })
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  // Fetch real-time counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/counts")
        if (res.ok) {
          const data = await res.json()
          setCounts(data)
        }
      } catch {
        // silently fail — counts are non-critical UI enhancement
      }
    }

    fetchCounts()
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  const isAdmin = user?.role === "ADMIN"

  const mainNav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "All Projects", href: "/projects", icon: <FolderKanban className="h-5 w-5" />, count: counts.totalProjects },
    ...(isAdmin ? [{ label: "Approvals", href: "/approvals", icon: <CheckCircle className="h-5 w-5" />, count: counts.pendingApprovals }] : []),
    ...(isAdmin ? [{ label: "Dispatch & Tracking", href: "/dispatch", icon: <Truck className="h-5 w-5" /> }] : []),
  ]

  const mgmtNav: NavItem[] = [
    { label: "Create Project", href: "/projects/new", icon: <Plus className="h-5 w-5" /> },
    ...(isAdmin ? [
      { label: "Rate Card", href: "/rate-card", icon: <Receipt className="h-5 w-5" /> },
      { label: "Team & Roles", href: "/team", icon: <Users className="h-5 w-5" /> },
      { label: "Analytics & Reports", href: "/analytics", icon: <BarChart3 className="h-5 w-5" /> },
    ] : []),
  ]


  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/")

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href)

    // Handle Create Project as modal trigger
    if (item.label === "Create Project") {
      return (
        <button
          onClick={openNewProjectModal}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left",
            active ? "text-cyan-300" : "text-blue-100/70 hover:text-white"
          )}
          style={active ? {
            background: "rgba(34,211,238,0.12)",
            backdropFilter: "blur(8px)",
            boxShadow: "inset 0 1px 0 rgba(34,211,238,0.15), 0 0 12px rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.2)",
          } : undefined}
          onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.07)" }}
          onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent" }}
        >
          {/* Left cyan indicator line */}
          {active && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
              style={{
                height: "60%",
                background: "linear-gradient(180deg, rgba(34,211,238,0.9) 0%, rgba(34,211,238,0.4) 100%)",
                boxShadow: "0 0 8px rgba(34,211,238,0.6), 0 0 2px rgba(34,211,238,0.8)",
              }}
            />
          )}
          <span className={cn("shrink-0 transition-colors", active ? "text-cyan-300" : "text-blue-200/60 group-hover:text-white")}>
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
        </button>
      )
    }

    return (
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          active ? "text-cyan-300" : "text-blue-100/70 hover:text-white"
        )}
        style={active ? {
          background: "rgba(34,211,238,0.12)",
          backdropFilter: "blur(8px)",
          boxShadow: "inset 0 1px 0 rgba(34,211,238,0.15), 0 0 12px rgba(34,211,238,0.08)",
          border: "1px solid rgba(34,211,238,0.2)",
        } : undefined}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.07)" }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent" }}
      >
        {/* Left cyan indicator line */}
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
            style={{
              height: "60%",
              background: "linear-gradient(180deg, rgba(34,211,238,0.9) 0%, rgba(34,211,238,0.4) 100%)",
              boxShadow: "0 0 8px rgba(34,211,238,0.6), 0 0 2px rgba(34,211,238,0.8)",
            }}
          />
        )}
        <span className={cn("shrink-0 transition-colors", active ? "text-cyan-300" : "text-blue-200/60 group-hover:text-white")}>
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        {item.count !== undefined && item.count > 0 && (
          <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full bg-red-500 text-white shadow-sm shadow-red-500/40">
            {item.count > 99 ? "99+" : item.count}
          </span>
        )}
        {active && !item.count && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-300/80" />}
      </Link>
    )
  }

  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col"
      style={{
        background: "linear-gradient(160deg, rgba(0,60,113,0.97) 0%, rgba(0,42,82,0.98) 60%, rgba(0,28,56,0.99) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
          <Printer className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">Axis Max Life</p>
          <p className="text-blue-200/70 text-sm font-medium">Print Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-wide px-3 mb-2">Menu</p>
          <div className="space-y-1">{mainNav.map(i => <NavLink key={i.href} item={i} />)}</div>
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-wide px-3 mb-2">Management</p>
          <div className="space-y-1">{mgmtNav.map(i => <NavLink key={i.href} item={i} />)}</div>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors"
          style={{ background: userMenuOpen ? "rgba(255,255,255,0.1)" : "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = userMenuOpen ? "rgba(255,255,255,0.1)" : "transparent")}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-medium truncate leading-tight">{user?.name || "User"}</p>
            <p className="text-blue-200/60 text-xs truncate">{user?.role}</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-blue-200/60 transition-transform shrink-0", userMenuOpen && "rotate-180")} />
        </button>
        {userMenuOpen && (
          <button
            onClick={() => setSignOutDialogOpen(true)}
            className="mt-1 flex items-center gap-2 w-full px-3 py-2 rounded-lg text-red-300 hover:bg-red-500/20 text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        )}
      </div>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Sign Out
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-slate-700">
              Are you sure you want to sign out? You will need to log in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setSignOutDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              Yes, Sign Out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
