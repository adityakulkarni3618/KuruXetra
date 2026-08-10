"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function GlobalSearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ athletes: any[]; sports: any[] }>({ athletes: [], sports: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [myMemberships, setMyMemberships] = useState<any[]>([]);

  async function loadMyMemberships() {
    try {
      const me = await api("/api/auth/me");
      setMyMemberships(me.memberships || []);
    } catch {}
  }

  useEffect(() => {
    loadMyMemberships();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api(`/api/sports/global-search?query=${encodeURIComponent(query.trim())}`);
      setResults(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function join(sportId: string) {
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/join`, { method: "POST" });
      setMessage("Request sent successfully.");
      await Promise.all([loadMyMemberships(), api(`/api/sports/global-search?query=${encodeURIComponent(query.trim())}`).then(setResults)]);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function leave(sportId: string) {
    if (!confirm("Are you sure you want to leave this team?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/leave`, { method: "POST" });
      setMessage("Successfully left the team.");
      await Promise.all([loadMyMemberships(), api(`/api/sports/global-search?query=${encodeURIComponent(query.trim())}`).then(setResults)]);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold mb-1 text-white">Global Directory Search</h1>
        <p className="text-white/50 text-sm">Search athletes, sports, and team rosters across the college register.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3">{message}</div>}

      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <input
          className="input-field"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, athletic ID, department, or sport..."
          required
        />
        <button type="submit" disabled={loading} className="btn-gold px-6">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {loading ? (
        <div className="text-white/40 text-center py-10">Fetching directory results...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sports Results */}
          <div className="space-y-4">
            <h2 className="font-display font-semibold text-lg text-white border-b border-white/5 pb-2">Sports & Teams</h2>
            {results.sports.map((s) => {
              const membership = myMemberships.find((m) => m.sportId === s.id);
              const isJoined = membership?.status === "APPROVED";
              const isPending = membership?.status === "PENDING";
              return (
                <div key={s.id} className="stat-card border border-white/5 hover:border-gold/15 transition-all">
                  <h3 className="font-display font-semibold text-white text-lg">{s.teamName || s.name}</h3>
                  {s.teamName && <p className="text-xs text-white/40 mt-0.5">{s.name}</p>}
                  <p className="text-xs text-white/60 mt-2 leading-relaxed">{s.description || "No description provided."}</p>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/40 border-t border-white/5 pt-3">
                    <div>
                      <span className="block font-semibold">Location</span>
                      <span className="text-white/60">{s.ground || "TBA"}</span>
                    </div>
                    <div>
                      <span className="block font-semibold">Timing</span>
                      <span className="text-white/60">{s.practiceTime || "TBA"}</span>
                    </div>
                    {s.captain && (
                      <div className="col-span-2 mt-1">
                        <span className="font-semibold text-xs text-gold">Captain: {s.captain.fullName}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    {isJoined ? (
                      <button
                        onClick={() => leave(s.id)}
                        className="btn-primary bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 text-xs px-3.5 py-2 w-full justify-center"
                      >
                        Leave Team
                      </button>
                    ) : (
                      <button
                        onClick={() => join(s.id)}
                        disabled={isPending}
                        className="btn-gold text-xs px-3.5 py-2 w-full justify-center disabled:opacity-40"
                      >
                        {isPending ? "Join Requested" : "Request to Join"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {query && results.sports.length === 0 && (
              <p className="text-sm text-white/30 italic">No sports or teams matching "{query}" found.</p>
            )}
          </div>

          {/* Athletes Results */}
          <div className="space-y-4">
            <h2 className="font-display font-semibold text-lg text-white border-b border-white/5 pb-2">Athletes & Members</h2>
            {results.athletes.map((ath) => {
              const roles: string[] = [];
              if (ath.role === "SUPER_ADMIN") roles.push("Sports Secretary");
              if (ath.captainOf?.length > 0) roles.push(`Captain of ${ath.captainOf.map((s: any) => s.name).join(", ")}`);
              if (ath.viceCaptainOf?.length > 0) roles.push(`Vice-Captain of ${ath.viceCaptainOf.map((s: any) => s.name).join(", ")}`);
              if (roles.length === 0) roles.push("Student Athlete");

              return (
                <div key={ath.id} className="stat-card border border-white/5 hover:border-gold/15 transition-all flex items-center gap-4">
                  {ath.profilePhotoUrl ? (
                    <img src={ath.profilePhotoUrl} className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-light border border-dashed border-white/10 flex items-center justify-center text-white/20 shrink-0 font-bold">
                      {ath.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-display font-semibold text-white leading-tight truncate">{ath.fullName}</h3>
                    <p className="text-[10px] text-gold font-medium mt-0.5 leading-relaxed">{roles.join(" & ")}</p>
                    <p className="text-[10px] text-white/40 mt-1 truncate">{ath.uniqueId} · {ath.department} · Year {ath.academicYear}</p>
                  </div>
                </div>
              );
            })}
            {query && results.athletes.length === 0 && (
              <p className="text-sm text-white/30 italic">No athletes matching "{query}" found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
