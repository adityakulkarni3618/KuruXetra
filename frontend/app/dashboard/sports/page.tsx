"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SportsPage() {
  const { user } = useAuth();
  const [sports, setSports] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [selectedSport, setSelectedSport] = useState<any>(null);
  const [sportDetail, setSportDetail] = useState<{
    sessions: any[];
    announcements: any[];
    meetings: any[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logStates, setLogStates] = useState<Record<string, { value: string; completed: boolean; submitted: boolean }>>({});

  async function load() {
    const [s, m] = await Promise.all([api("/api/sports"), api("/api/auth/me")]);
    setSports(s);
    setMe(m);
  }
  useEffect(() => { load(); }, []);

  async function join(sportId: string) {
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/join`, { method: "POST" });
      setMessage("Request sent — waiting on captain approval.");
      await load();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function openSportDetail(sport: any) {
    setSelectedSport(sport);
    setDetailLoading(true);
    setSportDetail(null);
    try {
      const [sessions, announcements, meetings] = await Promise.all([
        api(`/api/admin-features/sessions?sportId=${sport.id}`),
        api(`/api/admin-features/announcements?sportId=${sport.id}`),
        api(`/api/admin-features/meetings?sportId=${sport.id}`),
      ]);
      setSportDetail({ sessions, announcements, meetings });
    } catch {}
    setDetailLoading(false);
  }

  async function logExercise(sessionId: string, workoutId: string, exerciseName: string, rounds: boolean) {
    const key = `${sessionId}-${workoutId}`;
    const state = logStates[key] || { value: "", completed: false, submitted: false };
    try {
      await api(`/api/admin-features/sessions/${sessionId}/logs`, {
        method: "POST",
        body: JSON.stringify({
          sessionWorkoutId: workoutId,
          completed: true,
          value: rounds && state.value ? parseFloat(state.value) : undefined,
        }),
      });
      setLogStates((prev) => ({ ...prev, [key]: { ...state, submitted: true } }));
      setMessage(`Logged: ${exerciseName}`);
      // Refresh
      if (selectedSport) openSportDetail(selectedSport);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  const myMembershipIds = new Set((me?.memberships || []).map((m: any) => m.sportId));
  const myApprovedSportIds = new Set(
    (me?.memberships || []).filter((m: any) => m.status === "APPROVED").map((m: any) => m.sportId)
  );

  // Build chronological activity feed (sessions + meetings + announcements) newest first
  function buildFeed(detail: NonNullable<typeof sportDetail>) {
    const items: any[] = [];
    detail.sessions.forEach((s) => items.push({ type: "session", date: new Date(s.startTime), data: s }));
    detail.meetings.forEach((m) => items.push({ type: "meeting", date: new Date(m.scheduledAt), data: m }));
    detail.announcements.forEach((a) => items.push({ type: "announcement", date: new Date(a.createdAt), data: a }));
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return (
    <div>
      {!selectedSport ? (
        // ── Sports List ──────────────────────────────────────────────────────
        <>
          <h1 className="font-display text-2xl font-bold mb-1">Sports</h1>
          <p className="text-white/50 text-sm mb-6">Join a team. Your captain will approve or reject the request.</p>
          {message && <div className="bg-blue/10 border border-blue/30 text-blue-light text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}
          <div className="grid md:grid-cols-2 gap-4">
            {sports.filter((s) => s.isActive !== false).map((s) => {
              const joined = myMembershipIds.has(s.id);
              const approved = myApprovedSportIds.has(s.id);
              return (
                <div key={s.id} className="stat-card hover:border-gold/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-semibold text-white">{s.teamName || s.name}</h3>
                      {s.teamName && <p className="text-xs text-white/40 mt-0.5">{s.name}</p>}
                      <p className="text-xs text-white/40 mt-1">{s._count?.memberships ?? 0} members</p>
                    </div>
                    {s.captain && <span className="text-xs text-gold">Captain: {s.captain.fullName}</span>}
                  </div>
                  {s.description && <p className="text-sm text-white/50 mt-3">{s.description}</p>}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => join(s.id)}
                      disabled={joined}
                      className="btn-primary text-sm disabled:opacity-40"
                    >
                      {approved ? "Joined" : joined ? "Requested" : "Request to join"}
                    </button>
                    {approved && (
                      <button
                        onClick={() => openSportDetail(s)}
                        className="btn-back text-sm"
                      >
                        View Team Feed →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        // ── Sport Detail / Activity Feed ─────────────────────────────────────
        <div>
          <div className="mb-6">
            <button onClick={() => { setSelectedSport(null); setSportDetail(null); setMessage(""); }} className="btn-back">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Sports
            </button>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-white">{selectedSport.teamName || selectedSport.name}</h1>
            {selectedSport.teamName && <p className="text-white/40 text-sm">{selectedSport.name}</p>}
            <p className="text-white/50 text-sm mt-1">Team activity feed — latest first</p>
          </div>

          {message && <div className="bg-blue/10 border border-blue/30 text-blue-light text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

          {detailLoading && <div className="text-white/40 text-center py-10">Loading team feed...</div>}

          {sportDetail && !detailLoading && (
            <div className="space-y-4 max-w-2xl">
              {buildFeed(sportDetail).map((item, idx) => {
                if (item.type === "announcement") {
                  return (
                    <div key={idx} className="stat-card border border-blue/10 hover:border-blue/20 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue/20 text-blue-300 border border-blue/30">
                          📢 Announcement
                        </span>
                        <span className="text-xs text-white/30">{item.date.toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-display font-semibold text-white">{item.data.title}</h3>
                      <p className="text-sm text-white/60 mt-2 whitespace-pre-wrap">{item.data.body}</p>
                    </div>
                  );
                }

                if (item.type === "meeting") {
                  return (
                    <div key={idx} className="stat-card border border-purple-500/10 hover:border-purple-500/20 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          🗓 Meeting
                        </span>
                        <span className="text-xs text-white/30">{item.date.toLocaleString()}</span>
                      </div>
                      <h3 className="font-display font-semibold text-white">{item.data.title}</h3>
                      {item.data.description && (
                        <p className="text-sm text-white/60 mt-2">{item.data.description}</p>
                      )}
                    </div>
                  );
                }

                if (item.type === "session") {
                  const sess = item.data;
                  const isActive = sess.status === "ACTIVE";
                  const myLogs = sess.athleteLogs?.filter((l: any) => l.user.id === me?.id) || [];
                  const myLogMap: Record<string, any> = {};
                  myLogs.forEach((l: any) => {
                    const name = l.customExerciseName || l.workoutType?.name || "";
                    myLogMap[name] = l;
                  });

                  return (
                    <div key={idx} className={`stat-card transition-all ${isActive ? "border-green-500/20 hover:border-green-500/30" : "border-white/5 hover:border-white/10"}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          isActive ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-white/10 text-white/40 border-white/10"
                        }`}>
                          ⚡ Session {isActive ? "· Active" : "· Ended"}
                        </span>
                        <span className="text-xs text-white/30">{item.date.toLocaleString()}</span>
                      </div>
                      <h3 className="font-display font-semibold text-white mb-3">{sess.title}</h3>

                      {sess.workouts.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-white/40 font-semibold uppercase mb-2">Exercises</p>
                          {sess.workouts.map((w: any) => {
                            const exName = w.customName || w.workoutType?.name || "Exercise";
                            const key = `${sess.id}-${w.id}`;
                            const myLog = myLogMap[exName];
                            const localState = logStates[key] || { value: "", completed: false, submitted: false };
                            const alreadyLogged = !!myLog || localState.submitted;

                            return (
                              <div key={w.id} className="bg-surface/60 rounded-lg border border-white/5 p-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div>
                                    <p className="text-sm font-medium text-white">{exName}</p>
                                    {w.rounds && <p className="text-xs text-white/40">Rounds tracked</p>}
                                  </div>

                                  {isActive && !alreadyLogged ? (
                                    <div className="flex items-center gap-2">
                                      {w.rounds && (
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder="Rounds"
                                          className="input-field text-xs w-20 py-1.5"
                                          value={localState.value}
                                          onChange={(e) => setLogStates((prev) => ({
                                            ...prev,
                                            [key]: { ...localState, value: e.target.value }
                                          }))}
                                        />
                                      )}
                                      <button
                                        onClick={() => logExercise(sess.id, w.id, exName, w.rounds)}
                                        className="btn-gold text-xs px-3 py-1.5"
                                      >
                                        Mark Done ✓
                                      </button>
                                    </div>
                                  ) : alreadyLogged ? (
                                    <div className="text-right">
                                      <span className={`text-xs font-bold ${
                                        myLog?.status === "APPROVED" ? "text-green-400" :
                                        myLog?.status === "REJECTED" ? "text-red-400" : "text-gold"
                                      }`}>
                                        {myLog?.status === "APPROVED" ? "✓ Approved" :
                                         myLog?.status === "REJECTED" ? "✗ Rejected" : "✓ Submitted"}
                                      </span>
                                      {myLog?.value && <p className="text-xs text-white/40">{myLog.value} rounds</p>}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-white/30">Session ended</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}

              {buildFeed(sportDetail).length === 0 && (
                <div className="stat-card text-center py-10 text-white/40">
                  No team activity yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
