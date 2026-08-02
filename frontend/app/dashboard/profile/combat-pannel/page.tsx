"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function CombatPanelPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [headedSports, setHeadedSports] = useState<any[]>([]);
  const [delegatedSports, setDelegatedSports] = useState<any[]>([]);

  // Sub-head delegation state
  const [selectedSportIdForSub, setSelectedSportIdForSub] = useState("");
  const [subHeadUniqueId, setSubHeadUniqueId] = useState("");
  const [submittingSubHead, setSubmittingSubHead] = useState(false);

  // Match scheduling state
  const [selectedSportIdForMatch, setSelectedSportIdForMatch] = useState("");
  const [deptA, setDeptA] = useState("");
  const [deptB, setDeptB] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submittingMatch, setSubmittingMatch] = useState(false);

  // Score keeping editing states
  const [editingMatchId, setEditingMatchId] = useState("");
  const [scoreText, setScoreText] = useState("");
  const [matchStatus, setMatchStatus] = useState("");
  const [winnerDept, setWinnerDept] = useState("");
  const [submittingScore, setSubmittingScore] = useState(false);

  const departments = [
    "Computer Engineering",
    "Information Technology",
    "Electronics & Telecommunication",
    "Mechanical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
  ];

  useEffect(() => {
    loadMyCombatData();
  }, []);

  async function loadMyCombatData() {
    try {
      const data = await api("/api/combat/my-managed-sports");
      setHeadedSports(data.headed || []);
      setDelegatedSports(data.delegated || []);
      if (data.headed && data.headed.length > 0) {
        setSelectedSportIdForSub(data.headed[0].id);
        setSelectedSportIdForMatch(data.headed[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load managed sports");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubHead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSportIdForSub || !subHeadUniqueId.trim()) return;
    setSubmittingSubHead(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/combat/sports/${selectedSportIdForSub}/subheads`, {
        method: "POST",
        body: JSON.stringify({ subHeadUniqueId })
      });
      setMessage("Scorekeeper sub-head delegated successfully!");
      setSubHeadUniqueId("");
      loadMyCombatData();
    } catch (err: any) {
      setError(err.message || "Failed to delegate sub-head");
    } finally {
      setSubmittingSubHead(false);
    }
  }

  async function handleScheduleMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSportIdForMatch || !deptA || !deptB || !scheduledAt) return;
    if (deptA === deptB) {
      setError("Matches must be scheduled between different departments");
      return;
    }
    setSubmittingMatch(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/combat/sports/${selectedSportIdForMatch}/matches`, {
        method: "POST",
        body: JSON.stringify({ deptA, deptB, scheduledAt })
      });
      setMessage("Department match scheduled successfully!");
      setDeptA("");
      setDeptB("");
      setScheduledAt("");
      loadMyCombatData();
    } catch (err: any) {
      setError(err.message || "Failed to schedule match");
    } finally {
      setSubmittingMatch(false);
    }
  }

  async function handleUpdateScore(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMatchId || !scoreText.trim()) return;
    setSubmittingScore(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/combat/matches/${editingMatchId}/score`, {
        method: "PATCH",
        body: JSON.stringify({
          scoreText,
          status: matchStatus || undefined,
          winnerDept: winnerDept || undefined
        })
      });
      setMessage("Scoreboard updated successfully!");
      setEditingMatchId("");
      setScoreText("");
      setMatchStatus("");
      setWinnerDept("");
      loadMyCombatData();
    } catch (err: any) {
      setError(err.message || "Failed to update score text");
    } finally {
      setSubmittingScore(false);
    }
  }

  if (loading) {
    return <div className="text-white/50 text-xs italic p-6">Loading managed tournament sports...</div>;
  }

  const hasAccess = headedSports.length > 0 || delegatedSports.length > 0;

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/profile" className="btn-back">
          &larr; Back to Profile
        </Link>
      </div>

      <h1 className="font-display text-3xl font-bold mb-1 text-white">Sport Head Match Center</h1>
      <p className="text-white/50 text-sm mb-8">Schedule department matches, assign scoring delegates, and push real-time score updates.</p>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 rounded-lg mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/20 text-green-300 text-xs p-3 rounded-lg mb-6">{message}</div>}

      {!hasAccess ? (
        <div className="stat-card text-center py-8">
          <p className="text-xs text-white/40 italic">You are not registered as a Sport Head or delegated Scorekeeper in any active Combat Event.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Action Columns for Sport Head controls */}
          <div className="md:col-span-1 space-y-6">
            {headedSports.length > 0 && (
              <>
                {/* Delegate Sub-Heads */}
                <div className="stat-card">
                  <h2 className="font-semibold text-white mb-3 text-sm">Delegate Scorekeepers</h2>
                  <p className="text-[10px] text-white/50 mb-3">Assign sub-head scorekeepers who can update matches in real-time.</p>
                  <form onSubmit={handleAddSubHead} className="space-y-3">
                    <label className="block">
                      <span className="label text-[10px]">Select Managed Sport</span>
                      <select
                        className="input-field text-xs bg-surface"
                        value={selectedSportIdForSub}
                        onChange={(e) => setSelectedSportIdForSub(e.target.value)}
                      >
                        {headedSports.map((sp) => <option key={sp.id} value={sp.id}>{sp.sportName}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="label text-[10px]">Scorekeeper Athletic ID</span>
                      <input
                        className="input-field text-xs"
                        placeholder="e.g. KX24123071"
                        value={subHeadUniqueId}
                        onChange={(e) => setSubHeadUniqueId(e.target.value)}
                        required
                      />
                    </label>

                    <button type="submit" disabled={submittingSubHead} className="btn-gold text-xs w-full py-2">
                      {submittingSubHead ? "Delegating..." : "Assign Scorekeeper"}
                    </button>
                  </form>
                </div>

                {/* Schedule Department Matches */}
                <div className="stat-card">
                  <h2 className="font-semibold text-white mb-3 text-sm">Schedule Match</h2>
                  <p className="text-[10px] text-white/50 mb-3">Setup a new match between departments.</p>
                  <form onSubmit={handleScheduleMatch} className="space-y-3">
                    <label className="block">
                      <span className="label text-[10px]">Select Sport</span>
                      <select
                        className="input-field text-xs bg-surface"
                        value={selectedSportIdForMatch}
                        onChange={(e) => setSelectedSportIdForMatch(e.target.value)}
                      >
                        {headedSports.map((sp) => <option key={sp.id} value={sp.id}>{sp.sportName}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="label text-[10px]">Department A</span>
                      <select className="input-field text-xs bg-surface" value={deptA} onChange={(e) => setDeptA(e.target.value)} required>
                        <option value="">Select Team A</option>
                        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="label text-[10px]">Department B</span>
                      <select className="input-field text-xs bg-surface" value={deptB} onChange={(e) => setDeptB(e.target.value)} required>
                        <option value="">Select Team B</option>
                        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="label text-[10px]">Date & Time</span>
                      <input
                        type="datetime-local"
                        className="input-field text-xs bg-surface"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        required
                      />
                    </label>

                    <button type="submit" disabled={submittingMatch} className="btn-gold text-xs w-full py-2">
                      {submittingMatch ? "Scheduling..." : "Schedule Match"}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>

          {/* Matches List Pane to update live scores */}
          <div className="md:col-span-2 space-y-6">
            {/* Direct Score Entry Editor Modal overlay when active */}
            {editingMatchId && (
              <div className="stat-card border border-gold/30 bg-gold/5 p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-white text-xs">Update Live Score Center</h3>
                  <button type="button" onClick={() => setEditingMatchId("")} className="text-white/40 hover:text-white text-xs">Cancel</button>
                </div>
                <form onSubmit={handleUpdateScore} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block sm:col-span-2">
                    <span className="label text-[10px]">Score / Progress Text</span>
                    <input
                      className="input-field text-xs"
                      placeholder="e.g. Over 4.2: CS 42/1 (Chase 120)"
                      value={scoreText}
                      onChange={(e) => setScoreText(e.target.value)}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="label text-[10px]">Match Status</span>
                    <select className="input-field text-xs bg-surface" value={matchStatus} onChange={(e) => setMatchStatus(e.target.value)}>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="LIVE">Live Now</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="label text-[10px]">Winner Department (Optional)</span>
                    <select className="input-field text-xs bg-surface" value={winnerDept} onChange={(e) => setWinnerDept(e.target.value)}>
                      <option value="">No winner declared</option>
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>

                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" disabled={submittingScore} className="btn-gold text-xs px-6 py-2">
                      {submittingScore ? "Updating..." : "Save Score Update"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List headed sports matches */}
            {headedSports.length > 0 && (
              <div className="stat-card">
                <h2 className="font-semibold text-white mb-4 text-sm">Matches Schedulers & Scorers</h2>
                <div className="space-y-4">
                  {headedSports.map((sp) => (
                    <div key={sp.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <h3 className="font-bold text-xs text-gold mb-2">{sp.sportName} Matches</h3>
                      {(!sp.matches || sp.matches.length === 0) ? (
                        <p className="text-[10px] text-white/30 italic">No matches scheduled for this sport.</p>
                      ) : (
                        <div className="space-y-2">
                          {sp.matches.map((m: any) => (
                            <div key={m.id} className="bg-surface/50 border border-white/5 rounded-lg p-2.5 flex justify-between items-center text-xs flex-wrap gap-2">
                              <div>
                                <span className="font-semibold text-white">{m.deptA} vs {m.deptB}</span>
                                <span className="text-[10px] text-white/40 block mt-0.5">Time: {new Date(m.scheduledAt).toLocaleString()}</span>
                                <span className="text-[10px] text-gold/80 block font-medium mt-0.5">Score: "{m.currentScore}"</span>
                              </div>
                              <div className="flex gap-2">
                                <span className={`text-[9px] uppercase font-bold py-0.5 px-2 rounded ${
                                  m.status === "LIVE" ? "bg-red-500/10 text-red-400" : m.status === "COMPLETED" ? "bg-white/10 text-white/50" : "bg-blue/10 text-blue-400"
                                }`}>
                                  {m.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMatchId(m.id);
                                    setScoreText(m.currentScore || "");
                                    setMatchStatus(m.status);
                                    setWinnerDept(m.winnerDept || "");
                                  }}
                                  className="text-[10px] text-gold hover:underline"
                                >
                                  Update Score
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List delegated scorekeeper matches */}
            {delegatedSports.length > 0 && (
              <div className="stat-card">
                <h2 className="font-semibold text-white mb-4 text-sm">Delegated Match Scorekeeper Center</h2>
                <div className="space-y-4">
                  {delegatedSports.map((sp) => (
                    <div key={sp.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <h3 className="font-bold text-xs text-blue-400 mb-2">{sp.sportName} (Scorekeeper Access)</h3>
                      {(!sp.matches || sp.matches.length === 0) ? (
                        <p className="text-[10px] text-white/30 italic">No matches active for scorekeeping.</p>
                      ) : (
                        <div className="space-y-2">
                          {sp.matches.map((m: any) => (
                            <div key={m.id} className="bg-surface/50 border border-white/5 rounded-lg p-2.5 flex justify-between items-center text-xs flex-wrap gap-2">
                              <div>
                                <span className="font-semibold text-white">{m.deptA} vs {m.deptB}</span>
                                <span className="text-[10px] text-white/40 block mt-0.5">Score: "{m.currentScore}"</span>
                              </div>
                              <div className="flex gap-2">
                                <span className={`text-[9px] uppercase font-bold py-0.5 px-2 rounded ${
                                  m.status === "LIVE" ? "bg-red-500/10 text-red-400" : m.status === "COMPLETED" ? "bg-white/10 text-white/50" : "bg-blue/10 text-blue-400"
                                }`}>
                                  {m.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMatchId(m.id);
                                    setScoreText(m.currentScore || "");
                                    setMatchStatus(m.status);
                                    setWinnerDept(m.winnerDept || "");
                                  }}
                                  className="text-[10px] text-gold hover:underline"
                                >
                                  Update Score
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
