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

  // Add SS modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAthleteId, setAddAthleteId] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addPreview, setAddPreview] = useState<any>(null);

  async function load() {
    setError("");
    setMessage("");
    try {
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

  // Look up athlete by ID before confirming promotion
  async function handleLookupAthlete(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddPreview(null);
    setAddLoading(true);
    try {
      const results = await api(`/api/admin/users/search?uniqueId=${addAthleteId.trim()}`);
      const found = results.find((u: any) => u.uniqueId.toLowerCase() === addAthleteId.trim().toLowerCase());
      if (!found) {
        setAddError("No athlete found with that Athletic ID. Please check and try again.");
        return;
      }
      if (found.role === "SUPER_ADMIN") {
        setAddError(`${found.fullName} already has Sports Secretary access.`);
        return;
      }
      setAddPreview(found);
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleConfirmPromote() {
    if (!addPreview) return;
    setAddLoading(true);
    setAddError("");
    try {
      await api(`/api/admin/users/${addPreview.id}/promote-to-ss`, { method: "POST" });
      setMessage(`${addPreview.fullName} has been granted Sports Secretary access.`);
      setShowAddModal(false);
      setAddAthleteId("");
      setAddPreview(null);
      await load();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  function handleCloseAddModal() {
    setShowAddModal(false);
    setAddAthleteId("");
    setAddPreview(null);
    setAddError("");
  }

  async function handleRemoveSS(userId: string, userName: string) {
    if (!confirm(`Remove Sports Secretary access from ${userName}? They will be reverted to Student Athlete.`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/demote-from-ss`, {
        method: "POST"
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

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1 text-white">Sports Secretaries</h1>
          <p className="text-white/50 text-sm">
            Only these users have admin dashboard access. Captains do <span className="text-white/80 font-medium">not</span> automatically get admin access.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Sports Secretary
        </button>
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
                    SS Admin
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
              </div>
              <p className="text-[10px] text-white/25 mt-3 text-right">Click for full details →</p>
            </button>
          ))}

          {secretaries.length === 0 && (
            <div className="md:col-span-3 stat-card text-center py-10 text-white/40">
              No Sports Secretaries found.
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setSelectedUser(null)}>
          <div
            className="bg-surface border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
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

            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Contact</p>
                <p className="text-white text-xs">{selectedUser.email}</p>
                <p className="text-white/60 mt-1 text-xs">{selectedUser.mobileNumber}</p>
              </div>
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Academic</p>
                <p className="text-white text-xs">{selectedUser.department}</p>
                <p className="text-white/60 mt-1 text-xs">Year {selectedUser.academicYear} · Roll {selectedUser.rollNumber}</p>
              </div>
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Personal</p>
                <p className="text-white text-xs">Gender: {selectedUser.gender || "N/A"}</p>
                <p className="text-white/60 mt-1 text-xs">Blood Group: {selectedUser.bloodGroup || "N/A"}</p>
              </div>
              <div className="stat-card">
                <p className="text-white/30 text-xs font-semibold mb-1 uppercase tracking-wider">Account</p>
                <p className="text-white text-xs capitalize">{selectedUser.status?.toLowerCase()}</p>
                <p className="text-white/60 mt-1 text-xs">
                  Since {new Date(selectedUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {currentUser?.id !== selectedUser.id && selectedUser.uniqueId !== "KX000001" ? (
              <button
                onClick={() => handleRemoveSS(selectedUser.id, selectedUser.fullName)}
                className="w-full btn-primary bg-red-600 hover:bg-red-500 text-sm py-3"
              >
                Remove Sports Secretary Access
              </button>
            ) : (
              <p className="text-center text-xs text-white/30 mt-2 py-3 border border-white/5 rounded-lg bg-white/5">
                Cannot remove access from your own or the primary admin account.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Add Sports Secretary Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={handleCloseAddModal}>
          <div
            className="bg-surface border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-bold text-white text-xl">Add Sports Secretary</h2>
              <button onClick={handleCloseAddModal} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-white/50 mb-6">
              Enter the Athletic ID of the athlete you want to grant Sports Secretary (admin) access to.
            </p>

            {addError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
                {addError}
              </div>
            )}

            {/* Step 1: Enter ID */}
            {!addPreview && (
              <form onSubmit={handleLookupAthlete} className="space-y-4">
                <label className="block">
                  <span className="label">Athletic ID</span>
                  <input
                    id="add-ss-athlete-id"
                    className="input-field font-mono tracking-wider"
                    placeholder="e.g. KX240001"
                    value={addAthleteId}
                    onChange={(e) => setAddAthleteId(e.target.value.toUpperCase())}
                    required
                    autoFocus
                  />
                </label>
                <button type="submit" disabled={addLoading} className="btn-gold w-full">
                  {addLoading ? "Looking up..." : "Find Athlete →"}
                </button>
              </form>
            )}

            {/* Step 2: Confirm */}
            {addPreview && (
              <div className="space-y-4">
                <div className="stat-card border border-gold/20 bg-gold/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">
                      {addPreview.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{addPreview.fullName}</p>
                      <p className="text-xs text-white/40">{addPreview.uniqueId}</p>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 space-y-1 border-t border-white/5 pt-3">
                    <p>📧 {addPreview.email}</p>
                    <p>🏛️ {addPreview.department} · Year {addPreview.academicYear}</p>
                    <p>📋 Roll No: {addPreview.rollNumber}</p>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs rounded-lg px-4 py-3">
                  ⚠️ Granting SS access will allow this athlete to access the full Admin Dashboard, manage all sports, approve registrations, and post college-wide announcements.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setAddPreview(null); setAddAthleteId(""); setAddError(""); }}
                    className="btn-back flex-1 justify-center"
                  >
                    ← Change ID
                  </button>
                  <button
                    onClick={handleConfirmPromote}
                    disabled={addLoading}
                    className="btn-gold flex-1"
                  >
                    {addLoading ? "Granting..." : "Confirm & Grant Access"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
