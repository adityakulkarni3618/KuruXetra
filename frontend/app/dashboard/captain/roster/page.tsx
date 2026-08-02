"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function CaptainRosterPage() {
  const [mySport, setMySport] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
      const sport = sports.find((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
      setMySport(sport);
      if (sport) {
        const mems = await api(`/api/sports/${sport.id}/members`);
        setMembers(mems);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(membershipId: string, decision: "APPROVED" | "REJECTED") {
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/memberships/${membershipId}/review`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setMessage("Membership decision saved.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeMember(membershipId: string) {
    if (!confirm("Are you sure you want to remove this athlete?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/memberships/${membershipId}/remove-member`, {
        method: "POST",
      });
      setMessage("Athlete removed from team roster.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function awardBadge(userId: string, badgeName: "MVP" | "Team Leader") {
    if (!confirm(`Are you sure you want to award the ${badgeName} badge?`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${mySport.id}/award-badge`, {
        method: "POST",
        body: JSON.stringify({ userId, badgeName }),
      });
      setMessage(`${badgeName} badge awarded successfully.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleExportCSV() {
    const dataToExport = approved.map((m) => ({
      "Athlete ID": m.user.uniqueId,
      "Full Name": m.user.fullName,
      "Email Address": m.user.email,
      "Department": m.user.department,
      "Roll Number": m.user.rollNumber,
    }));
    exportToCSV(dataToExport, `${mySport.name}_Roster`);
  }

  function handleExportPDF() {
    const headers = ["Athlete ID", "Full Name", "Email Address", "Department", "Roll Number"];
    const rows = approved.map((m) => [
      m.user.uniqueId,
      m.user.fullName,
      m.user.email,
      m.user.department,
      m.user.rollNumber,
    ]);
    printReport(`${mySport.name} - Official Team Roster`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading roster...</div>;
  }

  const approved = members.filter((m) => m.status === "APPROVED");
  const pending = members.filter((m) => m.status === "PENDING");

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/captain" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Team Roster</h1>
          <p className="text-white/50 text-sm">Manage roster memberships and review join requests for {mySport?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <h2 className="font-display font-semibold mb-3 text-white">Pending Requests ({pending.length})</h2>
      <div className="space-y-2 mb-8">
        {pending.map((m) => (
          <div key={m.id} className="stat-card flex justify-between items-center">
            <div className="flex items-center gap-4">
              {m.user.profilePhotoUrl ? (
                <img
                  src={m.user.profilePhotoUrl}
                  alt={m.user.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-light border border-dashed border-white/10 flex items-center justify-center text-white/20 shrink-0 text-xs">
                  No pic
                </div>
              )}
              <div>
                <p className="font-medium text-white">{m.user.fullName} <span className="text-white/30 text-xs">({m.user.uniqueId})</span></p>
                <p className="text-xs text-white/40">{m.user.department} · Roll No: {m.user.rollNumber}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => review(m.id, "APPROVED")} className="btn-gold text-xs px-3 py-1.5">Approve</button>
              <button onClick={() => review(m.id, "REJECTED")} className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5">Reject</button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-sm text-white/40">No pending requests.</p>}
      </div>

      <h2 className="font-display font-semibold mb-3 text-white">Approved Members ({approved.length})</h2>
      <div className="space-y-3">
        {approved.map((m) => (
          <div key={m.id} className="stat-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {m.user.profilePhotoUrl ? (
                <img
                  src={m.user.profilePhotoUrl}
                  alt={m.user.fullName}
                  className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface-light border border-dashed border-white/10 flex items-center justify-center text-white/20 shrink-0 text-xs">
                  No pic
                </div>
              )}
              <div>
                <p className="font-medium text-white">{m.user.fullName} <span className="text-white/30 text-xs">({m.user.uniqueId})</span></p>
                <p className="text-xs text-white/40">{m.user.department} · Roll No: {m.user.rollNumber} · {m.user.email}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => awardBadge(m.user.id, "MVP")} className="btn-primary bg-purple-600 hover:bg-purple-500 text-xs px-3 py-1.5">Award MVP</button>
              <button onClick={() => awardBadge(m.user.id, "Team Leader")} className="btn-primary bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5">Award Leader</button>
              <button onClick={() => removeMember(m.id)} className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5">Remove</button>
            </div>
          </div>
        ))}
        {approved.length === 0 && <p className="text-sm text-white/40">No approved members on roster yet.</p>}
      </div>
    </div>
  );
}
