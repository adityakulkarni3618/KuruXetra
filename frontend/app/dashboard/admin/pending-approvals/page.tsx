"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminPendingApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const p = await api("/api/admin/pending-users");
      setPendingUsers(p);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const backup = [...pendingUsers];
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${id}/approve`, { method: "POST" });
      setMessage("User registration approved successfully.");
      await load();
    } catch (err: any) {
      setPendingUsers(backup);
      setError(err.message);
    }
  }

  async function reject(id: string) {
    if (!confirm("Are you sure you want to reject this registration? It will delete their pending request.")) return;
    const backup = [...pendingUsers];
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${id}/reject`, { method: "DELETE" });
      setMessage("User registration rejected.");
      await load();
    } catch (err: any) {
      setPendingUsers(backup);
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading pending registrations...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="text-xs text-gold hover:underline">
          &larr; Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1 text-white">Pending Approvals</h1>
        <p className="text-white/50 text-sm">Review and activate new student athlete accounts waiting to join KuruXetra.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="space-y-4">
        {pendingUsers.map((user) => (
          <div key={user.id} className="stat-card border border-white/5 hover:border-gold/20 transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-lg text-white">{user.fullName}</p>
                <p className="text-xs text-white/40 mt-1">
                  Roll No: {user.rollNumber} · {user.department} · Year: {user.academicYear} · DOB: {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "N/A"}
                </p>
                <div className="text-xs text-white/50 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Email: {user.email}</span>
                  <span>Mobile: {user.mobileNumber}</span>
                  <span>Goal: {user.fitnessGoal || "None"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(user.id)} className="btn-gold text-xs px-4 py-2">Approve</button>
                <button onClick={() => reject(user.id)} className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-4 py-2">Reject</button>
              </div>
            </div>
          </div>
        ))}
        {pendingUsers.length === 0 && <p className="text-sm text-white/40">No registrations waiting for approval.</p>}
      </div>
    </div>
  );
}
