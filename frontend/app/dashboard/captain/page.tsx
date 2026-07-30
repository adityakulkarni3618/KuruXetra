"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function CaptainPage() {
  const { user } = useAuth();
  const [mySport, setMySport] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
    const sport = sports.find((s: any) => s.captainId === me.id);
    setMySport(sport);
    if (sport) {
      const [m, a] = await Promise.all([
        api(`/api/sports/${sport.id}/members`),
        api(`/api/attendance/sport/${sport.id}`),
      ]);
      setMembers(m);
      setAttendance(a);
    }
  }
  useEffect(() => { load(); }, []);

  async function review(membershipId: string, decision: "APPROVED" | "REJECTED") {
    setError("");
    try {
      await api(`/api/sports/memberships/${membershipId}/review`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!mySport) {
    return <div className="text-white/50 text-sm">You're not assigned as a captain for any sport yet.</div>;
  }

  const pending = members.filter((m) => m.status === "PENDING");
  const approved = members.filter((m) => m.status === "APPROVED");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">{mySport.name} — Team management</h1>
      <p className="text-white/50 text-sm mb-8">Approve join requests and monitor your team's attendance.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      <h2 className="font-display font-semibold mb-3">Pending requests ({pending.length})</h2>
      <div className="space-y-2 mb-8">
        {pending.map((m) => (
          <div key={m.id} className="stat-card flex justify-between items-center">
            <div>
              <p className="font-medium">{m.user.fullName}</p>
              <p className="text-xs text-white/40">{m.user.uniqueId} · {m.user.department}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => review(m.id, "APPROVED")} className="btn-gold text-xs px-3 py-1.5">Approve</button>
              <button onClick={() => review(m.id, "REJECTED")} className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5">Reject</button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-sm text-white/40">No pending requests.</p>}
      </div>

      <h2 className="font-display font-semibold mb-3">Team roster ({approved.length})</h2>
      <div className="space-y-2 mb-8">
        {approved.map((m) => (
          <div key={m.id} className="stat-card">
            <p className="font-medium">{m.user.fullName}</p>
            <p className="text-xs text-white/40">{m.user.uniqueId} · {m.user.department}</p>
          </div>
        ))}
        {approved.length === 0 && <p className="text-sm text-white/40">No approved members yet.</p>}
      </div>

      <h2 className="font-display font-semibold mb-3">Recent team attendance</h2>
      <div className="stat-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-white/40 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Athlete</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Time in</th>
              <th className="text-left px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3">{a.user.fullName}</td>
                <td className="px-4 py-3">{new Date(a.timeIn).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(a.timeIn).toLocaleTimeString()}</td>
                <td className="px-4 py-3">{a.durationMin ? `${a.durationMin} min` : "—"}</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-white/40">No attendance yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
