"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function AdminSportRosterPage() {
  const { id: sportId } = useParams() as { id: string };
  const [sport, setSport] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [captainSearchId, setCaptainSearchId] = useState("");
  const [viceCaptainSearchId, setViceCaptainSearchId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [sportsList, mems] = await Promise.all([
        api("/api/sports"),
        api(`/api/sports/${sportId}/members`),
      ]);
      const found = sportsList.find((s: any) => s.id === sportId);
      if (!found) {
        setError("Sport not found");
        return;
      }
      setSport(found);
      setMembers(mems);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sportId]);

  async function handleAssignCaptain(e: React.FormEvent) {
    e.preventDefault();
    if (!captainSearchId) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/captain`, {
        method: "POST",
        body: JSON.stringify({ uniqueId: captainSearchId }),
      });
      setMessage("Captain assigned successfully.");
      setCaptainSearchId("");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemoveCaptain() {
    if (!confirm("Are you sure?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/demote-captain`, { method: "POST" });
      setMessage("Captain demoted.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAssignViceCaptain(e: React.FormEvent) {
    e.preventDefault();
    if (!viceCaptainSearchId) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/vice-captain`, {
        method: "POST",
        body: JSON.stringify({ uniqueId: viceCaptainSearchId }),
      });
      setMessage("Vice-captain assigned successfully.");
      setViceCaptainSearchId("");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemoveViceCaptain() {
    if (!confirm("Are you sure?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/demote-vice-captain`, { method: "POST" });
      setMessage("Vice-captain demoted.");
      await load();
    } catch (err: any) {
      setError(err.message);
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
      await load();
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
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeProfile(userId: string) {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/remove-profile`, { method: "DELETE" });
      setMessage("Player profile permanently removed.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleExportCSV() {
    const dataToExport = approvedMembers.map((m) => ({
      "Athlete ID": m.user.uniqueId,
      "Full Name": m.user.fullName,
      "Email Address": m.user.email,
      "Department": m.user.department,
      "Roll Number": m.user.rollNumber,
      "Role": m.user.role,
    }));
    exportToCSV(dataToExport, `${sport.name}_Roster`);
  }

  function handleExportPDF() {
    const headers = ["Athlete ID", "Full Name", "Email Address", "Department", "Roll Number", "Role"];
    const rows = approvedMembers.map((m) => [
      m.user.uniqueId,
      m.user.fullName,
      m.user.email,
      m.user.department,
      m.user.rollNumber,
      m.user.role,
    ]);
    printReport(`${sport.name} - Team Roster List`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading roster...</div>;
  }

  const approvedMembers = members.filter((m) => m.status === "APPROVED");

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/admin/sports/${sportId}`} className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Sport Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Team Roster & Roles</h1>
          <p className="text-white/50 text-sm">Configure captain, vice-captain, and manage athlete profiles for {sport.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Captain Card */}
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3 text-white">Captain</h2>
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div>
              <p className="text-sm font-medium text-white">{sport.captain ? sport.captain.fullName : "Unassigned"}</p>
              {sport.captain && <p className="text-xs text-white/40">{sport.captain.uniqueId}</p>}
            </div>
            {sport.captain && (
              <button onClick={handleRemoveCaptain} className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/10 px-3 py-1.5 rounded-lg">
                Remove Captain
              </button>
            )}
          </div>
          <form onSubmit={handleAssignCaptain} className="flex gap-2">
            <input className="input-field text-xs" placeholder="Athlete ID" value={captainSearchId} onChange={(e) => setCaptainSearchId(e.target.value)} required />
            <button type="submit" className="btn-gold text-xs px-3 py-1.5 whitespace-nowrap">Assign Captain</button>
          </form>
        </div>

        {/* Vice Captain Card */}
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3 text-white">Vice-Captain</h2>
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div>
              <p className="text-sm font-medium text-white">{sport.viceCaptain ? sport.viceCaptain.fullName : "Unassigned"}</p>
              {sport.viceCaptain && <p className="text-xs text-white/40">{sport.viceCaptain.uniqueId}</p>}
            </div>
            {sport.viceCaptain && (
              <button onClick={handleRemoveViceCaptain} className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/10 px-3 py-1.5 rounded-lg">
                Remove Vice-Captain
              </button>
            )}
          </div>
          <form onSubmit={handleAssignViceCaptain} className="flex gap-2">
            <input className="input-field text-xs" placeholder="Athlete ID" value={viceCaptainSearchId} onChange={(e) => setViceCaptainSearchId(e.target.value)} required />
            <button type="submit" className="btn-gold text-xs px-3 py-1.5 whitespace-nowrap">Assign Vice-Captain</button>
          </form>
        </div>
      </div>

      <h2 className="font-display font-semibold mb-4 text-white">Team Players ({approvedMembers.length})</h2>
      <div className="space-y-4">
        {approvedMembers.map((m) => {
          const user = m.user;
          return (
            <div key={m.id} className="stat-card border border-white/5 hover:border-gold/20 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {user.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt={user.fullName}
                      className="w-12 h-12 rounded-full object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-light border border-dashed border-white/10 flex items-center justify-center text-white/20 shrink-0">
                      <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-lg text-white">{user.fullName}</p>
                      <span className="text-white/30 text-sm">({user.uniqueId})</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${user.role === "SUPER_ADMIN" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                        (sport?.captainId === user.id || sport?.viceCaptainId === user.id) ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                          "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}>
                        {user.role === "SUPER_ADMIN" ? "Sports Secretary" : sport?.captainId === user.id ? "Captain" : sport?.viceCaptainId === user.id ? "Vice-Captain" : user.role === "CAPTAIN" ? "Captain" : "Athlete"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${user.status === "ACTIVE" ? "bg-green-500/20 text-green-300" :
                        user.status === "SUSPENDED" ? "bg-red-500/20 text-red-300" :
                          "bg-yellow-500/20 text-yellow-300"
                        }`}>
                        {user.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">{user.department} · Roll No: {user.rollNumber} · {user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {user.uniqueId !== "KX000001" && (
                    <>
                      <button onClick={() => toggleStatus(user.id, user.status)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        user.status === "SUSPENDED" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"
                      }`}>{user.status === "SUSPENDED" ? "Activate" : "Suspend"}</button>
                      <button onClick={() => resetPassword(user.id)} className="btn-primary bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5">Reset PW</button>
                    </>
                  )}
                  {user.status === "ACTIVE" && (
                    <button onClick={() => awardChampion(user.id)} className="btn-primary bg-purple-600 hover:bg-purple-500 text-xs px-3 py-1.5">Award Champion</button>
                  )}
                  {user.uniqueId !== "KX000001" && (
                    <button onClick={() => removeProfile(user.id)} className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5">Delete Profile</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {approvedMembers.length === 0 && <p className="text-sm text-white/40">No team members assigned.</p>}
      </div>
    </div>
  );
}
