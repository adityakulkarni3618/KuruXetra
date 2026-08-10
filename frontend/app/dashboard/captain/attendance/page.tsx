"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";
import CaptainSportSelector from "@/components/CaptainSportSelector";
export default function CaptainAttendancePage() {
  const [mySport, setMySport] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [ground, setGround] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({});
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "week", "month", "custom"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
        const mySports = sports.filter((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
        const savedId = localStorage.getItem("selected_captain_sport_id");
        const sport = mySports.find((s: any) => s.id === savedId) || mySports[0];
        setMySport(sport);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    init();
  }, []);

  async function load() {
    if (!mySport) return;
    setError("");
    setMessage("");
    try {
      const [mems, att] = await Promise.all([
        api(`/api/sports/${mySport.id}/members`),
        api(`/api/attendance/sport/${mySport.id}`),
      ]);
      setMembers(mems);
      setAttendance(att);
      setSelectedUserIds({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [mySport?.id]);

  const approved = members.filter((m) => m.status === "APPROVED");

  async function submitBatchMark(e: React.FormEvent) {
    e.preventDefault();
    const userIds = Object.keys(selectedUserIds).filter((id) => selectedUserIds[id]);
    if (userIds.length === 0) {
      setError("Please select at least one team member.");
      return;
    }
    setError("");
    setMessage("");
    setMarking(true);
    try {
      const res = await api("/api/attendance/batch-mark", {
        method: "POST",
        body: JSON.stringify({
          userIds,
          sportId: mySport.id,
          ground: ground || undefined,
        }),
      });
      if (res.errors && res.errors.length > 0) {
        setError(res.errors.join(" | "));
      }
      setMessage(`Successfully marked attendance for ${res.markedCount} team members.`);
      setGround("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMarking(false);
    }
  }

  const toggleSelect = (userId: string) => {
    setSelectedUserIds((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const selectAll = () => {
    const nextSelections: Record<string, boolean> = {};
    approved.forEach((m) => {
      nextSelections[m.user.id] = true;
    });
    setSelectedUserIds(nextSelections);
  };

  const selectNone = () => {
    setSelectedUserIds({});
  };

  // Filtering logs
  const filteredAttendance = attendance.filter((a) => {
    const timeInDate = new Date(a.timeIn);
    const now = new Date();

    if (dateFilter === "today") {
      return timeInDate.toDateString() === now.toDateString();
    }
    if (dateFilter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return timeInDate >= oneWeekAgo;
    }
    if (dateFilter === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return timeInDate >= oneMonthAgo;
    }
    if (dateFilter === "custom") {
      if (customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return timeInDate >= start && timeInDate <= end;
      }
    }
    return true;
  });

  function handleExportCSV() {
    const dataToExport = filteredAttendance.map((a) => ({
      "Athlete ID": a.user.uniqueId,
      "Athlete Name": a.user.fullName,
      "Date": new Date(a.timeIn).toLocaleDateString(),
      "Time In": new Date(a.timeIn).toLocaleTimeString(),
      "Ground": a.ground || "—",
      "Type": a.markedBy ? "Captain marked" : "Self check-in",
    }));
    exportToCSV(dataToExport, `${mySport.name}_Attendance_${dateFilter}`);
  }

  function handleExportPDF() {
    const headers = ["Athlete ID", "Athlete Name", "Date", "Time In", "Ground", "Type"];
    const rows = filteredAttendance.map((a) => [
      a.user.uniqueId,
      a.user.fullName,
      new Date(a.timeIn).toLocaleDateString(),
      new Date(a.timeIn).toLocaleTimeString(),
      a.ground || "—",
      a.markedBy ? "Captain marked" : "Self check-in",
    ]);
    printReport(`${mySport.name} - Attendance Report (${dateFilter})`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading attendance reports...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/captain" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Dashboard
        </Link>
      </div>

      <CaptainSportSelector onSportChanged={setMySport} currentSportId={mySport?.id} />

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Attendance Reports</h1>
          <p className="text-white/50 text-sm">Mark roster attendance using checkboxes and export history logs for {mySport?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      {/* Checkbox attendance marking */}
      <div className="stat-card mb-8">
        <h2 className="font-display font-semibold mb-2 text-white">Mark Daily Attendance</h2>
        <p className="text-xs text-white/40 mb-4">Select all team members currently present on the field today.</p>
        
        {approved.length === 0 ? (
          <p className="text-sm text-white/40">No approved members on the roster to mark.</p>
        ) : (
          <form onSubmit={submitBatchMark} className="space-y-4">
            <div className="flex gap-3 mb-3">
              <button type="button" onClick={selectAll} className="text-xs text-gold border border-gold/15 bg-gold/5 px-2.5 py-1 rounded">Select All</button>
              <button type="button" onClick={selectNone} className="text-xs text-white/40 border border-white/10 px-2.5 py-1 rounded">Deselect All</button>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 border-b border-white/5 pb-4">
              {approved.map((m) => {
                const isSelected = !!selectedUserIds[m.user.id];
                return (
                  <label key={m.user.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                    isSelected ? "border-gold/45 bg-gold/5" : "border-white/5 bg-surface/50 hover:border-white/15"
                  }`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(m.user.id)}
                      className="rounded border-white/20 bg-surface text-gold focus:ring-gold"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{m.user.fullName}</p>
                      <p className="text-[10px] text-white/40">{m.user.uniqueId}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-2">
              <label className="block flex-1 max-w-sm">
                <span className="label text-xs">Ground Location (optional)</span>
                <input
                  className="input-field text-xs"
                  value={ground}
                  onChange={(e) => setGround(e.target.value)}
                  placeholder="e.g. Main ground, nets"
                />
              </label>
              <button type="submit" disabled={marking} className="btn-gold px-6">
                {marking ? "Marking..." : "Submit Attendance"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filtering Section */}
      <div className="stat-card mb-6">
        <h2 className="font-display font-semibold mb-3 text-white">Filters</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="block">
            <span className="label text-xs">Date Range</span>
            <select
              className="input-field text-xs min-w-[150px]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>

          {dateFilter === "custom" && (
            <>
              <label className="block">
                <span className="label text-xs">Start Date</span>
                <input
                  type="date"
                  className="input-field text-xs"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="label text-xs">End Date</span>
                <input
                  type="date"
                  className="input-field text-xs"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* History Controls */}
      <div className="stat-card mb-6 border border-white/5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">History Controls</h3>
            <p className="text-xs text-white/50">Choose to clear or restore attendance from your personal account only, or globally for the entire sport roster.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={async () => {
                const choice = confirm(
                  `CLEAR ATTENDANCE\n\nChoose scope:\n\n✅ Click OK → Clear for ALL athletes in ${mySport?.name} roster (global for this sport only)\n❌ Click Cancel → Clear from your personal account only`
                );
                if (choice) {
                  if (!confirm(`This will hide ALL ${mySport?.name} attendance records from the roster panel. Only affects ${mySport?.name} — no other sports. Continue?`)) return;
                  await api(`/api/attendance/sport/${mySport?.id}/clear`, { method: "POST" });
                } else {
                  if (!confirm("Clear attendance from your personal account only?")) return;
                  await api("/api/attendance/clear", { method: "POST" });
                }
                setMessage("Attendance cleared.");
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
            >
              Clear Attendance
            </button>
            <button
              onClick={async () => {
                const choice = confirm(
                  `RESTORE ATTENDANCE\n\nChoose scope:\n\n✅ Click OK → Restore for ALL athletes in ${mySport?.name} roster (global for this sport only)\n❌ Click Cancel → Restore your personal account only`
                );
                if (choice) {
                  await api(`/api/attendance/sport/${mySport?.id}/restore`, { method: "POST" });
                } else {
                  await api("/api/attendance/restore", { method: "POST" });
                }
                setMessage("Attendance restored.");
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all"
            >
              Restore Attendance
            </button>
          </div>
        </div>
      </div>

      {/* List Table */}
      <h2 className="font-display font-semibold mb-3 text-white">Roster Attendance History ({filteredAttendance.length})</h2>
      <div className="stat-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-white/40 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Athlete</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Time in</th>
              <th className="text-left px-4 py-3">Ground</th>
              <th className="text-left px-4 py-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 text-white">{a.user.fullName}</td>
                <td className="px-4 py-3">{new Date(a.timeIn).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(a.timeIn).toLocaleTimeString()}</td>
                <td className="px-4 py-3">{a.ground || "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {a.markedBy ? (
                    <span className="text-gold font-medium">Captain marked</span>
                  ) : (
                    <span className="text-white/40">Self check-in</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredAttendance.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-white/40">No attendance records found matching filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
