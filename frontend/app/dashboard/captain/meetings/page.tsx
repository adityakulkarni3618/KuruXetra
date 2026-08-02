"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function CaptainMeetingsPage() {
  const [mySport, setMySport] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ title: "", description: "", scheduledAt: "" });
  const [meetingScores, setMeetingScores] = useState<Record<string, { userId: string; points: string }>>({});
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
        const [mems, meets] = await Promise.all([
          api(`/api/sports/${sport.id}/members`),
          api(`/api/admin-features/meetings?sportId=${sport.id}`),
        ]);
        setMembers(mems);
        setMeetings(meets);
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

  async function scheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/admin-features/meetings", {
        method: "POST",
        body: JSON.stringify({
          sportId: mySport.id,
          title: scheduleForm.title,
          description: scheduleForm.description,
          scheduledAt: scheduleForm.scheduledAt,
        }),
      });
      setScheduleForm({ title: "", description: "", scheduledAt: "" });
      setMessage("Meeting scheduled successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function scoreMeeting(meetingId: string) {
    const score = meetingScores[meetingId];
    if (!score?.userId || !score?.points) {
      setError("Select a team member and enter points.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/meetings/${meetingId}/scores`, {
        method: "POST",
        body: JSON.stringify({ userId: score.userId, points: Number(score.points) }),
      });
      setMeetingScores((prev) => ({ ...prev, [meetingId]: { userId: "", points: "" } }));
      setMessage("Score recorded successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

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
    exportToCSV(dataToExport, `${mySport.name}_Meeting_Scores`);
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
    printReport(`${mySport.name} - Meeting Scores Report`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading meetings...</div>;
  }

  const approved = members.filter((m) => m.status === "APPROVED");

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/captain" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Team Meetings</h1>
          <p className="text-white/50 text-sm">Schedule and score roster team meetings for {mySport?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Schedule Form */}
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3 text-white">Schedule a meeting</h2>
          <form onSubmit={scheduleMeeting} className="space-y-4">
            <label className="block">
              <span className="label">Title</span>
              <input
                className="input-field"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="label">Date & time</span>
              <input
                className="input-field"
                type="datetime-local"
                value={scheduleForm.scheduledAt}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="label">Description</span>
              <textarea
                className="input-field min-h-[120px]"
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn-gold">Schedule meeting</button>
          </form>
        </div>

        {/* List & Score */}
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-white">Meeting Schedule ({meetings.length})</h2>
          {meetings.map((meeting) => {
            const isEnded = meeting.status === "ENDED";
            return (
              <div key={meeting.id} className="stat-card border border-white/5 hover:border-gold/20 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold text-white">{meeting.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        !isEnded ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/40"
                      }`}>
                        {meeting.status || "ACTIVE"}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">Scheduled for {new Date(meeting.scheduledAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {!isEnded && (
                      <button
                        onClick={async () => {
                          if (!confirm("Are you sure you want to end this meeting? Further scoring will be closed.")) return;
                          try {
                            await api(`/api/admin-features/meetings/${meeting.id}/end`, { method: "POST" });
                            setMessage("Meeting ended successfully.");
                            await load();
                          } catch (err: any) {
                            setError(err.message);
                          }
                        }}
                        className="text-xs text-gold border border-gold/20 bg-gold/10 px-2 py-0.5 rounded hover:bg-gold/20 font-medium"
                        type="button"
                      >
                        End Meeting
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/50 mt-3">{meeting.description || "No description provided."}</p>
                
                {!isEnded && (
                  <>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="label">Select athlete</span>
                        <select
                          className="input-field text-xs"
                          value={meetingScores[meeting.id]?.userId || ""}
                          onChange={(e) => setMeetingScores((prev) => ({
                            ...prev,
                            [meeting.id]: { userId: e.target.value, points: prev[meeting.id]?.points || "" },
                          }))}
                        >
                          <option value="">Choose athlete</option>
                          {approved.map((m) => (
                            <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="label">Points (0-10)</span>
                        <input
                          className="input-field text-xs"
                          type="number"
                          min="0"
                          max="10"
                          value={meetingScores[meeting.id]?.points || ""}
                          onChange={(e) => setMeetingScores((prev) => ({
                            ...prev,
                            [meeting.id]: { userId: prev[meeting.id]?.userId || "", points: e.target.value },
                          }))}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => scoreMeeting(meeting.id)}
                      className="btn-gold mt-4 text-xs py-1.5 px-3"
                    >
                      Record score
                    </button>
                  </>
                )}

                {meeting.scores?.length > 0 && (
                  <div className="mt-4 text-xs text-white/50 border-t border-white/5 pt-3">
                    <p className="font-medium mb-2 text-white">Scores awarded</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {meeting.scores.map((score: any) => (
                        <li key={score.id}>{score.user.fullName}: {score.points} pts</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
          {meetings.length === 0 && <p className="text-sm text-white/40">No meetings scheduled yet.</p>}
        </div>
      </div>
    </div>
  );
}
