"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type ForgotStep = "idle" | "email" | "otp" | "success";

export default function LoginPage() {
  const { login } = useAuth();

  // Login state
  const [uniqueId, setUniqueId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep>("idle");
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpError, setFpError] = useState("");
  const [fpMessage, setFpMessage] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(uniqueId, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    setFpError("");
    setFpMessage("");
    setFpLoading(true);
    try {
      const res = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: fpEmail }),
      });
      setFpMessage(res.message || "OTP sent. Check your email (or server console for dev).");
      setForgotStep("otp");
    } catch (err: any) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  }

  async function handleForgotSubmitOtp(e: React.FormEvent) {
    e.preventDefault();
    setFpError("");
    setFpLoading(true);
    try {
      const res = await api("/api/auth/reset-password-otp", {
        method: "POST",
        body: JSON.stringify({
          email: fpEmail,
          otp: fpOtp,
          newPassword: fpNewPassword,
          confirmPassword: fpConfirmPassword,
        }),
      });
      setFpMessage(res.message || "Password reset successfully!");
      setForgotStep("success");
    } catch (err: any) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  }

  function closeForgot() {
    setForgotStep("idle");
    setFpEmail("");
    setFpOtp("");
    setFpNewPassword("");
    setFpConfirmPassword("");
    setFpError("");
    setFpMessage("");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors mb-6">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        <div className="font-display text-2xl font-bold mb-1">
          KURUXETRA<span className="text-gold">.</span>
        </div>
        <p className="text-white/50 text-sm mb-8">Log in to check in and track your training.</p>

        {error && (
          <div
            className={`border rounded-lg px-4 py-3 mb-6 text-sm ${
              error.toLowerCase().includes("pending approval")
                ? "bg-gold/10 border-gold/40 text-gold"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {error.toLowerCase().includes("pending approval") ? (
              <div>
                <p className="font-semibold mb-1">Approval Pending</p>
                <p className="text-xs text-white/60">
                  Your athlete profile is registered but is currently awaiting Sports Secretary approval. Please try again once verified.
                </p>
              </div>
            ) : (
              error
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="label">Athletic ID</span>
            <input
              id="login-unique-id"
              className="input-field"
              placeholder="e.g. KX240001"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              id="login-password"
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setForgotStep("email")}
              className="text-xs text-blue-light hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <button type="submit" id="login-submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-white/40 mt-6 text-center">
          New here? <Link href="/register" className="text-blue-light">Register</Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {forgotStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-surface border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-bold text-white text-xl">Reset Password</h2>
              <button onClick={closeForgot} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {fpError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
                {fpError}
              </div>
            )}
            {fpMessage && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-4">
                {fpMessage}
              </div>
            )}

            {forgotStep === "email" && (
              <form onSubmit={handleForgotSubmitEmail} className="space-y-4">
                <p className="text-sm text-white/60 mb-4">Enter your registered email address. An OTP will be sent to it.</p>
                <label className="block">
                  <span className="label">Email Address</span>
                  <input
                    id="fp-email"
                    className="input-field"
                    type="email"
                    placeholder="your@email.com"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" id="fp-send-otp" disabled={fpLoading} className="btn-primary w-full">
                  {fpLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            )}

            {forgotStep === "otp" && (
              <form onSubmit={handleForgotSubmitOtp} className="space-y-4">
                <p className="text-sm text-white/60 mb-2">
                  Enter the 6-digit OTP sent to <span className="text-white font-medium">{fpEmail}</span> and choose a new password.
                </p>
                <label className="block">
                  <span className="label">OTP Code</span>
                  <input
                    id="fp-otp"
                    className="input-field tracking-widest text-center text-lg font-mono"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </label>
                <label className="block">
                  <span className="label">New Password</span>
                  <input
                    id="fp-new-password"
                    className="input-field"
                    type="password"
                    placeholder="Min 6 characters"
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="label">Confirm New Password</span>
                  <input
                    id="fp-confirm-password"
                    className="input-field"
                    type="password"
                    placeholder="Repeat password"
                    value={fpConfirmPassword}
                    onChange={(e) => setFpConfirmPassword(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" id="fp-reset-submit" disabled={fpLoading} className="btn-primary w-full">
                  {fpLoading ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotStep("email")}
                  className="text-xs text-white/40 hover:text-white/70 w-full text-center"
                >
                  ← Change email
                </button>
              </form>
            )}

            {forgotStep === "success" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Password Reset!</p>
                <p className="text-white/60 text-sm">You can now log in with your new password.</p>
                <button onClick={closeForgot} className="btn-primary w-full">
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
