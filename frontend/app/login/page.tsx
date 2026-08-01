"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [uniqueId, setUniqueId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="font-display text-2xl font-bold mb-1">
          KURUXETRA<span className="text-gold">.</span>
        </div>
        <p className="text-white/50 text-sm mb-8">Log in to check in and track your training.</p>

        {error && (
          <div className={`border rounded-lg px-4 py-3 mb-6 text-sm ${
            error.toLowerCase().includes("pending approval")
              ? "bg-gold/10 border-gold/40 text-gold"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}>
            {error.toLowerCase().includes("pending approval") ? (
              <div>
                <p className="font-semibold mb-1">Approval Pending</p>
                <p className="text-xs text-white/60">Your athlete profile is registered but is currently awaiting Sports Secretary approval. Please try again once verified.</p>
              </div>
            ) : error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="label">Athletic ID</span>
            <input className="input-field" placeholder="e.g. KX240001" value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-white/40 mt-6 text-center">
          New here? <Link href="/register" className="text-blue-light">Register</Link>
        </p>
      </div>
    </main>
  );
}
