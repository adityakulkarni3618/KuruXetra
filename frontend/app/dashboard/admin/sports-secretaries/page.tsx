"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function SportSecretariesPage() {
  const { user: currentUser } = useAuth();
  const [secretaries, setSecretaries] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      // Fetch all users with SUPER_ADMIN role via search
      const res = await api("/api/admin/users/search?role=SUPER_ADMIN");
      setSecretaries(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function demoteSS(userId: string, userName: string) {
    if (!confirm(`Remove Sports Secretary access from ${userName}? They will be demoted to Student Athlete.`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ role: "STUDENT_ATHLETE" }),
      });
      setMessage(`${userName} has been removed from Sports Secretary role.`);
      setSelectedUser(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1 text-white">Sports Secretaries</h1>
        <p className="text-white/50 text-sm">
          All users with Sports Secretary (Admin) access. Only these users can access the admin dashboard.
        </p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      {loading ? (
        <div className="text-white/40 text-center py-10">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {secretaries.map((ss) => (
            <button
              key={ss.id}
              onClick={() => setSelectedUser(selectedUser?.id === ss.id ? null : ss)}
              className={`stat-card text-left w-full transition-all duration-200 hover:border-gold/30 ${
                selectedUser?.id === ss.id ? "border-gold/40 bg-gold/5" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display font-semibold text-white text-lg leading-tight">{ss.fullName}</p>
                  <p className="text-xs text-white/40 mt-0.5">{ss.uniqueId}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                    Sports Secretary
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    ss.status === "ACTIVE" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                  }`}>
                    {ss.status}
                  </span>
                </div>
              </div>

              <div className="text-xs text-white/50 space-y-1 border-t border-white/5 pt-3">
                <p>📧 {ss.email}</p>
                <p>📱 {ss.mobileNumber}</p>
                <p>🏛️ {ss.department} · Year {ss.academicYear}</p>
                <p>🎓 Roll No: {ss.rollNumber}</p>
              </div>
            </button>
          ))}

          {secretaries.length === 0 && (
            <div className="md:col-span-3 stat-card text-center py-10 text-white/40">
              No Sports Secretaries found.
            </div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setSelectedUser(null)}>
          <div
            className="bg-surface border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-white text-2xl">{selectedUser.fullName}</h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                    SS Admin
                  </span>
                </div>
                <p className="text-white/40 text-sm">{selectedUser.uniqueId}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-white/40 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Contact</p>
                <p className="text-white">{selectedUser.email}</p>
                <p className="text-white/60 mt-1">{selectedUser.mobileNumber}</p>
              </div>
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Academic</p>
                <p className="text-white">{selectedUser.department}</p>
                <p className="text-white/60 mt-1">Year {selectedUser.academicYear} · Roll {selectedUser.rollNumber}</p>
              </div>
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Personal</p>
                <p className="text-white">Gender: {selectedUser.gender || "N/A"}</p>
                <p className="text-white/60 mt-1">Blood Group: {selectedUser.bloodGroup || "N/A"}</p>
              </div>
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Account</p>
                <p className="text-white capitalize">{selectedUser.status?.toLowerCase()}</p>
                <p className="text-white/60 mt-1">
                  Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {currentUser?.id !== selectedUser.id && selectedUser.uniqueId !== "KX000001" && (
              <button
                onClick={() => demoteSS(selectedUser.id, selectedUser.fullName)}
                className="w-full btn-primary bg-red-600 hover:bg-red-500 text-sm py-3"
              >
                Remove Sports Secretary Access
              </button>
            )}
            {(currentUser?.id === selectedUser.id || selectedUser.uniqueId === "KX000001") && (
              <p className="text-center text-xs text-white/30 mt-2">Cannot remove access for this account.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
