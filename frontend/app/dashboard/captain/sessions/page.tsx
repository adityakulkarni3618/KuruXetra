"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function CaptainSessionsPage() {
  const [mySport, setMySport] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<any[]>([]);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    startTime: "",
    workouts: [] as { workoutTypeId: string; rounds: boolean }[],
  });
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
        const [sess, types] = await Promise.all([
          api(`/api/admin-features/sessions?sportId=${sport.id}`),
          api("/api/admin-features/workout-types"),
        ]);
        setSessions(sess);
        setWorkoutTypes(types.filter((t: any) => t.isActive));
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
    exportToCSV(dataToExport, `${mySport.name}_Session_Logs`);
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
    printReport(`${mySport.name} - Training Sessions Log Report`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading sessions...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/captain" className="text-xs text-gold hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Conditioning Sessions</h1>
          <p className="text-white/50 text-sm">Create conditioning sessions and monitor athlete logs for {mySport?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Form */}
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3 text-white">Create Training Session</h2>
          <form onSubmit={handleCreateSession} className="space-y-4">
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

            <div className="border-t border-white/5 pt-4">
              <div className="flex justify-between items-center mb-3">
                <span className="label text-white/80">Workout Items</span>
                <button
                  type="button"
                  onClick={addWorkoutToForm}
                  className="text-xs text-gold border border-gold/20 bg-gold/10 px-2.5 py-1 rounded"
                >
                  + Add Workout
                </button>
              </div>

              {sessionForm.workouts.map((w, index) => (
                <div key={index} className="flex gap-3 items-end bg-surface p-3 rounded-lg border border-white/5 mb-2">
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
                    <span className="text-xs text-white/60">Rounds</span>
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
            <button type="submit" className="btn-gold w-full">Create Training Session</button>
          </form>
        </div>

        {/* Sessions Logs List */}
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-white">Training Sessions Log ({sessions.length})</h2>
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
          {sessions.length === 0 && <p className="text-sm text-white/40">No sessions logged yet.</p>}
        </div>
      </div>
    </div>
  );
}
