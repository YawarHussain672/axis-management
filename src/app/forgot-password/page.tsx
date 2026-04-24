"use client"

import { useState } from "react"
import Link from "next/link"
import { Printer, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error("Please enter your email"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        toast.error("Something went wrong. Please try again.")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-page">
      <div className="forgot-container">
        {/* Logo Header */}
        <div className="forgot-header">
          <div className="forgot-logo">
            <Printer className="forgot-logo-icon" />
          </div>
          <h1 className="forgot-title">Axis Max Life</h1>
          <p className="forgot-subtitle">Print Management System</p>
        </div>

        {/* Form Card */}
        <div className="forgot-card">
          {sent ? (
            <div className="forgot-success">
              <div className="forgot-success-icon">
                <CheckCircle className="forgot-check-icon" />
              </div>
              <h2 className="forgot-card-title">Check your email</h2>
              <p className="forgot-card-text">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link href="/login" className="forgot-link">
                <ArrowLeft className="forgot-link-icon" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="forgot-card-title">Forgot your password?</h2>
              <p className="forgot-card-text">Enter your email and we&apos;ll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="forgot-form">
                <div className="forgot-field">
                  <label className="forgot-label">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@axismaxlife.com"
                    className="forgot-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="forgot-submit"
                >
                  {loading ? <><Loader2 className="forgot-spinner" />Sending...</> : "Send Reset Link"}
                </button>
              </form>

              <div className="forgot-back">
                <Link href="/login" className="forgot-link">
                  <ArrowLeft className="forgot-link-icon" /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
