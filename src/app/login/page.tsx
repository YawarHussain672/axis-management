"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid email or password")
      } else {
        toast.success("Welcome back!")
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Override global body styles for this page */}
      <style>{`
        body { background: #faf8ff !important; }
      `}</style>

      <main className="flex min-h-screen w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* LEFT SIDE: Branding & Features (Desktop Only) */}
        <section className="hidden md:flex relative w-[60%] items-center justify-center p-12 overflow-hidden" style={{ background: 'linear-gradient(135deg, #003c71, #002a52, #001f3d)' }}>
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(91, 216, 254, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(91, 216, 254, 0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Floating Decorative Elements */}
          <div className="absolute -top-[10%] -left-[10%] w-96 h-96 rounded-full blur-[120px]" style={{ background: 'rgba(91, 216, 254, 0.2)' }} />
          <div className="absolute -bottom-[5%] -right-[5%] w-80 h-80 rounded-full blur-[100px]" style={{ background: 'rgba(0, 60, 113, 0.4)' }} />

          {/* Content Card */}
          <div
            className="relative z-10 max-w-2xl w-full p-12 rounded-[32px] shadow-2xl"
            style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            {/* Logo Cluster */}
            <div className="flex items-center gap-4 mb-12">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #003c71, #00a8cc)' }}
              >
                <span className="text-3xl font-black text-white tracking-tighter">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight leading-none">Axis Max Life</h1>
                <p className="text-sm font-medium tracking-widest uppercase mt-1" style={{ color: '#58d5fb' }}>Print Management</p>
              </div>
            </div>

            {/* Hero Text */}
            <h2 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Streamline Your <br />
              <span style={{ color: '#b5ebff' }}>Print Operations</span>
            </h2>
            <p className="text-lg leading-relaxed mb-10 max-w-md" style={{ color: '#7fa8e3' }}>
              Centralize your technical assets, manage approval workflows, and gain real-time visibility into your global print logistics.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium flex items-center gap-2">
                <svg className="w-[18px] h-[18px]" style={{ color: '#b5ebff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Project Management
              </div>
              <div className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium flex items-center gap-2">
                <svg className="w-[18px] h-[18px]" style={{ color: '#b5ebff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Real-time Tracking
              </div>
              <div className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium flex items-center gap-2">
                <svg className="w-[18px] h-[18px]" style={{ color: '#b5ebff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Approval Workflow
              </div>
            </div>
          </div>

          {/* Foreground Graphic Decor */}
          <div className="absolute bottom-12 left-12 flex items-center gap-4 opacity-40">
            <div className="h-[1px] w-24 bg-white/30"></div>
            <span className="text-xs font-mono text-white tracking-[0.2em]">AM-L 2024 SYSTEM CORE</span>
          </div>
        </section>

        {/* RIGHT SIDE: Login Canvas */}
        <section className="w-full md:w-[40%] flex flex-col items-center justify-center p-6 md:p-12" style={{ background: '#faf8ff' }}>
          {/* Mobile Header */}
          <div className="md:hidden flex flex-col items-center mb-12">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #003c71, #00a8cc)' }}
            >
              <span className="text-2xl font-black text-white">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: '#00264c' }}>Axis Max Life</h1>
          </div>

          <div className="w-full max-w-md">
            {/* Heading Area */}
            <div className="mb-10 text-left">
              <h3 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: '#1a1b20' }}>Welcome back</h3>
              <p className="font-medium" style={{ color: '#42474f' }}>Sign in to access your dashboard</p>
            </div>

            {/* Form Card */}
            <div
              className="rounded-[20px] p-8"
              style={{
                background: '#ffffff',
                boxShadow: '0px 12px 32px rgba(0,60,113,0.06)',
                border: '1px solid rgba(195,198,209,0.2)'
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold ml-1" style={{ color: '#42474f' }} htmlFor="email">Work Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5" style={{ color: '#737780' }} />
                    </div>
                    <input
                      className="w-full pl-12 pr-4 py-3.5 border-none rounded-xl transition-all outline-none focus:ring-2"
                      style={{ background: '#e9e7ee', color: '#1a1b20' }}
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-sm font-semibold" style={{ color: '#42474f' }} htmlFor="password">Password</label>
                    <Link
                      className="text-sm font-bold transition-colors hover:opacity-80"
                      style={{ color: '#00264c' }}
                      href="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5" style={{ color: '#737780' }} />
                    </div>
                    <input
                      className="w-full pl-12 pr-12 py-3.5 border-none rounded-xl transition-all outline-none focus:ring-2"
                      style={{ background: '#e9e7ee', color: '#1a1b20' }}
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      className="absolute inset-y-0 right-0 pr-4 flex items-center hover:opacity-80"
                      style={{ color: '#737780' }}
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  className="w-full py-4 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:opacity-95 transition-all transform active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #003c71, #00a8cc)' }}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footer Text */}
            <div className="mt-10 text-center">
              <p className="text-sm font-medium" style={{ color: '#42474f' }}>
                Don&apos;t have an account?{' '}
                <a
                  className="font-bold hover:underline ml-1"
                  style={{ color: '#00264c' }}
                  href="mailto:admin@axismaxlife.com"
                >
                  Contact your administrator
                </a>
              </p>
            </div>

            {/* Bottom Metadata */}
            <div className="mt-20 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: 'rgba(195,198,209,0.3)' }}>
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#737780' }}> 2024 Axis Max Life</span>
              <div className="flex gap-6">
                <a className="text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-colors" style={{ color: '#737780' }} href="#">Privacy</a>
                <a className="text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-colors" style={{ color: '#737780' }} href="#">Terms</a>
                <a className="text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-colors" style={{ color: '#737780' }} href="#">Help</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
