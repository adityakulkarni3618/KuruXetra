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
  const [sessionCheckInStates, setSessionCheckInStates] = useState<Record<string, { checkInTime: string; loading: boolean }>>({});
  const [globalMessage, setGlobalMessage] = useState("");

  const [exploreSport, setExploreSport] = useState<any>(null);
  const [exploreDetail, setExploreDetail] = useState<{
    sessions: any[];
    announcements: any[];
    meetings: any[];
  } | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);

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

  async function leave(sportId: string) {
    if (!confirm("Are you sure you want to leave this team?")) return;
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/leave`, { method: "POST" });
      setMessage("Successfully left the team.");
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

  async function openExploreDetail(sport: any) {
    setExploreSport(sport);
    setExploreLoading(true);
    setExploreDetail(null);
    try {
      const [sessions, announcements, meetings] = await Promise.all([
        api(`/api/admin-features/sessions?sportId=${sport.id}`),
        api(`/api/admin-features/announcements?sportId=${sport.id}`),
        api(`/api/admin-features/meetings?sportId=${sport.id}`),
      ]);
      setExploreDetail({ sessions, announcements, meetings });
    } catch {}
    setExploreLoading(false);
  }

  async function handleSessionCheckIn(sessionId: string) {
    setSessionCheckInStates(prev => ({ ...prev, [sessionId]: { checkInTime: "", loading: true } }));
    setGlobalMessage("");
    try {
      // Find if we already have an attendance record for this session's sport or general
      // We will check in via the standard check-in endpoint passing the sportId
      const sportId = selectedSport?.id;
      const res = await api("/api/attendance/checkin", {
        method: "POST",
        body: JSON.stringify({ sportId, isSession: true }),
      });
      setSessionCheckInStates(prev => ({
        ...prev,
        [sessionId]: { checkInTime: new Date(res.timeIn).toLocaleTimeString(), loading: false }
      }));
      setGlobalMessage("Successfully checked in for this conditioning session!");
      await load();
    } catch (err: any) {
      setGlobalMessage(err.message || "Failed to check in.");
      setSessionCheckInStates(prev => ({ ...prev, [sessionId]: { checkInTime: "", loading: false } }));
    }
  }

  async function logExercise(sessionId: string, workoutId: string, exerciseName: string, _rounds: boolean) {
    const key = `${sessionId}-${workoutId}`;
    const state = logStates[key] || { value: "", completed: false, submitted: false };
    const parsedValue = state.value ? parseFloat(state.value) : undefined;

    if (parsedValue === undefined || Number.isNaN(parsedValue)) {
      setMessage("Please enter a valid number before submitting.");
      return;
    }

    try {
      await api(`/api/admin-features/sessions/${sessionId}/logs`, {
        method: "POST",
        body: JSON.stringify({
          sessionWorkoutId: workoutId,
          completed: true,
          value: parsedValue,
        }),
      });
      setLogStates((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] ?? { value: "", completed: false, submitted: false }),
          value: "",
          submitted: true,
        },
      }));
      setMessage(`Logged: ${exerciseName}`);
      if (selectedSport) openSportDetail(selectedSport);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  const myMembershipIds = new Set((me?.memberships || []).map((m: any) => m.sportId));
  const myApprovedSportIds = new Set(
    (me?.memberships || []).filter((m: any) => m.status === "APPROVED").map((m: any) => m.sportId)
  );

  const joinedSports = sports.filter(s => s.isActive !== false && myApprovedSportIds.has(s.id));
  const otherSports = sports.filter(s => s.isActive !== false && !myApprovedSportIds.has(s.id));

  // Build chronological activity feed (sessions + meetings + announcements) newest first
  function buildFeed(detail: NonNullable<typeof sportDetail>) {
    const items: any[] = [];
    detail.sessions.forEach((s) => items.push({ type: "session", date: new Date(s.startTime), data: s }));
    detail.meetings.forEach((m) => items.push({ type: "meeting", date: new Date(m.scheduledAt), data: m }));
    detail.announcements.forEach((a) => items.push({ type: "announcement", date: new Date(a.createdAt), data: a }));
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Reminders check: find any active meetings scheduled in the future or active sessions
  const futureReminders: any[] = [];
  if (sportDetail) {
    const now = new Date();
    sportDetail.meetings.forEach((m) => {
      const meetTime = new Date(m.scheduledAt);
      if (meetTime > now && m.status !== "ENDED") {
        futureReminders.push({ type: "meeting", title: m.title, time: meetTime });
      }
    });
    sportDetail.sessions.forEach((s) => {
      if (s.status === "ACTIVE") {
        futureReminders.push({ type: "session", title: s.title, time: new Date(s.startTime) });
      }
    });
  }

  return (
    <div>
      {!selectedSport && !exploreSport ? (
        // ── Sports List Main Layout ──────────────────────────────────────────
        <>
          <h1 className="font-display text-2xl font-bold mb-1">Sports & Teams</h1>
          <p className="text-white/50 text-sm mb-6">View your active teams or explore new sports to request to join.</p>
          {message && <div className="bg-blue/10 border border-blue/30 text-blue-light text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

          {/* Joined Sports Section */}
          <div className="mb-8">
            <h2 className="font-display font-semibold text-lg text-white mb-4">My Sports Teams</h2>
            {joinedSports.length === 0 ? (
              <div className="stat-card text-white/40 text-center py-6 text-sm">
                You have not joined any sports teams yet. Explore sports below to submit a join request.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {joinedSports.map((s) => (
                  <div key={s.id} className="stat-card border border-gold/15 hover:border-gold/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-display font-semibold text-white text-lg">{s.teamName || s.name}</h3>
                        {s.teamName && <p className="text-xs text-white/40 mt-0.5">{s.name}</p>}
                        <p className="text-xs text-white/40 mt-2">{s._count?.memberships ?? 0} members</p>
                      </div>
                      {s.captain && (
                        <div className="text-right">
                          <span className="text-xs text-gold">Captain: {s.captain.fullName}</span>
                          {s.practiceTime && <p className="text-[10px] text-white/30 mt-1">⏰ {s.practiceTime}</p>}
                        </div>
                      )}
                    </div>
                    {s.description && <p className="text-sm text-white/50 mt-3">{s.description}</p>}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => openSportDetail(s)}
                        className="btn-gold text-xs px-4 py-2"
                      >
                        View Team Feed & Reminders &rarr;
                      </button>
                      <button
                        onClick={() => leave(s.id)}
                        className="btn-primary bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 text-xs px-4 py-2"
                      >
                        Leave Team
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Explore More Sports Section Card Trigger */}
          <div className="mt-8">
            <h2 className="font-display font-semibold text-lg text-white mb-4">Explore More Sports</h2>
            <div className="stat-card border border-gold/15 bg-gold/5 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-gold/30 transition-all">
              <div>
                <h3 className="font-display font-semibold text-white text-lg">Browse & Request to Join Other Sports</h3>
                <p className="text-xs text-white/50 mt-1">Explore all other available college sports teams, view locations, schedules, and send join requests.</p>
              </div>
              <button
                onClick={() => setExploreSport({ id: "all_list" })}
                className="btn-gold text-xs px-6 py-3 shrink-0"
              >
                Explore Other Sports &rarr;
              </button>
            </div>
          </div>
        </>
      ) : exploreSport && exploreSport.id === "all_list" ? (
        // ── Explore Sports Grid List Sub-Page ──
        <div>
          <div className="mb-6">
            <button onClick={() => { setExploreSport(null); setExploreDetail(null); }} className="btn-back">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Sports & Teams
            </button>
          </div>

          <h2 className="font-display font-bold text-2xl text-white mb-2">Explore Other Sports</h2>
          <p className="text-white/50 text-sm mb-6">Find and explore college sports you haven't joined yet.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherSports.map((s) => {
              const joined = myMembershipIds.has(s.id);
              return (
                <div key={s.id} className="stat-card border border-white/5 hover:border-gold/15 transition-all opacity-95 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col gap-1">
                      <div>
                        <h3 className="font-display font-semibold text-white text-lg leading-tight">{s.teamName || s.name}</h3>
                        {s.teamName && <p className="text-xs text-white/40 mt-0.5">{s.name}</p>}
                      </div>
                      {s.captain && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-white/40 font-medium">Captain:</span>
                          <span className="text-xs text-gold font-semibold break-words leading-relaxed">{s.captain.fullName}</span>
                        </div>
                      )}
                    </div>
                    {s.description && <p className="text-xs text-white/50 mt-3 line-clamp-3">{s.description}</p>}
                  </div>
                  <div className="flex gap-2 mt-6 flex-wrap">
                    <button
                      onClick={() => openExploreDetail(s)}
                      className="btn-gold text-xs px-3 py-1.5 flex-1 justify-center"
                    >
                      Explore Sport
                    </button>
                    <button
                      onClick={() => join(s.id)}
                      disabled={joined}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40 flex-1 justify-center"
                    >
                      {joined ? "Join Requested" : "Request to join"}
                    </button>
                  </div>
                </div>
              );
            })}
            {otherSports.length === 0 && (
              <div className="col-span-full text-white/40 text-center py-6 text-sm">
                No other sports available to join.
              </div>
            )}
          </div>
        </div>
      ) : exploreSport ? (
        // ── Explore Sport Detail Page ─────────────────────────────────────────
        <div>
          <div className="mb-6">
            <button onClick={() => { setExploreSport(null); setExploreDetail(null); setMessage(""); }} className="btn-back">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Sports & Teams
            </button>
          </div>

          <div className="mb-6 pb-6 border-b border-white/5">
            <h1 className="font-display text-3xl font-bold text-white">{exploreSport.teamName || exploreSport.name}</h1>
            {exploreSport.teamName && <p className="text-white/40 text-sm mt-0.5">{exploreSport.name}</p>}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-white/50">
              {exploreSport.captain && <p>👑 Captain: <span className="text-white font-medium">{exploreSport.captain.fullName}</span></p>}
              {exploreSport.ground && <p>📍 Location: <span className="text-white font-medium">{exploreSport.ground}</span></p>}
              {exploreSport.practiceTime && <p>⏰ Practice Time: <span className="text-white font-medium">{exploreSport.practiceTime}</span></p>}
            </div>
            <div className="mt-4">
              <button
                onClick={() => join(exploreSport.id)}
                disabled={myMembershipIds.has(exploreSport.id)}
                className="btn-gold text-sm px-6 py-2"
              >
                {myMembershipIds.has(exploreSport.id) ? "Join Request Submitted" : "Send Join Request"}
              </button>
            </div>
          </div>

          {exploreLoading && <div className="text-white/40 text-center py-10">Loading team feed...</div>}

          {exploreDetail && !exploreLoading && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Chronological Feed Column */}
              <div className="md:col-span-2 space-y-4">
                <h2 className="font-display font-semibold text-lg text-white mb-2 font-medium">Team Activity Preview</h2>
                {buildFeed(exploreDetail).filter(item => item.type === "announcement").map((item, idx) => {
                  return (
                    <div key={idx} className="stat-card border border-blue/10 opacity-75">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue/20 text-blue-300">📢 Announcement</span>
                        <span className="text-xs text-white/30">{item.date.toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-display font-semibold text-white">{item.data.title}</h3>
                      <p className="text-xs text-white/50 mt-2 whitespace-pre-wrap">{item.data.body}</p>
                    </div>
                  );
                })}
                {buildFeed(exploreDetail).filter(item => item.type === "announcement").length === 0 && (
                  <p className="text-sm text-white/30 italic">No public announcements available.</p>
                )}
              </div>

              {/* Explore Details & Announcements Sidebar */}
              <div className="space-y-4">
                <div className="stat-card border border-gold/15 bg-gold/5">
                  <h3 className="font-display font-semibold text-white text-sm mb-2">About {exploreSport.teamName || exploreSport.name}</h3>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                    {exploreSport.customAbout || "No custom info provided by captain yet."}
                  </p>
                </div>

                {exploreSport.customNotice && (
                  <div className="stat-card border border-blue/15 bg-blue/5">
                    <h3 className="font-display font-semibold text-white text-sm mb-1">📢 Important Notice</h3>
                    <p className="text-xs text-white/80 leading-relaxed font-semibold">
                      {exploreSport.customNotice}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // ── Sport Detail / Activity Feed & Reminders ─────────────────────────
        <div>
          <div className="mb-6">
            <button onClick={() => { setSelectedSport(null); setSportDetail(null); setMessage(""); setGlobalMessage(""); }} className="btn-back">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Sports & Teams
            </button>
          </div>

          <div className="flex justify-between items-start mb-6 pb-6 border-b border-white/5 flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{selectedSport.teamName || selectedSport.name}</h1>
              {selectedSport.teamName && <p className="text-white/40 text-sm mt-0.5">{selectedSport.name}</p>}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-white/50">
                {selectedSport.captain && <p>👑 Captain: <span className="text-white font-medium">{selectedSport.captain.fullName}</span></p>}
                {selectedSport.ground && <p>📍 Location: <span className="text-white font-medium">{selectedSport.ground}</span></p>}
                {selectedSport.practiceTime && <p>⏰ practice Time: <span className="text-white font-medium">{selectedSport.practiceTime}</span></p>}
              </div>
            </div>
            <button
              onClick={async () => {
                await leave(selectedSport.id);
                setSelectedSport(null);
                setSportDetail(null);
              }}
              className="btn-primary bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 text-xs px-4 py-2 shrink-0 self-start"
            >
              Leave Team
            </button>
          </div>

          {globalMessage && <div className="bg-blue/10 border border-blue/30 text-blue-light text-sm rounded-lg px-4 py-3 mb-6">{globalMessage}</div>}
          {message && <div className="bg-blue/10 border border-blue/30 text-blue-light text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

          {detailLoading && <div className="text-white/40 text-center py-10">Loading team feed...</div>}

          {sportDetail && !detailLoading && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Chronological Feed Column */}
              <div className="md:col-span-2 space-y-4">
                <h2 className="font-display font-semibold text-lg text-white mb-2">Team Activity Feed</h2>
                
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
                    const isMeetingEnded = item.data.status === "ENDED";
                    return (
                      <div key={idx} className="stat-card border border-purple-500/10 hover:border-purple-500/20 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            !isMeetingEnded ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-white/5 text-white/40 border-white/10"
                          }`}>
                            🗓 Meeting {!isMeetingEnded ? "· Active" : "· Ended"}
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
                    const checkInState = sessionCheckInStates[sess.id] || { checkInTime: "", loading: false };

                    return (
                      <div key={idx} className={`stat-card transition-all ${isActive ? "border-green-500/20 hover:border-green-500/30" : "border-white/5 hover:border-white/10"}`}>
                        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              isActive ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-white/10 text-white/40 border-white/10"
                            }`}>
                              ⚡ Session {isActive ? "· Active" : "· Ended"}
                            </span>
                            <span className="text-xs text-white/30">Scheduled: {item.date.toLocaleString()}</span>
                          </div>
                          
                          {/* Manual Session Check-In Button */}
                          {isActive && (
                            <div>
                              {checkInState.checkInTime ? (
                                <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-1 rounded">
                                  Checked In at {checkInState.checkInTime}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={checkInState.loading}
                                  onClick={() => handleSessionCheckIn(sess.id)}
                                  className="text-xs text-gold border border-gold/25 bg-gold/5 px-2.5 py-1 rounded hover:bg-gold/15 transition-all font-semibold"
                                >
                                  {checkInState.loading ? "Checking in..." : "Check In for Session"}
                                </button>
                              )}
                            </div>
                          )}
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
                                    <p className="text-sm font-medium text-white">{exName}</p>

                                    {isActive && !alreadyLogged ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder="How many?"
                                          className="input-field text-xs w-28 py-1.5"
                                          value={localState.value}
                                          onChange={(e) => setLogStates((prev) => ({
                                            ...prev,
                                            [key]: {
                                              ...(prev[key] ?? { value: "", completed: false, submitted: false }),
                                              value: e.target.value,
                                            },
                                          }))}
                                        />
                                        <button
                                          onClick={() => logExercise(sess.id, w.id, exName, true)}
                                          disabled={!localState.value}
                                          className="btn-gold text-xs px-3 py-1.5 disabled:opacity-40"
                                        >
                                          Submit ✓
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
                                        {myLog?.value && <p className="text-xs text-white/40">{myLog.value} completed</p>}
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

              {/* Reminders & Info Sidebar Column */}
              <div className="space-y-4">
                <h2 className="font-display font-semibold text-lg text-white mb-2">Reminders & Notices</h2>
                
                {futureReminders.length === 0 ? (
                  <div className="stat-card text-white/40 text-center py-6 text-xs">
                    No upcoming meetings or active sessions. All clear!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {futureReminders.map((rem, i) => (
                      <div key={i} className={`stat-card border ${
                        rem.type === "session" ? "border-green-500/20 bg-green-500/5" : "border-purple-500/20 bg-purple-500/5"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full animate-pulse bg-gold" />
                          <span className="text-[10px] font-bold uppercase text-gold">UPCOMING {rem.type}</span>
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{rem.title}</p>
                        <p className="text-xs text-white/40 mt-1">
                          {rem.time.toLocaleDateString()} at {rem.time.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
