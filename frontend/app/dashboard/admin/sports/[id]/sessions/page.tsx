"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function AdminSportSessionsPage() {
  const { id: sportId } = useParams() as { id: string };
  const [sport, setSport] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [sportsList, sess] = await Promise.all([
        api("/api/sports"),
        api(`/api/admin-features/sessions?sportId=${sportId}`),
      ]);
      const found = sportsList.find((s: any) => s.id === sportId);
      if (!found) {
        setError("Sport not found");
        return;
      }
      setSport(found);
      setSessions(sess);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sportId]);

  async function handleDeleteSession(id: string) {
    if (!confirm("Are you sure you want to delete this session? This will remove all associated logs.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/sessions/${id}`, { method: "DELETE" });
      setMessage("Session deleted successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleExportCSV() {
    const dataToExport = sessions.flatMap((sess) =>
      sess.athleteLogs.map((log: any) => ({
        "Session Title": sess.title,
        "Start Time": new Date(sess.startTime).toLocaleString(),
        "Athlete Name": log.user.fullName,
        "Workout Name": log.workoutType.name,
        "Rounds / Status": log.value !== null && log.value !== undefined ? `${log.value} rounds` : log.completed ? "Completed" : "Not Completed",
      }))
    );
    exportToCSV(dataToExport, `${sport.name}_Session_Logs`);
  }

  function handleExportPDF() {
    const headers = ["Session Title", "Start Time", "Athlete Name", "Workout", "Rounds/Status"];
    const rows = sessions.flatMap((sess) =>
      sess.athleteLogs.map((log: any) => [
        sess.title,
        new Date(sess.startTime).toLocaleString(),
        log.user.fullName,
        log.workoutType.name,
        log.value !== null && log.value !== undefined ? `${log.value} rounds` : log.completed ? "Completed" : "Not Completed",
      ])
    );
    printReport(`${sport.name} - Training Sessions Log Report`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading sessions...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/admin/sports/${sportId}`} className="text-xs text-gold hover:underline">
          &larr; Back to Sport Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Conditioning Logs</h1>
          <p className="text-white/50 text-sm">Check training schedules and log metrics for {sport.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="space-y-4 max-w-3xl">
        <h2 className="font-display font-semibold text-white">Session logs ({sessions.length})</h2>
        {sessions.map((sess) => (
          <div key={sess.id} className="stat-card border border-white/5 hover:border-gold/20 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display font-semibold text-white">{sess.title}</h3>
                <p className="text-xs text-white/40">Scheduled for {new Date(sess.startTime).toLocaleString()}</p>
              </div>
              <button
                onClick={() => handleDeleteSession(sess.id)}
                className="text-xs text-red-400 hover:text-red-300"
                type="button"
              >
                Delete
              </button>
            </div>
            
            <div className="mt-4 border-t border-white/5 pt-3">
              <p className="text-xs text-white/40 font-semibold mb-2 uppercase">Workout Items</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-white/70">
                {sess.workouts.map((w: any) => (
                  <li key={w.id}>
                    {w.workoutType.name} {w.rounds ? "(Rounds tracked)" : ""}
                  </li>
                ))}
              </ul>
            </div>

            {sess.athleteLogs?.length > 0 && (
              <div className="mt-4 border-t border-white/5 pt-3">
                <p className="text-xs text-white/40 font-semibold mb-2 uppercase">Athlete Submissions</p>
                <div className="space-y-1.5 text-xs text-white/70">
                  {sess.athleteLogs.map((log: any) => (
                    <div key={log.id} className="flex justify-between border-b border-white/5 py-1">
                      <span>{log.user.fullName} ({log.workoutType.name})</span>
                      <span className="text-gold">
                        {log.value !== null && log.value !== undefined ? `${log.value} rounds` : log.completed ? "Completed" : "Not Completed"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {sessions.length === 0 && <p className="text-sm text-white/40">No sessions scheduled for this sport yet.</p>}
      </div>
    </div>
  );
}
