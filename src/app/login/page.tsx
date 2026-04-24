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
    <div className="login-split-container">
      {/* LEFT SIDE: Blue Branding Section */}
      <section className="login-left-side">
        {/* Grid Pattern Overlay */}
        <div className="login-hero-grid" />

        {/* Decorative Blur Elements */}
        <div className="login-blur-1" />
        <div className="login-blur-2" />

        {/* Content */}
        <div className="login-left-content">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <span>A</span>
            </div>
            <div className="login-logo-text">
              <h1>Axis Max Life</h1>
              <p>Print Management</p>
            </div>
          </div>

          {/* Hero Headline */}
          <h2 className="login-headline">
            Streamline Your<br />
            <span className="login-headline-accent">Print Operations</span>
          </h2>

          {/* Feature Pills */}
          <div className="login-pills">
            <span className="login-pill">Project Management</span>
            <span className="login-pill">Real-time Tracking</span>
            <span className="login-pill">Approval Workflow</span>
          </div>
        </div>
      </section>

      {/* RIGHT SIDE: Login Form Section */}
      <section className="login-right-side">
        <div className="login-right-content">
          {/* Mobile Logo (hidden on desktop) */}
          <div className="login-mobile-header">
            <div className="login-logo-icon">
              <span>A</span>
            </div>
            <h1>Axis Max Life</h1>
          </div>

          {/* Welcome Text */}
          <div className="login-welcome">
            <h3>Welcome back</h3>
            <p>Sign in to access your dashboard</p>
          </div>

          {/* Form Card */}
          <div className="login-card">
            <form onSubmit={handleSubmit} className="login-form">
              {/* Email Field */}
              <div className="login-field">
                <label className="login-label" htmlFor="email">
                  Work Email
                </label>
                <div className="login-input-wrap">
                  <div className="login-input-icon">
                    <Mail className="login-icon-svg" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="login-input"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="login-field">
                <div className="login-label-row">
                  <label className="login-label" htmlFor="password">
                    Password
                  </label>
                  <Link href="/forgot-password" className="login-forgot">
                    Forgot password?
                  </Link>
                </div>
                <div className="login-input-wrap">
                  <div className="login-input-icon">
                    <Lock className="login-icon-svg" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="login-input login-input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-eye-btn"
                  >
                    {showPassword ? <EyeOff className="login-icon-svg" /> : <Eye className="login-icon-svg" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="login-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="login-icon-svg" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Admin Link */}
          <p className="login-contact">
            Don&apos;t have an account?{' '}
            <a href="mailto:admin@axismaxlife.com" className="login-contact-link">
              Contact your administrator
            </a>
          </p>

          {/* Footer (desktop only) */}
          <footer className="login-footer">
            <div className="login-footer-inner">
              <span>© 2024 Axis Max Life</span>
              <div className="login-footer-links">
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Help</a>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  )
}
