"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function OverviewPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  // Notifications feed (announcements, sessions, meetings)
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Status updates states
  const [statuses, setStatuses] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState<any>(null);

  // Combat matches live scoreboard state
  const [combatMatches, setCombatMatches] = useState<any[]>([]);

  async function loadStatuses() {
    try {
      const active = await api("/api/social/status/active");
      setStatuses(active);
    } catch {}
  }

  async function loadCombatMatches() {
    try {
      const scoreboards = await api("/api/combat/active-matches");
      setCombatMatches(scoreboards || []);
    } catch {}
  }

  useEffect(() => {
    api("/api/attendance/me").then(setAttendance).catch(() => {});
    api("/api/workouts/me").then(setWorkouts).catch(() => {});
    api("/api/running/me").then(setRuns).catch(() => {});
    api("/api/leaderboard").then(setLeaderboard).catch(() => {});
    loadStatuses();
    loadCombatMatches();
    
    api("/api/auth/me")
      .then((meRes) => {
        setMe(meRes);
        // Load feed items for all approved sports
        const approvedSportIds = (meRes.memberships || [])
          .filter((m: any) => m.status === "APPROVED")
          .map((m: any) => m.sportId);

        if (approvedSportIds.length > 0) {
          Promise.all(
            approvedSportIds.map(async (sportId: string) => {
              try {
                const [sessions, announcements, meetings] = await Promise.all([
                  api(`/api/admin-features/sessions?sportId=${sportId}`),
                  api(`/api/admin-features/announcements?sportId=${sportId}`),
                  api(`/api/admin-features/meetings?sportId=${sportId}`),
                ]);
                return { sportId, sessions, announcements, meetings };
              } catch {
                return { sportId, sessions: [], announcements: [], meetings: [] };
              }
            })
          ).then((results) => {
            const compiled: any[] = [];
            results.forEach((res) => {
              res.sessions.forEach((s: any) =>
                compiled.push({ type: "session", date: new Date(s.startTime), data: s })
              );
              res.meetings.forEach((m: any) =>
                compiled.push({ type: "meeting", date: new Date(m.scheduledAt), data: m })
              );
              res.announcements.forEach((a: any) =>
                compiled.push({ type: "announcement", date: new Date(a.createdAt), data: a })
              );
            });
            // Sort chronological newest first
            compiled.sort((a, b) => b.date.getTime() - a.date.getTime());
            setFeedItems(compiled);
          });
        }
      })
      .catch(() => {});
  }, []);

  // Active countdown for upcoming session or meeting
  const [countdownText, setCountdownText] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const upcoming = feedItems
        .filter((item) => item.type === "session" || item.type === "meeting")
        .map((item) => ({ title: item.data.title, date: item.date.getTime() }))
        .filter((item) => item.date > now)
        .sort((a, b) => a.date - b.date)[0];

      if (upcoming) {
        const diff = upcoming.date - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownText(`⏳ "${upcoming.title}" starts in ${hours}h ${mins}m ${secs}s`);
      } else {
        setCountdownText("");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [feedItems]);

  // Request notifications helper for Sports Secretaries
  const [notifGranted, setNotifGranted] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifGranted(Notification.permission === "granted");
      
      // Auto-trigger push alert simulation if SS user and pending approvals exist
      if (user?.role === "SUPER_ADMIN") {
        api("/api/admin/pending-users").then((pending) => {
          if (pending && pending.length > 0 && Notification.permission === "granted") {
            new Notification("Pending Registrations", {
              body: `There are ${pending.length} athlete profiles waiting for activation.`,
              icon: "/favicon.ico"
            });
          }
        }).catch(() => {});
      }
    }
  }, [user]);

  async function requestNotifPermission() {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifGranted(permission === "granted");
    }
  }

  const myRank = leaderboard.find((r) => r.id === user?.id);
  const totalDistance = runs.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
  const openCheckIn = attendance.find((a) => !a.timeOut);

  // Latest announcements for the top News Banner
  const latestAnnouncements = feedItems.filter((item) => item.type === "announcement").slice(0, 3);

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Welcome back, {user?.fullName?.split(" ")[0]}</h1>
          <p className="text-white/50 text-sm">Here's where you stand today.</p>
        </div>

        {/* SS push alert request indicator */}
        {user?.role === "SUPER_ADMIN" && !notifGranted && (
          <button
            onClick={requestNotifPermission}
            className="text-[10px] bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 px-2.5 py-1.5 rounded-lg font-bold"
          >
            🔔 Enable Registration Push Alerts
          </button>
        )}
      </div>

      {/* Countdown Alert Panel */}
      {countdownText && (
        <div className="bg-gold/10 border border-gold/35 rounded-xl p-3.5 mb-6 text-xs text-gold flex items-center justify-between animate-pulse">
          <span className="font-bold tracking-wide">{countdownText}</span>
          <span className="text-[9px] uppercase font-bold bg-gold/20 px-2 py-0.5 rounded">Upcoming</span>
        </div>
      )}

      {/* ── Statuses / Stories Bar (WhatsApp style) ── */}

      <div className="stat-card mb-8">
        <h2 className="font-display font-semibold text-white mb-3 text-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Status Updates (24h)
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide items-center">
          {statuses.map((item, idx) => {
            const hasViewed = item.views?.some((v: any) => v.viewerId === user?.id);
            return (
              <div
                key={idx}
                onClick={async () => {
                  setActiveStatus(item);
                  try {
                    await api(`/api/social/status/${item.id}/view`, { method: "POST" });
                    loadStatuses();
                  } catch {}
                }}
                className="flex flex-col items-center shrink-0 cursor-pointer text-center group"
              >
                <div className={`w-10 h-10 rounded-full border-2 p-0.5 group-hover:scale-105 transition-transform ${
                  hasViewed ? "border-white/10" : "border-green-500"
                }`}>
                  {item.user.profilePhotoUrl ? (
                    <img src={item.user.profilePhotoUrl} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-[10px] text-white/40">
                      {item.user.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-white/60 truncate max-w-[60px] mt-1">{item.user.fullName.split(" ")[0]}</span>
                {item.caption && <span className="text-[8px] text-gold/80 italic max-w-[60px] truncate font-medium">"{item.caption}"</span>}
              </div>
            );
          })}
          {statuses.length === 0 && (
            <span className="text-xs text-white/30 italic pl-2">No active statuses from teammates.</span>
          )}
        </div>
      </div>

      {/* Top News & Announcements Row (Relocated below Status Updates) */}
      {latestAnnouncements.length > 0 && (
        <div className="stat-card mb-6 border border-blue-500/20 bg-blue-500/[0.01]">
          <h2 className="font-display font-semibold text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            📢 Latest Announcements & News
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {latestAnnouncements.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedItem(item)}
                className="bg-surface/65 border border-white/5 hover:border-gold/35 p-3 rounded-lg cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-xs font-semibold text-white truncate mb-1">{item.data.title}</h3>
                  <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed">{item.data.body}</p>
                </div>
                <span className="text-[9px] text-gold font-medium mt-2 block">Read details &rarr;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications & Alerts Board (Relocated below Status Updates) */}
      <div className="stat-card mb-8">
        <h2 className="font-display font-semibold mb-3 text-white">Notifications & Alerts</h2>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {feedItems.map((item, idx) => {
            const labelMap: Record<string, { badge: string; color: string }> = {
              announcement: { badge: "📢 Announcement", color: "bg-blue/20 text-blue-300 border-blue-300/30" },
              meeting: { badge: "🗓 Meeting", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
              session: { badge: "⚡ Practice Session", color: "bg-green-500/20 text-green-300 border-green-500/30" },
            };
            const config = labelMap[item.type];
            return (
              <div
                key={idx}
                onClick={() => setSelectedItem(item)}
                className="p-3 bg-surface/50 border border-white/5 rounded-lg hover:border-gold/30 cursor-pointer transition-all flex items-start justify-between gap-3"
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
                      {config.badge}
                    </span>
                    <span className="text-[10px] text-white/30">{item.date.toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">{item.data.title || "Announcement"}</p>
                  <p className="text-[10px] text-white/50 truncate mt-0.5">
                    {item.type === "announcement" ? item.data.body : item.data.description || "View schedule details"}
                  </p>
                </div>
                <span className="text-xs text-gold shrink-0 self-center">View Details &rarr;</span>
              </div>
            );
          })}
          {feedItems.length === 0 && (
            <p className="text-xs text-white/40 italic py-4">No recent team notifications.</p>
          )}
        </div>
      </div>

      {/* Status Detail Modal */}
      {activeStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setActiveStatus(null)}>
          <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-sm text-center relative" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-3 right-3 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full border border-white/5 transition-all text-xs font-bold leading-none w-6 h-6 flex items-center justify-center" 
              onClick={() => setActiveStatus(null)}
            >
              ✕
            </button>
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold">
                <img src={activeStatus.user.profilePhotoUrl || ""} alt="" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold">{activeStatus.user.fullName}</h3>
              {activeStatus.mediaUrl && (
                activeStatus.mediaUrl.match(/\.(mp4|webm|ogg|mov|m4v)($|\?)/i) || activeStatus.mediaUrl.includes("/video/upload/") ? (
                  <video 
                    src={activeStatus.mediaUrl} 
                    controls 
                    autoPlay
                    playsInline
                    className="w-full max-h-60 rounded-lg my-2 object-contain bg-black"
                  />
                ) : (
                  <img src={activeStatus.mediaUrl} className="w-full max-h-60 rounded-lg my-2 object-contain bg-black" />
                )
              )}
              <p className="text-sm italic text-white/70">"{activeStatus.caption}"</p>
              
              <div className="w-full border-t border-white/5 mt-4 pt-4 text-left">
                <div className="text-[10px] text-white/30 mb-2">👁️ Viewed by {activeStatus.views?.length || 0} people</div>
                {activeStatus.userId === user?.id && activeStatus.views?.length > 0 && (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {activeStatus.views.map((v: any) => (
                      <div key={v.id} className="flex justify-between items-center bg-surface-light/50 p-1.5 rounded border border-white/5 text-[10px]">
                        <span className="font-semibold text-white">{v.viewer.fullName}</span>
                        <span className="text-white/40 font-mono">({v.viewer.uniqueId})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Combat Tournament Live Cricbuzz Scoreboard ── */}
      {combatMatches.length > 0 && (
        <div className="stat-card mb-8 border border-gold/10">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
            <h2 className="font-display font-semibold text-white text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              Combat Tournament matches
            </h2>
            <button onClick={loadCombatMatches} className="text-[10px] text-gold hover:underline">
              🔄 Refresh Scores
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {combatMatches.map((match) => {
              const isUserDeptA = user?.department && match.deptA.toLowerCase() === user.department.toLowerCase();
              const isUserDeptB = user?.department && match.deptB.toLowerCase() === user.department.toLowerCase();
              const isRelatedToMyDept = isUserDeptA || isUserDeptB;

              return (
                <div 
                  key={match.id} 
                  className={`bg-surface/50 border rounded-xl p-3 flex flex-col justify-between transition-all ${
                    isRelatedToMyDept ? "border-red-500/30 bg-red-500/[0.02]" : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-gold uppercase">{match.combatSport.sportName}</span>
                      {match.status === "LIVE" ? (
                        <span className="text-[9px] bg-red-500/10 text-red-400 font-bold px-1.5 py-0.5 rounded animate-pulse">
                          ● LIVE
                        </span>
                      ) : match.status === "COMPLETED" ? (
                        <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded">
                          COMPLETED
                        </span>
                      ) : (
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                          UPCOMING
                        </span>
                      )}
                    </div>

                    {/* Department Alerts Banner */}
                    {isRelatedToMyDept && user?.department && (
                      <div className="text-[8px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        📢 Your Department Match ({user.department.split(" ")[0]})
                      </div>
                    )}

                    <div className="space-y-1 my-2">
                      <div className={`flex justify-between text-xs font-semibold ${isUserDeptA ? "text-red-300 font-bold" : "text-white"}`}>
                        <span>{match.deptA}</span>
                        {match.winnerDept === match.deptA && <span className="text-gold text-[10px]">🏆 Winner</span>}
                      </div>
                      <div className="text-[10px] text-white/30 text-center font-mono py-0.5">vs</div>
                      <div className={`flex justify-between text-xs font-semibold ${isUserDeptB ? "text-red-300 font-bold" : "text-white"}`}>
                        <span>{match.deptB}</span>
                        {match.winnerDept === match.deptB && <span className="text-gold text-[10px]">🏆 Winner</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5">
                    <p className="text-[11px] font-medium text-white/80 italic font-mono bg-black/20 p-1.5 rounded">
                      {match.currentScore}
                    </p>
                    <span className="text-[9px] text-white/30 block mt-1.5">
                      Date: {new Date(match.scheduledAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Leaderboard rank" value={myRank ? `#${myRank.rank}` : "—"} />
        <Stat label="Total points" value={me ? me.totalPoints : 0} />
        <Stat label="Total runs" value={runs.length} />
        <Stat label="Distance logged" value={`${totalDistance.toFixed(1)} km`} />
      </div>

      {/* Ground Status and Notifications Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column: Status & Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="stat-card">
            <h2 className="font-display font-semibold mb-2">Ground status</h2>
            {openCheckIn ? (
              <p className="text-sm text-green-400">
                Currently checked in since {new Date(openCheckIn.timeIn).toLocaleTimeString()}
              </p>
            ) : (
              <p className="text-sm text-white/50">You're not checked in. Head to the Attendance tab when you arrive.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar: Recent Workouts & Runs */}
        <div className="space-y-6">
          <div className="stat-card">
            <h2 className="font-display font-semibold mb-3">Recent workouts</h2>
            {workouts.slice(0, 4).map((w) => (
              <div key={w.id} className="flex justify-between text-xs py-2 border-b border-border last:border-0">
                <span className="text-white truncate max-w-[140px]">{w.name}</span>
                <span className="text-white/40">{new Date(w.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {workouts.length === 0 && <p className="text-xs text-white/40">No workouts logged yet.</p>}
          </div>

          <div className="stat-card">
            <h2 className="font-display font-semibold mb-3">Recent runs</h2>
            {runs.slice(0, 4).map((r) => (
              <div key={r.id} className="flex justify-between text-xs py-2 border-b border-border last:border-0">
                <span className="text-white">{r.distanceKm} km</span>
                <span className="text-white/40">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {runs.length === 0 && <p className="text-xs text-white/40">No runs logged yet.</p>}
          </div>
        </div>
      </div>

      {/* ── Notification Detail Modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4" onClick={() => setSelectedItem(null)}>
          <div
            className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-white/5">
              <div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-gold/10 text-gold border-gold/30">
                  {selectedItem.type} Details
                </span>
                <p className="text-xs text-white/30 mt-1">Date: {selectedItem.date.toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white mb-2">{selectedItem.data.title || "Announcement"}</h3>
                <p className="text-sm text-white/70 whitespace-pre-wrap">
                  {selectedItem.type === "announcement" ? selectedItem.data.body : selectedItem.data.description || "No further details description provided."}
                </p>
              </div>

              {selectedItem.type === "session" && selectedItem.data.workouts?.length > 0 && (
                <div className="bg-surface/50 border border-white/5 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-white/50 uppercase mb-2">Practice Workouts</p>
                  <ul className="list-disc pl-5 text-xs text-white/80 space-y-1">
                    {selectedItem.data.workouts.map((w: any) => (
                      <li key={w.id}>{w.customName || w.workoutType?.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <p className="font-display text-2xl font-bold text-gold">{value}</p>
    </div>
  );
}
