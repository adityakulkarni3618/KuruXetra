"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function AdminSportAttendancePage() {
  const { id: sportId } = useParams() as { id: string };
  const [sport, setSport] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    try {
      const [sportsList, att] = await Promise.all([
        api("/api/sports"),
        api(`/api/attendance/sport/${sportId}`),
      ]);
      const found = sportsList.find((s: any) => s.id === sportId);
      if (!found) {
        setError("Sport not found");
        return;
      }
      setSport(found);
      setAttendance(att);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sportId]);

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
    exportToCSV(dataToExport, `${sport.name}_Attendance_${dateFilter}`);
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
    printReport(`${sport.name} - Attendance Report (${dateFilter})`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading attendance reports...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/admin/sports/${sportId}`} className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Sport Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Attendance Database</h1>
          <p className="text-white/50 text-sm">Monitor check-in logs and print custom date sheets for {sport.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      {/* Filters */}
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

      {/* Logs Table */}
      <h2 className="font-display font-semibold mb-3 text-white">Attendance Log Records ({filteredAttendance.length})</h2>
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
