"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function CaptainSessionsPage() {
  const [mySport, setMySport] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    startTime: "",
    exercises: [] as { name: string; rounds: boolean }[],
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Per-session "add exercise" state
  const [addExerciseSessionId, setAddExerciseSessionId] = useState<string | null>(null);
  const [addExerciseName, setAddExerciseName] = useState("");
  const [addExerciseRounds, setAddExerciseRounds] = useState(false);
  const [addExerciseLoading, setAddExerciseLoading] = useState(false);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
      const sport = sports.find((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
      setMySport(sport);
      if (sport) {
        const sess = await api(`/api/admin-features/sessions?sportId=${sport.id}`);
        setSessions(sess);
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

  // ── Form exercise helpers ──────────────────────────────────────────────────
  const addExerciseToForm = () => {
    setSessionForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, { name: "", rounds: false }],
    }));
  };

  const removeExerciseFromForm = (index: number) => {
    setSessionForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const updateExerciseInForm = (index: number, field: string, val: any) => {
    setSessionForm((prev) => {
      const copy = [...prev.exercises];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, exercises: copy };
    });
  };

  // ── Create session ─────────────────────────────────────────────────────────
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionForm.exercises.length === 0) {
      setError("Please add at least one exercise to the session.");
      return;
    }
    if (sessionForm.exercises.some((ex) => !ex.name.trim())) {
      setError("All exercise names must be filled in.");
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
          exercises: sessionForm.exercises.map((e) => ({ name: e.name.trim(), rounds: e.rounds })),
        }),
      });
      setSessionForm({ title: "", startTime: "", exercises: [] });
      setMessage("Training session created successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Add exercise to active session ─────────────────────────────────────────
  const handleAddExerciseToSession = async (sessionId: string) => {
    if (!addExerciseName.trim()) return;
    setAddExerciseLoading(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/sessions/${sessionId}/add-exercise`, {
        method: "POST",
        body: JSON.stringify({ name: addExerciseName.trim(), rounds: addExerciseRounds }),
      });
      setAddExerciseName("");
      setAddExerciseRounds(false);
      setAddExerciseSessionId(null);
      setMessage("Exercise added to session.");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddExerciseLoading(false);
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

  async function handleEndSession(id: string) {
    if (!confirm("Are you sure you want to end this training session? No further athlete logging will be allowed.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/sessions/${id}/end`, { method: "POST" });
      setMessage("Session ended. Athletes can no longer submit logs.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleReviewLog(sessionId: string, logId: string, status: "APPROVED" | "REJECTED") {
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/sessions/${sessionId}/review-logs`, {
        method: "POST",
        body: JSON.stringify({
          reviews: [{ logId, status }]
        }),
      });
      setMessage(`Log ${status.toLowerCase()}.`);
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
        "Exercise": log.customExerciseName || log.workoutType?.name || "—",
        "Rounds / Status": log.value !== null && log.value !== undefined ? `${log.value} rounds` : log.completed ? "Completed" : "Not Completed",
      }))
    );
    exportToCSV(dataToExport, `${mySport.name}_Session_Logs`);
  }

  function handleExportPDF() {
    const headers = ["Session Title", "Start Time", "Athlete Name", "Exercise", "Rounds/Status"];
    const rows = sessions.flatMap((sess) =>
      sess.athleteLogs.map((log: any) => [
        sess.title,
        new Date(sess.startTime).toLocaleString(),
        log.user.fullName,
        log.customExerciseName || log.workoutType?.name || "—",
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
        <Link href="/dashboard/captain" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Dashboard
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
        {/* ── Create Session Form ── */}
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-4 text-white">Create Training Session</h2>
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
                <span className="label text-white/80">Exercises</span>
                <button
                  type="button"
                  onClick={addExerciseToForm}
                  className="text-xs text-gold border border-gold/20 bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Add Exercise
                </button>
              </div>

              {sessionForm.exercises.length === 0 && (
                <p className="text-xs text-white/30 text-center py-3 border border-dashed border-white/10 rounded-lg">
                  Click "Add Exercise" to add exercises to this session
                </p>
              )}

              {sessionForm.exercises.map((ex, index) => (
                <div key={index} className="flex gap-3 items-start bg-surface p-3 rounded-lg border border-white/5 mb-2">
                  <div className="flex-1 space-y-2">
                    <input
                      className="input-field text-xs"
                      placeholder="Exercise name (e.g. Push-ups, Sprints, Squats)"
                      value={ex.name}
                      onChange={(e) => updateExerciseInForm(index, "name", e.target.value)}
                      required
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ex.rounds}
                        onChange={(e) => updateExerciseInForm(index, "rounds", e.target.checked)}
                        className="rounded border-white/20 bg-surface text-gold focus:ring-gold"
                      />
                      <span className="text-xs text-white/60">Track rounds</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExerciseFromForm(index)}
                    className="text-xs text-red-400 hover:text-red-300 mt-1 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>

            <button type="submit" className="btn-gold w-full">Create Training Session</button>
          </form>
        </div>

        {/* ── Sessions Log ── */}
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-white">Training Sessions Log ({sessions.length})</h2>
          {sessions.map((sess) => (
            <div key={sess.id} className="stat-card border border-white/5 hover:border-gold/10 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-white">{sess.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      sess.status === "ACTIVE" ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/40"
                    }`}>
                      {sess.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {new Date(sess.startTime).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {sess.status === "ACTIVE" && (
                    <button
                      onClick={() => handleEndSession(sess.id)}
                      className="text-xs text-gold border border-gold/20 bg-gold/10 px-2 py-0.5 rounded hover:bg-gold/20 transition-all font-medium"
                      type="button"
                    >
                      End Session
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSession(sess.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Exercises List */}
              <div className="mt-4 border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40 font-semibold uppercase">Exercises ({sess.workouts.length})</p>
                  {sess.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddExerciseSessionId(addExerciseSessionId === sess.id ? null : sess.id);
                        setAddExerciseName("");
                        setAddExerciseRounds(false);
                      }}
                      className="text-[10px] text-gold border border-gold/20 bg-gold/10 hover:bg-gold/20 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                      Add Exercise
                    </button>
                  )}
                </div>

                <ul className="space-y-1.5 mb-3">
                  {sess.workouts.map((w: any) => (
                    <li key={w.id} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
                      {w.customName || w.workoutType?.name}
                      {w.rounds && <span className="text-[10px] text-white/30 ml-1">(rounds tracked)</span>}
                    </li>
                  ))}
                  {sess.workouts.length === 0 && (
                    <li className="text-xs text-white/30">No exercises yet.</li>
                  )}
                </ul>

                {/* Inline add-exercise form (only for active session) */}
                {addExerciseSessionId === sess.id && (
                  <div className="bg-surface/60 border border-white/10 rounded-lg p-3 mb-3 space-y-2">
                    <input
                      className="input-field text-xs"
                      placeholder="Exercise name (e.g. Sprints, Plank, Dribbling)"
                      value={addExerciseName}
                      onChange={(e) => setAddExerciseName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addExerciseRounds}
                          onChange={(e) => setAddExerciseRounds(e.target.checked)}
                          className="rounded border-white/20 bg-surface text-gold focus:ring-gold"
                        />
                        <span className="text-xs text-white/60">Track rounds</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAddExerciseSessionId(null)}
                          className="text-xs text-white/40 hover:text-white/70 px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddExerciseToSession(sess.id)}
                          disabled={addExerciseLoading || !addExerciseName.trim()}
                          className="btn-gold text-xs px-3 py-1.5"
                        >
                          {addExerciseLoading ? "Adding..." : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Athlete Submissions */}
              {sess.athleteLogs?.length > 0 && (
                <div className="border-t border-white/5 pt-3">
                  <p className="text-xs text-white/40 font-semibold mb-2 uppercase">Athlete Submissions</p>
                  <div className="space-y-2 text-xs text-white/70">
                    {sess.athleteLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between border-b border-white/5 py-1.5 flex-wrap gap-2">
                        <div>
                          <span className="font-medium text-white">{log.user.fullName}</span>
                          <span className="text-white/40 ml-1">({log.customExerciseName || log.workoutType?.name})</span>
                          <span className="text-gold ml-2">
                            {log.value !== null && log.value !== undefined ? `${log.value} rounds` : log.completed ? "Completed" : "Not Completed"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {log.status === "PENDING" ? (
                            <>
                              <button
                                onClick={() => handleReviewLog(sess.id, log.id, "APPROVED")}
                                className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded font-medium hover:bg-green-500/30 transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewLog(sess.id, log.id, "REJECTED")}
                                className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-medium hover:bg-red-500/30 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${
                              log.status === "APPROVED" ? "text-green-400" : "text-red-400"
                            }`}>
                              {log.status}
                            </span>
                          )}
                        </div>
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
