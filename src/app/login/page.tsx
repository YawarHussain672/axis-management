"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mail, Lock, Eye, EyeOff, Loader2, Printer } from "lucide-react"
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
    <div className="min-h-screen flex">
      {/* Left Side - Brand Hero */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-linear-to-br from-[#003c71] via-[#002a52] to-[#001f3d]">
        {/* Abstract Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Glass Card */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 max-w-lg">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Printer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Axis Max Life</h1>
                <p className="text-blue-200 text-sm">Print Management</p>
              </div>
            </div>

            {/* Hero Text */}
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Streamline Your<br />
              <span className="text-blue-300">Print Operations</span>
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Manage print projects, track approvals, and monitor deliveries across 480+ locations with precision and ease.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 mt-8">
              <span className="px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm backdrop-blur-sm border border-white/10">
                Project Management
              </span>
              <span className="px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm backdrop-blur-sm border border-white/10">
                Real-time Tracking
              </span>
              <span className="px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm backdrop-blur-sm border border-white/10">
                Approval Workflow
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-[#faf8ff] p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo (visible only on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#003c71] flex items-center justify-center">
              <Printer className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#131b2e]">Axis Max Life</h1>
              <p className="text-[#42474f] text-xs">Print Management</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-[#003c71]/5 border border-[#e3e1e8] overflow-hidden">
            <div className="p-8">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#131b2e] mb-2">Welcome back</h2>
                <p className="text-[#42474f]">Sign in to access your dashboard</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-[#131b2e]">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#737780]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-12 h-12 bg-[#f4f3fa] border-0 focus:bg-white focus:ring-2 focus:ring-[#003c71]/20 rounded-xl text-[#131b2e] placeholder:text-[#737780]"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-[#131b2e]">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#737780]" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-12 pr-12 h-12 bg-[#f4f3fa] border-0 focus:bg-white focus:ring-2 focus:ring-[#003c71]/20 rounded-xl text-[#131b2e] placeholder:text-[#737780]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#42474f] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#003c71] hover:text-[#002a52] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#003c71] hover:bg-[#002a52] text-white font-semibold rounded-xl shadow-lg shadow-[#003c71]/20 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-[#e3e1e8]">
                <p className="text-center text-sm text-[#42474f]">
                  Don&apos;t have an account?{' '}
                  <Link href="#" className="font-medium text-[#003c71] hover:text-[#002a52] transition-colors">
                    Contact your administrator
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Text */}
          <p className="text-center text-xs text-[#737780] mt-6">
            © 2024 Axis Max Life. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
