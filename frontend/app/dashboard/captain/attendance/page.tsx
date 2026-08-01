"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function CaptainAttendancePage() {
  const [mySport, setMySport] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [markForm, setMarkForm] = useState({ userId: "", ground: "" });
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "week", "month", "custom"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
      const sport = sports.find((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
      setMySport(sport);
      if (sport) {
        const [mems, att] = await Promise.all([
          api(`/api/sports/${sport.id}/members`),
          api(`/api/attendance/sport/${sport.id}`),
        ]);
        setMembers(mems);
        setAttendance(att);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAthleteAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!markForm.userId) {
      setError("Please select an athlete to mark attendance.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api("/api/attendance/mark", {
        method: "POST",
        body: JSON.stringify({
          userId: markForm.userId,
          sportId: mySport.id,
          ground: markForm.ground || undefined,
        }),
      });
      setMarkForm({ userId: "", ground: "" });
      setMessage("Attendance marked successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

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

  const approved = members.filter((m) => m.status === "APPROVED");

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/captain" className="text-xs text-gold hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Attendance Reports</h1>
          <p className="text-white/50 text-sm">Mark roster attendance and export filtered history logs for {mySport?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      {/* Mark Attendance Card */}
      <div className="stat-card mb-8">
        <h2 className="font-display font-semibold mb-3 text-white">Mark present</h2>
        <form onSubmit={markAthleteAttendance} className="grid md:grid-cols-3 gap-4 items-end">
          <label className="block">
            <span className="label">Select athlete</span>
            <select
              className="input-field"
              value={markForm.userId}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, userId: e.target.value }))}
              required
            >
              <option value="">Choose athlete</option>
              {approved.map((m) => (
                <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Ground</span>
            <input
              className="input-field"
              value={markForm.ground}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, ground: e.target.value }))}
              placeholder="e.g. Main Ground"
            />
          </label>
          <button type="submit" className="btn-gold">Mark present</button>
        </form>
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
