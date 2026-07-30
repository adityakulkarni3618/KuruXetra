"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [sportId, setSportId] = useState("");

  useEffect(() => { api("/api/sports").then(setSports).catch(() => {}); }, []);

  useEffect(() => {
    const q = sportId ? `?sportId=${sportId}` : "";
    api(`/api/leaderboard${q}`).then(setBoard).catch(() => {});
  }, [sportId]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-white/50 text-sm mb-6">Ranked by total points across attendance, workouts, and runs.</p>

      <select className="input-field max-w-xs mb-6" value={sportId} onChange={(e) => setSportId(e.target.value)}>
        <option value="">Global</option>
        {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

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
              <tr key={row.id} className={`border-t border-border ${row.id === user?.id ? "bg-blue/10" : ""}`}>
                <td className="px-4 py-3">
                  {row.rank <= 3 ? <span className="text-gold font-bold">#{row.rank}</span> : `#${row.rank}`}
                </td>
                <td className="px-4 py-3">{row.fullName} <span className="text-white/30 text-xs">({row.uniqueId})</span></td>
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
    </div>
  );
}
