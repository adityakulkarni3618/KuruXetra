"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { printReport } from "@/lib/export";

interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  sharesCount: number;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    uniqueId: string;
    profilePhotoUrl?: string;
  };
  likes: { id: string; userId: string; postId: string }[];
  comments: {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
    user: { id: string; fullName: string; uniqueId: string; profilePhotoUrl?: string };
  }[];
}

interface UserProfile {
  id: string;
  fullName: string;
  uniqueId: string;
  email?: string;
  mobileNumber?: string;
  rollNumber?: string;
  department?: string;
  academicYear?: string;
  gender?: string;
  bloodGroup?: string;
  fitnessGoal?: string;
  profilePhotoUrl?: string;
  isPublic: boolean;
  role: string;
  isFullProfile: boolean;
  createdAt: string;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [sportId, setSportId] = useState("");

  // Search athlete parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Profile detail modal/view state
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profileWorkouts, setProfileWorkouts] = useState<any[]>([]);
  const [profileRuns, setProfileRuns] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");

  const [profileWorkoutStart, setProfileWorkoutStart] = useState("");
  const [profileWorkoutEnd, setProfileWorkoutEnd] = useState("");
  const [profileRunStart, setProfileRunStart] = useState("");
  const [profileRunEnd, setProfileRunEnd] = useState("");

  // Social actions inside profile view
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState("");
  const [postIsGlobal, setPostIsGlobal] = useState(true);
  const [postTargetSportId, setPostTargetSportId] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState(false);

  // Tabs: "leaderboard" | "explore-badges"
  const [activeTab, setActiveTab] = useState<"leaderboard" | "explore-badges">("leaderboard");
  const [badgesList, setBadgesList] = useState<any[]>([]);

  useEffect(() => {
    api("/api/sports").then(setSports).catch(() => {});
    api("/api/admin-features/badges").then(setBadgesList).catch(() => {});

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "explore-badges") {
        setActiveTab("explore-badges");
      }
    }
  }, []);

  useEffect(() => {
    const q = sportId ? `?sportId=${sportId}` : "";
    api(`/api/leaderboard${q}`).then(setBoard).catch(() => {});
  }, [sportId]);

  async function handleAthleteSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError("");
    setSearchResults([]);
    try {
      // Find matches across IDs, department, role, name
      const res = await api(`/api/admin/users/search?name=${searchQuery}&uniqueId=${searchQuery}`);
      setSearchResults(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function fetchUserProfile(userId: string) {
    setLoadingProfile(true);
    setSelectedProfile(null);
    setProfilePosts([]);
    setProfileWorkouts([]);
    setProfileRuns([]);
    setError("");
    try {
      const profile = await api(`/api/social/users/${userId}/profile`);
      setSelectedProfile(profile);
      if (profile.isFullProfile) {
        const [posts, workouts, runs] = await Promise.all([
          api(`/api/social/users/${userId}/posts`).catch(() => []),
          api(`/api/workouts/user/${userId}`).catch(() => []),
          api(`/api/running/user/${userId}`).catch(() => []),
        ]);
        setProfilePosts(posts);
        setProfileWorkouts(workouts);
        setProfileRuns(runs);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingProfile(false);
    }
  }

  // Submit new post on own profile
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      const p = await api("/api/social/posts", {
        method: "POST",
        body: JSON.stringify({ 
          content: newPostContent, 
          imageUrl: newPostImage || undefined,
          isGlobal: postIsGlobal,
          targetSportId: postIsGlobal ? undefined : (postTargetSportId || undefined),
        }),
      });
      setProfilePosts(prev => [p, ...prev]);
      setNewPostContent("");
      setNewPostImage("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  // Post social actions
  async function handleLike(postId: string) {
    try {
      const res = await api(`/api/social/posts/${postId}/like`, { method: "POST" });
      setProfilePosts(prev =>
        prev.map(p => {
          if (p.id === postId) {
            const likes = res.liked
              ? [...p.likes, { id: "temp", userId: user!.id, postId }]
              : p.likes.filter(l => l.userId !== user!.id);
            return { ...p, likes };
          }
          return p;
        })
      );
    } catch {}
  }

  async function handleCommentSubmit(e: React.FormEvent, postId: string) {
    e.preventDefault();
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    try {
      const c = await api(`/api/social/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setProfilePosts(prev =>
        prev.map(p => {
          if (p.id === postId) {
            return { ...p, comments: [...p.comments, c] };
          }
          return p;
        })
      );
      setCommentText(prev => ({ ...prev, [postId]: "" }));
    } catch {}
  }

  async function handleShare(postId: string) {
    try {
      const res = await api(`/api/social/posts/${postId}/share`, { method: "POST" });
      setProfilePosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, sharesCount: res.sharesCount } : p))
      );
      alert("Post shared successfully!");
    } catch {}
  }



  return (
    <div>
      {/* Tab Switcher Headers */}
      <div className="flex gap-4 border-b border-white/5 pb-3 mb-6">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`font-display text-lg font-bold pb-1 transition-all ${
            activeTab === "leaderboard" ? "text-gold border-b-2 border-gold" : "text-white/40 hover:text-white/80"
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("explore-badges")}
          className={`font-display text-lg font-bold pb-1 transition-all ${
            activeTab === "explore-badges" ? "text-gold border-b-2 border-gold" : "text-white/40 hover:text-white/80"
          }`}
        >
          Explore Badges
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* ── Main content pane (Leaderboard or Badges List) ── */}
        <div className="md:col-span-2 space-y-4">
          {activeTab === "leaderboard" ? (
            <>
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold mb-1">Leaderboard</h1>
                  <p className="text-white/50 text-sm">Ranked by total points across activities.</p>
                </div>
                <select className="input-field max-w-xs" value={sportId} onChange={(e) => setSportId(e.target.value)}>
                  <option value="">Global</option>
                  {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="stat-card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-white/40 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Rank</th>
                      <th className="text-left px-4 py-3">Athlete</th>
                      <th className="text-left px-4 py-3">Department</th>
                      <th className="text-right px-4 py-3">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => fetchUserProfile(row.id)}
                        className={`border-t border-border hover:bg-white/5 cursor-pointer transition-colors ${
                          row.id === user?.id ? "bg-blue/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          {row.rank <= 3 ? <span className="text-gold font-bold">#{row.rank}</span> : `#${row.rank}`}
                        </td>
                        <td className="px-4 py-3 flex items-center gap-3">
                          {row.profilePhotoUrl ? (
                            <img src={row.profilePhotoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-surface-light flex items-center justify-center text-[10px] shrink-0">
                              {row.fullName.charAt(0)}
                            </div>
                          )}
                          <span>{row.fullName} <span className="text-white/30 text-xs">({row.uniqueId})</span></span>
                        </td>
                        <td className="px-4 py-3 text-white/50">{row.department}</td>
                        <td className="px-4 py-3 text-right font-semibold">{row.points}</td>
                      </tr>
                    ))}
                    {board.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-white/40">No points logged yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold mb-1">Explore Badges</h1>
                <p className="text-white/50 text-sm mb-4">Learn about all earnable achievements at Kuruxetra.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {badgesList.map((badge) => (
                  <div key={badge.id} className="stat-card border border-gold/10 hover:border-gold/30 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gold text-base">🏆 {badge.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-white/5 text-white/50">
                        {badge.isManual ? "Captain/Sec Award" : "Auto Earn"}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{badge.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Social Search Sidebar ── */}
        <div className="space-y-4">
          <div className="stat-card">
            <h2 className="font-display font-semibold text-white mb-3 text-sm">Find Athletes</h2>
            <form onSubmit={handleAthleteSearch} className="flex gap-2">
              <input
                className="input-field text-xs flex-1"
                placeholder="Search name, ID, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
              <button type="submit" disabled={searching} className="btn-gold text-xs px-3 py-1.5">
                Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {searchResults.map((ath) => (
                  <div
                    key={ath.id}
                    onClick={() => fetchUserProfile(ath.id)}
                    className="flex items-center gap-3 bg-surface/50 border border-white/5 p-2 rounded-lg cursor-pointer hover:border-gold/30 transition-all"
                  >
                    {ath.profilePhotoUrl ? (
                      <img src={ath.profilePhotoUrl} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-[10px] text-white/30">
                        {ath.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-white truncate">{ath.fullName}</p>
                      <p className="text-[10px] text-white/40 font-mono truncate">{ath.uniqueId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Profile Social Modal (Instagram/WhatsApp style) ── */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 overflow-y-auto py-10" onClick={() => setSelectedProfile(null)}>
          <div
            className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                {selectedProfile.profilePhotoUrl ? (
                  <img
                    src={selectedProfile.profilePhotoUrl}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border border-gold/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-surface-light border border-dashed border-white/10 flex items-center justify-center text-white/20">
                    No Pic
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-bold text-white text-xl">{selectedProfile.fullName}</h2>
                    <span className="text-xs text-white/30 font-mono">({selectedProfile.uniqueId})</span>
                  </div>
                  {/* Badges Subheading */}
                  {selectedProfile.isFullProfile && (selectedProfile as any).badges?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {(selectedProfile as any).badges.map((ub: any) => (
                        <span key={ub.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/25">
                          🏆 {ub.badge.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gold capitalize mt-1">{selectedProfile.role.toLowerCase()}</p>
                  <p className="text-[10px] text-white/50 mt-1">
                    🔒 Account Type: <span className="font-bold text-white">{selectedProfile.isPublic ? "Public" : "Private"}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Visibility Logic */}
            {!selectedProfile.isFullProfile ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-3 bg-white/5 text-white/40">
                  🔒
                </div>
                <p className="text-sm font-semibold text-white">This Account is Private</p>
                <p className="text-xs text-white/40 mt-1">Follow or contact this athlete to request access to their details.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-surface/50 border border-white/5 p-3 rounded-lg">
                    <p className="text-white/30 font-semibold mb-0.5">Contact</p>
                    <p className="text-white">{selectedProfile.email || "—"}</p>
                    <p className="text-white/50 mt-0.5">{selectedProfile.mobileNumber || "—"}</p>
                  </div>
                  <div className="bg-surface/50 border border-white/5 p-3 rounded-lg">
                    <p className="text-white/30 font-semibold mb-0.5">Academic Info</p>
                    <p className="text-white">{selectedProfile.department || "—"}</p>
                    <p className="text-white/50 mt-0.5">Year {selectedProfile.academicYear || "—"} · Roll {selectedProfile.rollNumber || "—"}</p>
                  </div>
                  <div className="bg-surface/50 border border-white/5 p-3 rounded-lg col-span-2 md:col-span-1">
                    <p className="text-white/30 font-semibold mb-0.5">Personal & Fitness</p>
                    <p className="text-white">Goal: {selectedProfile.fitnessGoal || "—"}</p>
                    <p className="text-white/50 mt-0.5">Blood Group: {selectedProfile.bloodGroup || "—"}</p>
                  </div>
                </div>

                {/* Workout and Running sections */}
                <div className="grid md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  {/* Workouts History Section */}
                  <div className="bg-surface/50 border border-white/5 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-white text-sm">Workout History ({profileWorkouts.length})</h4>
                      {selectedProfile.id === user?.id && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to clear workout history?")) return;
                              await api("/api/workouts/clear", { method: "POST" });
                              const w = await api(`/api/workouts/user/${selectedProfile.id}`).catch(() => []);
                              setProfileWorkouts(w);
                            }}
                            className="text-[9px] px-2 py-0.5 bg-red-600/20 text-red-300 border border-red-500/20 rounded"
                          >
                            Clear
                          </button>
                          <button
                            onClick={async () => {
                              await api("/api/workouts/restore", { method: "POST" });
                              const w = await api(`/api/workouts/user/${selectedProfile.id}`).catch(() => []);
                              setProfileWorkouts(w);
                            }}
                            className="text-[9px] px-2 py-0.5 bg-green-600/20 text-green-300 border border-green-500/20 rounded"
                          >
                            Restore
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Date filter & PDF export */}
                    <div className="flex flex-col gap-1 bg-black/20 p-2 rounded text-[10px]">
                      <div className="flex gap-2">
                        <label className="block flex-1">
                          <span className="text-white/40 block mb-0.5">Start</span>
                          <input type="date" className="input-field text-[10px] py-0.5" value={profileWorkoutStart} onChange={(e) => setProfileWorkoutStart(e.target.value)} />
                        </label>
                        <label className="block flex-1">
                          <span className="text-white/40 block mb-0.5">End</span>
                          <input type="date" className="input-field text-[10px] py-0.5" value={profileWorkoutEnd} onChange={(e) => setProfileWorkoutEnd(e.target.value)} />
                        </label>
                      </div>
                      <button
                        onClick={() => {
                          let filtered = profileWorkouts;
                          if (profileWorkoutStart) {
                            const start = new Date(profileWorkoutStart).getTime();
                            filtered = filtered.filter(w => new Date(w.createdAt).getTime() >= start);
                          }
                          if (profileWorkoutEnd) {
                            const end = new Date(profileWorkoutEnd);
                            end.setHours(23, 59, 59, 999);
                            filtered = filtered.filter(w => new Date(w.createdAt).getTime() <= end.getTime());
                          }
                          const headers = ["Workout / Exercise", "Sets", "Reps", "Weight (kg)", "Duration (min)", "Calories", "Date", "Notes"];
                          const rows = filtered.map(w => [
                            w.name,
                            w.sets || "—",
                            w.reps || "—",
                            w.weightKg || "—",
                            w.durationMin || "—",
                            w.calories || "—",
                            new Date(w.createdAt).toLocaleDateString(),
                            w.notes || "—"
                          ]);
                          printReport(`${selectedProfile.fullName}'s Workout History Report`, headers, rows);
                        }}
                        className="btn-gold w-full text-[10px] py-1 mt-1"
                      >
                        Download PDF
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                      {profileWorkouts.map((w) => (
                        <div key={w.id} className="p-2 bg-surface rounded border border-white/5 text-[11px]">
                          <div className="flex justify-between font-medium">
                            <span className="text-white">{w.name}</span>
                            <span className="text-white/40 text-[9px]">{new Date(w.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-white/50 mt-0.5">
                            {[
                              w.exercise,
                              w.sets && `${w.sets} sets`,
                              w.reps && `${w.reps} reps`,
                              w.weightKg && `${w.weightKg} kg`,
                              w.durationMin && `${w.durationMin} min`,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      ))}
                      {profileWorkouts.length === 0 && <p className="text-[10px] text-white/40 italic">No workouts logged.</p>}
                    </div>
                  </div>

                  {/* Running History Section */}
                  <div className="bg-surface/50 border border-white/5 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-white text-sm">Running History ({profileRuns.length})</h4>
                      {selectedProfile.id === user?.id && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to clear running history?")) return;
                              await api("/api/running/clear", { method: "POST" });
                              const r = await api(`/api/running/user/${selectedProfile.id}`).catch(() => []);
                              setProfileRuns(r);
                            }}
                            className="text-[9px] px-2 py-0.5 bg-red-600/20 text-red-300 border border-red-500/20 rounded"
                          >
                            Clear
                          </button>
                          <button
                            onClick={async () => {
                              await api("/api/running/restore", { method: "POST" });
                              const r = await api(`/api/running/user/${selectedProfile.id}`).catch(() => []);
                              setProfileRuns(r);
                            }}
                            className="text-[9px] px-2 py-0.5 bg-green-600/20 text-green-300 border border-green-500/20 rounded"
                          >
                            Restore
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Date filter & PDF export */}
                    <div className="flex flex-col gap-1 bg-black/20 p-2 rounded text-[10px]">
                      <div className="flex gap-2">
                        <label className="block flex-1">
                          <span className="text-white/40 block mb-0.5">Start</span>
                          <input type="date" className="input-field text-[10px] py-0.5" value={profileRunStart} onChange={(e) => setProfileRunStart(e.target.value)} />
                        </label>
                        <label className="block flex-1">
                          <span className="text-white/40 block mb-0.5">End</span>
                          <input type="date" className="input-field text-[10px] py-0.5" value={profileRunEnd} onChange={(e) => setProfileRunEnd(e.target.value)} />
                        </label>
                      </div>
                      <button
                        onClick={() => {
                          let filtered = profileRuns;
                          if (profileRunStart) {
                            const start = new Date(profileRunStart).getTime();
                            filtered = filtered.filter(r => new Date(r.createdAt).getTime() >= start);
                          }
                          if (profileRunEnd) {
                            const end = new Date(profileRunEnd);
                            end.setHours(23, 59, 59, 999);
                            filtered = filtered.filter(r => new Date(r.createdAt).getTime() <= end.getTime());
                          }
                          const headers = ["Distance (km)", "Duration (min)", "Pace (min/km)", "Speed (km/h)", "Date", "Notes"];
                          const rows = filtered.map(r => [
                            `${r.distanceKm} km`,
                            `${r.durationMin} min`,
                            r.paceMinKm ? `${r.paceMinKm.toFixed(2)} min/km` : "—",
                            r.paceMinKm ? `${(60 / r.paceMinKm).toFixed(2)} km/h` : "—",
                            new Date(r.createdAt).toLocaleDateString(),
                            r.notes || "—"
                          ]);
                          printReport(`${selectedProfile.fullName}'s Running History Report`, headers, rows);
                        }}
                        className="btn-gold w-full text-[10px] py-1 mt-1"
                      >
                        Download PDF
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                      {profileRuns.map((r) => (
                        <div key={r.id} className="p-2 bg-surface rounded border border-white/5 text-[11px]">
                          <div className="flex justify-between font-medium">
                            <span className="text-white">{r.distanceKm} km in {r.durationMin} min</span>
                            <span className="text-white/40 text-[9px]">{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-white/50 mt-0.5">
                            Speed: {r.paceMinKm ? (60 / r.paceMinKm).toFixed(2) : "—"} km/h
                            {r.notes && ` · Notes: ${r.notes}`}
                          </p>
                        </div>
                      ))}
                      {profileRuns.length === 0 && <p className="text-[10px] text-white/40 italic">No running sessions logged.</p>}
                    </div>
                  </div>
                </div>

                {/* Own profile upload section */}
                {selectedProfile.id === user?.id && (
                  <form onSubmit={handleCreatePost} className="bg-surface/60 border border-white/5 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-white">Share a Post on Your Profile</p>
                    <textarea
                      className="input-field text-xs min-h-[60px]"
                      placeholder="What is on your mind? Log a victory, update, or practice tip..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      required
                    />
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        className="input-field text-xs flex-1"
                        placeholder="Image URL (optional)"
                        value={newPostImage}
                        onChange={(e) => setNewPostImage(e.target.value)}
                      />
                      
                      {/* Global checkbox check */}
                      <label className="flex items-center gap-1.5 text-xs text-white/70 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={postIsGlobal}
                          onChange={(e) => setPostIsGlobal(e.target.checked)}
                        />
                        Global
                      </label>

                      {/* targetSport selector */}
                      {!postIsGlobal && (
                        <select
                          className="input-field text-xs py-2 bg-surface max-w-[150px]"
                          value={postTargetSportId}
                          onChange={(e) => setPostTargetSportId(e.target.value)}
                        >
                          <option value="">Select Sport Target</option>
                          {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}

                      <button type="submit" disabled={posting} className="btn-gold text-xs px-4 py-2">
                        {posting ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Posts Feed wall */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  <h3 className="font-display font-semibold text-white text-sm">Posts Wall</h3>
                  {profilePosts.map((post) => {
                    const hasLiked = post.likes.some(l => l.userId === user?.id);
                    return (
                      <div key={post.id} className="bg-surface/50 border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          {post.user.profilePhotoUrl ? (
                            <img src={post.user.profilePhotoUrl} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs">
                              {post.user.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                    <p className="text-xs font-semibold text-white">{post.user.fullName}</p>
                            <p className="text-[9px] text-white/40">{new Date(post.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <p className="text-xs text-white/70 whitespace-pre-wrap">{post.content}</p>
                        {post.imageUrl && (
                          post.imageUrl.match(/\.(mp4|webm|ogg|mov|m4v)($|\?)/i) || post.imageUrl.includes("/video/upload/") ? (
                            <video 
                              src={post.imageUrl} 
                              controls 
                              playsInline
                              className="w-full max-h-60 rounded-lg object-contain bg-black border border-white/5" 
                            />
                          ) : (
                            <img src={post.imageUrl} className="w-full max-h-60 rounded-lg object-contain bg-black border border-white/5" />
                          )
                        )}

                        {/* Interactive Bar */}
                        <div className="flex items-center gap-6 border-t border-white/5 pt-2 text-[10px] text-white/50">
                          <button
                            type="button"
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 hover:text-gold ${hasLiked ? "text-gold font-bold" : ""}`}
                          >
                            ❤️ {post.likes.length} Likes
                          </button>
                          <button type="button" className="flex items-center gap-1 hover:text-gold">
                            💬 {post.comments.length} Comments
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(post.id)}
                            className="flex items-center gap-1 hover:text-gold ml-auto"
                          >
                            🔄 Share ({post.sharesCount})
                          </button>
                        </div>

                        {/* Comments List */}
                        {post.comments.length > 0 && (
                          <div className="bg-surface/40 p-2.5 rounded-lg text-[10px] space-y-2 border border-white/5">
                            {post.comments.map((c) => (
                              <div key={c.id} className="flex gap-2">
                                <span className="font-semibold text-white">{c.user.fullName}:</span>
                                <span className="text-white/70">{c.content}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Leave a Comment form */}
                        <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="flex gap-2 mt-2">
                          <input
                            className="input-field text-[10px] py-1 flex-1"
                            placeholder="Add a comment..."
                            value={commentText[post.id] || ""}
                            onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                            required
                          />
                          <button type="submit" className="btn-gold text-[10px] py-1 px-3">
                            Submit
                          </button>
                        </form>
                      </div>
                    );
                  })}
                  {profilePosts.length === 0 && (
                    <p className="text-xs text-white/30 italic text-center py-6">No posts published yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
