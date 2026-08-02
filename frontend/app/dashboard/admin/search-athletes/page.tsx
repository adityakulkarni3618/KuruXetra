"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function AdminSearchAthletesPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useState({
    uniqueId: "",
    name: "",
    rollNumber: "",
    department: "",
    academicYear: "",
    passoutYear: "",
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const q = new URLSearchParams();
      Object.keys(searchParams).forEach((k) => {
        const val = (searchParams as any)[k];
        if (val) q.set(k, val);
      });
      const res = await api(`/api/admin/users/search?${q.toString()}`);
      setSearchResults(res);
      if (res.length === 0) {
        setMessage("No athletes found matching criteria.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  async function toggleStatus(userId: string, currentStatus: string) {
    setError("");
    setMessage("");
    const newStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setMessage(`User account is now ${newStatus}.`);
      setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function resetPassword(userId: string) {
    setError("");
    setMessage("");
    try {
      const res = await api(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
      setMessage(`Password reset. Temporary password is: ${res.temporaryPassword}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function awardChampion(userId: string) {
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/award-badge`, {
        method: "POST",
        body: JSON.stringify({ badgeName: "Champion" }),
      });
      setMessage("Champion badge awarded successfully.");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeProfile(userId: string) {
    if (!confirm("Are you sure you want to permanently delete this user profile?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/remove-profile`, { method: "DELETE" });
      setMessage("Profile permanently deleted.");
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1 text-white">Search Athlete Database</h1>
        <p className="text-white/50 text-sm">Query full user profiles, reset passwords, suspend, or promote athletes.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <form onSubmit={handleSearch} className="stat-card grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <label className="block">
          <span className="label text-xs">Athlete ID</span>
          <input className="input-field text-xs" value={searchParams.uniqueId} onChange={(e) => setSearchParams({ ...searchParams, uniqueId: e.target.value })} placeholder="e.g. KX000001" />
        </label>
        <label className="block">
          <span className="label text-xs">Full Name</span>
          <input className="input-field text-xs" value={searchParams.name} onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })} placeholder="e.g. Aditya" />
        </label>
        <label className="block">
          <span className="label text-xs">Roll Number</span>
          <input className="input-field text-xs" value={searchParams.rollNumber} onChange={(e) => setSearchParams({ ...searchParams, rollNumber: e.target.value })} placeholder="e.g. 21B" />
        </label>
        <label className="block">
          <span className="label text-xs">Department</span>
          <input className="input-field text-xs" value={searchParams.department} onChange={(e) => setSearchParams({ ...searchParams, department: e.target.value })} placeholder="e.g. CSE" />
        </label>
        <label className="block">
          <span className="label text-xs">Academic Year</span>
          <input className="input-field text-xs" value={searchParams.academicYear} onChange={(e) => setSearchParams({ ...searchParams, academicYear: e.target.value })} placeholder="e.g. 3" />
        </label>
        <label className="block flex items-end">
          <button type="submit" disabled={loading} className="btn-gold text-xs px-4 py-2 w-full">
            {loading ? "Searching..." : "Search"}
          </button>
        </label>
      </form>

      <div className="space-y-4">
        {searchResults.map((user) => (
          <div key={user.id} className="stat-card border border-white/5 hover:border-gold/15 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt={user.fullName}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-white/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-surface-light border border-dashed border-white/10 flex items-center justify-center text-white/20 shrink-0 text-xs">
                    No pic
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-lg text-white">{user.fullName}</p>
                    <span className="text-white/30 text-sm">({user.uniqueId})</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      user.role === "SUPER_ADMIN" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                      user.role === "CAPTAIN" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                      "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}>
                      {user.role === "SUPER_ADMIN" ? "Sports Secretary" : user.role === "CAPTAIN" ? "Captain" : "Athlete"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      user.status === "ACTIVE" ? "bg-green-500/20 text-green-300" :
                      user.status === "SUSPENDED" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"
                    }`}>{user.status}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {user.department} · {user.academicYear} · Roll No: {user.rollNumber}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {currentUser?.id !== user.id && user.uniqueId !== "KX000001" && (
                  <>
                    <button onClick={() => toggleStatus(user.id, user.status)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      user.status === "SUSPENDED" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"
                    }`}>{user.status === "SUSPENDED" ? "Activate Account" : "Suspend Account"}</button>
                    <button onClick={() => resetPassword(user.id)} className="btn-primary bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5">Reset Password</button>
                  </>
                )}
                {user.status === "ACTIVE" && (
                  <button onClick={() => awardChampion(user.id)} className="btn-primary bg-purple-600 hover:bg-purple-500 text-xs px-3 py-1.5">Award Champion</button>
                )}
                {currentUser?.id !== user.id && user.uniqueId !== "KX000001" && (
                  <button onClick={() => removeProfile(user.id)} className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5">Remove Profile</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-white/5 pt-3 text-white/60 mt-4">
              <div>
                <p className="text-white/30 font-semibold mb-0.5">Contact Details</p>
                <p>{user.email}</p>
                <p className="mt-0.5">{user.mobileNumber}</p>
              </div>
              <div>
                <p className="text-white/30 font-semibold mb-0.5">Personal Info</p>
                <p>Gender: {user.gender || "N/A"}</p>
                <p className="mt-0.5">Blood Group: {user.bloodGroup || "N/A"}</p>
              </div>
              <div>
                <p className="text-white/30 font-semibold mb-0.5">Fitness & DOB</p>
                <p>DOB: {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                <p className="mt-0.5">Goal: {user.fitnessGoal || "None"}</p>
              </div>
              <div>
                <p className="text-white/30 font-semibold mb-0.5">Documents & Photo</p>
                <div className="flex flex-col gap-1 mt-0.5">
                  {user.profilePhotoUrl ? (
                    <a href={user.profilePhotoUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">View Photo</a>
                  ) : <span>No Photo</span>}
                  {user.studentIdCardUrl || user.collegeIdUrl ? (
                    <a href={user.studentIdCardUrl || user.collegeIdUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">View ID Card</a>
                  ) : <span>No ID Card</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
