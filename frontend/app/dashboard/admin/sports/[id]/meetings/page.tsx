"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function AdminSportMeetingsPage() {
  const { id: sportId } = useParams() as { id: string };
  const [sport, setSport] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [sportsList, meets] = await Promise.all([
        api("/api/sports"),
        api(`/api/admin-features/meetings?sportId=${sportId}`),
      ]);
      const found = sportsList.find((s: any) => s.id === sportId);
      if (!found) {
        setError("Sport not found");
        return;
      }
      setSport(found);
      setMeetings(meets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sportId]);

  async function handleDeleteMeeting(id: string) {
    if (!confirm("Are you sure you want to delete this meeting? This will also remove any scores recorded for this meeting.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/meetings/${id}`, { method: "DELETE" });
      setMessage("Meeting deleted successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleExportCSV() {
    const dataToExport = meetings.flatMap((m) =>
      m.scores.map((s: any) => ({
        "Meeting Title": m.title,
        "Date": new Date(m.scheduledAt).toLocaleDateString(),
        "Athlete Name": s.user.fullName,
        "Score / Points": s.points,
      }))
    );
    exportToCSV(dataToExport, `${sport.name}_Meeting_Scores`);
  }

  function handleExportPDF() {
    const headers = ["Meeting Title", "Date", "Athlete Name", "Score"];
    const rows = meetings.flatMap((m) =>
      m.scores.map((s: any) => [
        m.title,
        new Date(m.scheduledAt).toLocaleDateString(),
        s.user.fullName,
        `${s.points} pts`,
      ])
    );
    printReport(`${sport.name} - Meeting Scores Report`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading meetings...</div>;
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
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Team Meetings log</h1>
          <p className="text-white/50 text-sm">Monitor meeting logs and check recorded points for {sport.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="space-y-4 max-w-3xl">
        <h2 className="font-display font-semibold text-white">Meeting Logs ({meetings.length})</h2>
        {meetings.map((meeting) => (
          <div key={meeting.id} className="stat-card border border-white/5 hover:border-gold/20 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display font-semibold text-white">{meeting.title}</h3>
                <p className="text-xs text-white/40">Scheduled for {new Date(meeting.scheduledAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => handleDeleteMeeting(meeting.id)}
                className="text-xs text-red-400 hover:text-red-300"
                type="button"
              >
                Delete
              </button>
            </div>
            <p className="text-sm text-white/50 mt-3">{meeting.description || "No description provided."}</p>

            {meeting.scores?.length > 0 && (
              <div className="mt-4 text-xs text-white/50 border-t border-white/5 pt-3">
                <p className="font-medium mb-2 text-white">Recorded Scores</p>
                <ul className="list-disc pl-5 space-y-1">
                  {meeting.scores.map((score: any) => (
                    <li key={score.id}>{score.user.fullName}: {score.points} pts</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {meetings.length === 0 && <p className="text-sm text-white/40">No meetings scheduled for this sport.</p>}
      </div>
    </div>
  );
}
