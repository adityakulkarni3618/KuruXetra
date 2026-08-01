"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function CaptainPage() {
  const { user } = useAuth();
  const [mySport, setMySport] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<any[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ title: "", description: "", scheduledAt: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
  const [meetingScores, setMeetingScores] = useState<Record<string, { userId: string; points: string }>>({});
  const [markForm, setMarkForm] = useState({ userId: "", ground: "" });
  const [sessionForm, setSessionForm] = useState({
    title: "",
    startTime: "",
    workouts: [] as { workoutTypeId: string; rounds: boolean }[],
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
    const sport = sports.find((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
    setMySport(sport);
    if (sport) {
      const [m, a, ann, meet, sess, types] = await Promise.all([
        api(`/api/sports/${sport.id}/members`),
        api(`/api/attendance/sport/${sport.id}`),
        api(`/api/admin-features/announcements?sportId=${sport.id}`),
        api(`/api/admin-features/meetings?sportId=${sport.id}`),
        api(`/api/admin-features/sessions?sportId=${sport.id}`),
        api("/api/admin-features/workout-types"),
      ]);
      setMembers(m);
      setAttendance(a);
      setAnnouncements(ann);
      setMeetings(meet);
      setSessions(sess);
      setWorkoutTypes(types.filter((t: any) => t.isActive));
    }
  }
  useEffect(() => { load(); }, []);

  async function review(membershipId: string, decision: "APPROVED" | "REJECTED") {
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/memberships/${membershipId}/review`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setMessage("Membership decision saved.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeMember(membershipId: string) {
    if (!confirm("Are you sure you want to remove this athlete from your team roster? Their personal profile will remain in the system.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/memberships/${membershipId}/remove-member`, {
        method: "POST",
      });
      setMessage("Athlete removed from team roster.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function awardBadge(userId: string, badgeName: "MVP" | "Team Leader") {
    if (!confirm(`Are you sure you want to award the ${badgeName} badge to this athlete?`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${mySport.id}/award-badge`, {
        method: "POST",
        body: JSON.stringify({ userId, badgeName }),
      });
      setMessage(`${badgeName} badge awarded successfully.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }
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

  const addWorkoutToForm = () => {
    setSessionForm((prev) => ({
      ...prev,
      workouts: [...prev.workouts, { workoutTypeId: "", rounds: false }],
    }));
  };

  const removeWorkoutFromForm = (index: number) => {
    setSessionForm((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((_, i) => i !== index),
    }));
  };

  const updateWorkoutInForm = (index: number, field: string, val: any) => {
    setSessionForm((prev) => {
      const copy = [...prev.workouts];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, workouts: copy };
    });
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionForm.workouts.length === 0) {
      setError("Please add at least one workout to the session.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api("/api/admin-features/sessions", {
        method: "POST",
        body: JSON.stringify({
          sportId: mySport.id,
          title: sessionForm.title,
          startTime: sessionForm.startTime,
          workouts: sessionForm.workouts,
        }),
      });
      setSessionForm({ title: "", startTime: "", workouts: [] });
      setMessage("Training session created successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

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
      setMessage("Meeting scheduled.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/admin-features/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: announcementForm.title,
          body: announcementForm.body,
          sportId: mySport.id,
        }),
      });
      setAnnouncementForm({ title: "", body: "" });
      setMessage("Announcement posted.");
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
      setMessage("Score recorded.");
      setMeetingScores((prev) => ({ ...prev, [meetingId]: { userId: "", points: "" } }));
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
      <p className="text-white/50 text-sm mb-8">Approve join requests, schedule meetings, and share announcements with your team.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

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
          <div key={m.id} className="stat-card flex justify-between items-center">
            <div>
              <p className="font-medium">{m.user.fullName}</p>
              <p className="text-xs text-white/40">{m.user.uniqueId} · {m.user.department}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => awardBadge(m.user.id, "MVP")}
                className="btn-primary bg-purple-600 hover:bg-purple-500 text-xs px-3 py-1.5"
                type="button"
              >
                Award MVP
              </button>
              <button
                onClick={() => awardBadge(m.user.id, "Team Leader")}
                className="btn-primary bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5"
                type="button"
              >
                Award Team Leader
              </button>
              <button
                onClick={() => removeMember(m.id)}
                className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5"
                type="button"
              >
                Remove from Team
              </button>
            </div>
          </div>
        ))}
        {approved.length === 0 && <p className="text-sm text-white/40">No approved members yet.</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3">Schedule a meeting</h2>
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

        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3">Post announcement</h2>
          <form onSubmit={postAnnouncement} className="space-y-4">
            <label className="block">
              <span className="label">Title</span>
              <input
                className="input-field"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="label">Body</span>
              <textarea
                className="input-field min-h-[120px]"
                value={announcementForm.body}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, body: e.target.value }))}
                required
              />
            </label>
            <button type="submit" className="btn-gold">Post announcement</button>
          </form>
        </div>
      </div>

      <h2 className="font-display font-semibold mb-3">Upcoming meetings</h2>
      <div className="space-y-3 mb-10">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="stat-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{meeting.title}</p>
                <p className="text-xs text-white/40">Scheduled for {new Date(meeting.scheduledAt).toLocaleString()}</p>
              </div>
              <span className="text-xs text-white/40">{meeting.sport?.name}</span>
            </div>
            <p className="text-sm text-white/50 mt-3">{meeting.description || "No description provided."}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="label">Select athlete</span>
                <select
                  className="input-field"
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
                <span className="label">Points</span>
                <input
                  className="input-field"
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
              className="btn-gold mt-4"
            >
              Record score
            </button>
            {meeting.scores?.length > 0 && (
              <div className="mt-4 text-sm text-white/50">
                <p className="font-medium mb-2">Existing scores</p>
                <ul className="list-disc pl-5 space-y-1">
                  {meeting.scores.map((score: any) => (
                    <li key={score.id}>{score.user.fullName}: {score.points} pts</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {meetings.length === 0 && <p className="text-sm text-white/40">No meetings scheduled yet.</p>}
      </div>

      <div className="stat-card mb-10">
        <h2 className="font-display font-semibold mb-3">Create Training Session</h2>
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Session Title</span>
              <input
                className="input-field"
                value={sessionForm.title}
                onChange={(e) => setSessionForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Morning Conditioning"
                required
              />
            </label>
            <label className="block">
              <span className="label">Start Time</span>
              <input
                className="input-field"
                type="datetime-local"
                value={sessionForm.startTime}
                onChange={(e) => setSessionForm((prev) => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </label>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="label text-white/80">Workout Items</span>
              <button
                type="button"
                onClick={addWorkoutToForm}
                className="text-xs text-gold border border-gold/20 bg-gold/10 px-2.5 py-1 rounded hover:bg-gold/20 transition-all"
              >
                + Add Workout
              </button>
            </div>

            {sessionForm.workouts.map((w, index) => (
              <div key={index} className="flex gap-4 items-end bg-surface p-3 rounded-lg border border-white/5 mb-2">
                <label className="block flex-1">
                  <span className="label text-xs">Workout Type</span>
                  <select
                    className="input-field text-xs"
                    value={w.workoutTypeId}
                    onChange={(e) => updateWorkoutInForm(index, "workoutTypeId", e.target.value)}
                    required
                  >
                    <option value="">Choose workout type</option>
                    {workoutTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 pb-3.5">
                  <input
                    type="checkbox"
                    checked={w.rounds}
                    onChange={(e) => updateWorkoutInForm(index, "rounds", e.target.checked)}
                    className="rounded border-white/20 bg-surface text-gold focus:ring-gold"
                  />
                  <span className="text-xs text-white/60">Track Rounds</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeWorkoutFromForm(index)}
                  className="text-xs text-red-400 hover:text-red-300 pb-3"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button type="submit" className="btn-gold mt-4 w-full">Create Training Session</button>
        </form>
      </div>

      <div className="stat-card mb-6">
        <h2 className="font-display font-semibold mb-3">Mark athlete attendance</h2>
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

      <h2 className="font-display font-semibold mb-3">Training Sessions Log</h2>
      <div className="space-y-4 mb-10">
        {sessions.map((sess) => (
          <div key={sess.id} className="stat-card">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display font-semibold text-white">{sess.title}</h3>
                <p className="text-xs text-white/40">Scheduled for {new Date(sess.startTime).toLocaleString()}</p>
              </div>
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
        {sessions.length === 0 && <p className="text-sm text-white/40">No training sessions created yet.</p>}
      </div>

      <h2 className="font-display font-semibold mb-3">Recent team attendance</h2>
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
            {attendance.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3">{a.user.fullName}</td>
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
            {attendance.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-white/40">No attendance yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
