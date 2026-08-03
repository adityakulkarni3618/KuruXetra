"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { printReport } from "@/lib/export";

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [sportId, setSportId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfStart, setPdfStart] = useState("");
  const [pdfEnd, setPdfEnd] = useState("");

  const downloadPdf = () => {
    let filtered = records;
    if (pdfStart) {
      const start = new Date(pdfStart).getTime();
      filtered = filtered.filter(r => new Date(r.timeIn).getTime() >= start);
    }
    if (pdfEnd) {
      const end = new Date(pdfEnd);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.timeIn).getTime() <= end.getTime());
    }

    const headers = ["Date", "Time In", "Time Out", "Duration"];
    const rows = filtered.map(r => [
      new Date(r.timeIn).toLocaleDateString(),
      new Date(r.timeIn).toLocaleTimeString(),
      r.timeOut ? new Date(r.timeOut).toLocaleTimeString() : "—",
      r.durationMin ? `${r.durationMin} min` : "—"
    ]);

    printReport(`Attendance History Report`, headers, rows);
  };

  async function load() {
    const [a, me] = await Promise.all([api("/api/attendance/me"), api("/api/auth/me")]);
    setRecords(a);
    const approvedSports = (me.memberships ?? [])
      .filter((m: any) => m.status === "APPROVED")
      .map((m: any) => m.sport);
    setSports(approvedSports);
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

      <div className="stat-card mb-6 border border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">History Controls</h3>
            <p className="text-xs text-white/50">Clear, restore or export your attendance logs.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to clear your attendance history?")) return;
                await api("/api/attendance/clear", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
            >
              Clear Attendance
            </button>
            <button
              onClick={async () => {
                await api("/api/attendance/restore", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all"
            >
              Restore Attendance
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-end gap-3">
          <label className="block flex-1">
            <span className="label text-[10px] text-white/40 mb-1">Start Date</span>
            <input type="date" className="input-field text-xs py-1.5" value={pdfStart} onChange={(e) => setPdfStart(e.target.value)} />
          </label>
          <label className="block flex-1">
            <span className="label text-[10px] text-white/40 mb-1">End Date</span>
            <input type="date" className="input-field text-xs py-1.5" value={pdfEnd} onChange={(e) => setPdfEnd(e.target.value)} />
          </label>
          <button
            onClick={downloadPdf}
            className="btn-gold text-xs px-4 py-2 w-full sm:w-auto"
          >
            Download Attendance PDF
          </button>
        </div>
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
