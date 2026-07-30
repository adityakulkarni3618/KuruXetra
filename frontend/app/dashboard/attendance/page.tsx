"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [sportId, setSportId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [a, s] = await Promise.all([api("/api/attendance/me"), api("/api/sports")]);
    setRecords(a);
    setSports(s);
  }

  useEffect(() => {
    load();
  }, []);

  const openEntry = records.find((r) => !r.timeOut);

  async function checkIn() {
    setError("");
    setLoading(true);
    try {
      await api("/api/attendance/checkin", {
        method: "POST",
        body: JSON.stringify({ sportId: sportId || undefined }),
      });
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkOut() {
    setError("");
    setLoading(true);
    try {
      await api("/api/attendance/checkout", { method: "POST" });
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Attendance</h1>
      <p className="text-white/50 text-sm mb-8">Check in when you arrive on the ground, check out when you leave.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      <div className="stat-card mb-8">
        {openEntry ? (
          <>
            <p className="text-sm text-green-400 mb-4">
              Checked in at {new Date(openEntry.timeIn).toLocaleTimeString()}
              {openEntry.sportId && sports.find((s) => s.id === openEntry.sportId) && (
                <> for {sports.find((s) => s.id === openEntry.sportId).name}</>
              )}
            </p>
            <button onClick={checkOut} disabled={loading} className="btn-primary bg-red-600 hover:bg-red-500">
              Check out
            </button>
          </>
        ) : (
          <>
            <label className="block mb-4 max-w-xs">
              <span className="label">Sport (optional)</span>
              <select className="input-field" value={sportId} onChange={(e) => setSportId(e.target.value)}>
                <option value="">General / fitness</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <button onClick={checkIn} disabled={loading} className="btn-gold">
              Check in
            </button>
          </>
        )}
      </div>

      <h2 className="font-display font-semibold mb-3">History</h2>
      <div className="stat-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-white/40 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Time in</th>
              <th className="text-left px-4 py-3">Time out</th>
              <th className="text-left px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{new Date(r.timeIn).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(r.timeIn).toLocaleTimeString()}</td>
                <td className="px-4 py-3">{r.timeOut ? new Date(r.timeOut).toLocaleTimeString() : "—"}</td>
                <td className="px-4 py-3">{r.durationMin ? `${r.durationMin} min` : "—"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-white/40">No attendance yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
