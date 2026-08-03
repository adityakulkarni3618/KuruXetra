"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { printReport } from "@/lib/export";

const emptyForm = {
  workoutName: "",
  exercise: "",
  sets: "",
  reps: "",
  weightKg: "",
  durationMin: "",
  calories: "",
  notes: "",
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [roundsForm, setRoundsForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sessionCheckInStates, setSessionCheckInStates] = useState<Record<string, { checkInTime: string; loading: boolean }>>({});
  const [pdfStart, setPdfStart] = useState("");
  const [pdfEnd, setPdfEnd] = useState("");

  const downloadPdf = () => {
    let filtered = workouts;
    if (pdfStart) {
      const start = new Date(pdfStart).getTime();
      filtered = filtered.filter(w => new Date(w.createdAt).getTime() >= start);
    }
    if (pdfEnd) {
      const end = new Date(pdfEnd);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(w => new Date(w.createdAt).getTime() <= end.getTime());
    }

    const headers = ["Workout / Exercise", "Sets", "Reps", "Weight (kg)", "Duration (min)", "Calories", "Date", "Notes"];
    const rows = filtered.map(w => [
      w.name,
      w.sets || "—",
      w.reps || "—",
      w.weightKg || "—",
      w.durationMin || "—",
      w.calories || "—",
      new Date(w.createdAt).toLocaleDateString(),
      w.notes || "—"
    ]);

    printReport(`${me?.fullName || "Athlete"}'s Workout History Report`, headers, rows);
  };

  const downloadSessionsPdf = () => {
    let filtered = endedSessions;
    if (pdfStart) {
      const start = new Date(pdfStart).getTime();
      filtered = filtered.filter(s => new Date(s.startTime).getTime() >= start);
    }
    if (pdfEnd) {
      const end = new Date(pdfEnd);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.startTime).getTime() <= end.getTime());
    }

    const headers = ["Session Title", "Sport", "Date", "Exercise Name", "Status/Value"];
    const rows: any[][] = [];
    
    filtered.forEach(sess => {
      const myLogs = sess.athleteLogs?.filter((l: any) => l.userId === me?.id && !l.isCleared) || [];
      sess.workouts.forEach((w: any) => {
        const exName = w.customName || w.workoutType?.name || "Exercise";
        const myLog = myLogs.find((l: any) => l.customExerciseName === exName || l.workoutTypeId === w.workoutTypeId);
        rows.push([
          sess.title,
          sess.sport?.name,
          new Date(sess.startTime).toLocaleDateString(),
          exName,
          myLog ? `${myLog.status} ${myLog.value ? `(${myLog.value})` : ""}` : "Absent"
        ]);
      });
    });

    printReport(`${me?.fullName || "Athlete"}'s Past Team Sessions Report`, headers, rows);
  };

  async function load() {
    const [w, m, s, att] = await Promise.all([
      api("/api/workouts/me"),
      api("/api/auth/me"),
      api("/api/admin-features/sessions"),
      api("/api/attendance/me"),
    ]);
    setWorkouts(w);
    setMe(m);
    setSessions(s);

    // Auto-populate check in state from attendance logs matching the sports
    const checkedInMap: Record<string, { checkInTime: string; loading: boolean }> = {};
    if (att && s) {
      s.forEach((sess: any) => {
        // Find attendance entry for this sport on the same day as the session
        const sessDate = new Date(sess.startTime).toDateString();
        const matchingAtt = att.find((a: any) => {
          return a.sportId === sess.sportId && new Date(a.timeIn).toDateString() === sessDate;
        });
        if (matchingAtt) {
          checkedInMap[sess.id] = {
            checkInTime: new Date(matchingAtt.timeIn).toLocaleTimeString(),
            loading: false
          };
        }
      });
    }
    setSessionCheckInStates(checkedInMap);
  }
  useEffect(() => { load(); }, []);

  async function handleSessionCheckIn(sessionId: string, sportId: string) {
    setSessionCheckInStates(prev => ({ ...prev, [sessionId]: { checkInTime: "", loading: true } }));
    setSessionError("");
    try {
      const res = await api("/api/attendance/checkin", {
        method: "POST",
        body: JSON.stringify({ sportId }),
      });
      setSessionCheckInStates(prev => ({
        ...prev,
        [sessionId]: { checkInTime: new Date(res.timeIn).toLocaleTimeString(), loading: false }
      }));
      await load();
    } catch (err: any) {
      setSessionError(err.message || "Failed to check in.");
      setSessionCheckInStates(prev => ({ ...prev, [sessionId]: { checkInTime: "", loading: false } }));
    }
  }

  // ── Log a session exercise ──────────────────────────────────────────────
  async function submitSessionLog(
    sessionId: string,
    sessionWorkoutId: string,
    exerciseName: string,
    rounds: boolean,
    value?: number
  ) {
    setSessionError("");
    try {
      await api(`/api/admin-features/sessions/${sessionId}/logs`, {
        method: "POST",
        body: JSON.stringify({
          sessionWorkoutId,
          completed: true,
          value: rounds ? value : undefined,
        }),
      });
      await load();
    } catch (err: any) {
      setSessionError(err.message);
    }
  }

  // ── Log a personal workout (free text) ─────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: any = {
        name: form.workoutName.trim(),
        exercise: form.exercise || undefined,
        notes: form.notes || undefined,
      };
      for (const k of ["sets", "reps", "weightKg", "durationMin", "calories"] as const) {
        if (form[k]) payload[k] = Number(form[k]);
      }
      await api("/api/workouts", { method: "POST", body: JSON.stringify(payload) });
      setForm(emptyForm);
      setShowLogForm(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const mySportIds = new Set((me?.memberships || []).filter((ms: any) => ms.status === "APPROVED").map((ms: any) => ms.sportId));
  const activeSessions = sessions.filter((sess) => mySportIds.has(sess.sportId) && sess.status === "ACTIVE");
  const endedSessions = sessions.filter((sess) => mySportIds.has(sess.sportId) && sess.status === "ENDED");

  // ── Detail Page: Log Workout ────────────────────────────────────────────
  if (showLogForm) {
    return (
      <div>
        <div className="mb-6">
          <button onClick={() => { setShowLogForm(false); setForm(emptyForm); setError(""); }} className="btn-back">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Workouts
          </button>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white">Log Personal Workout</h1>
          <p className="text-white/50 text-sm mt-1">Record your own workout — sets, reps, duration, and notes.</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

        <form onSubmit={submit} className="stat-card max-w-2xl space-y-4">
          <label className="block">
            <span className="label">Workout / Exercise Name <span className="text-red-400">*</span></span>
            <input
              className="input-field"
              placeholder="e.g. Morning Gym, Sprints, Strength Training"
              value={form.workoutName}
              onChange={(e) => setForm({ ...form, workoutName: e.target.value })}
              required
              autoFocus
            />
          </label>

          <label className="block">
            <span className="label">Exercise Details</span>
            <input
              className="input-field"
              placeholder="e.g. Bench Press, Squats, Cardio"
              value={form.exercise}
              onChange={(e) => setForm({ ...form, exercise: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="label">Sets</span>
              <input className="input-field" type="number" min="1" placeholder="0" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Reps</span>
              <input className="input-field" type="number" min="1" placeholder="0" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Weight (kg)</span>
              <input className="input-field" type="number" min="0" step="0.5" placeholder="0" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Duration (min)</span>
              <input className="input-field" type="number" min="1" placeholder="0" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Calories</span>
              <input className="input-field" type="number" min="0" placeholder="0" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
            </label>
          </div>

          <label className="block">
            <span className="label">Notes</span>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Any notes about this workout..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-gold flex-1">
              {loading ? "Saving..." : "Save Workout"}
            </button>
            <button type="button" onClick={() => { setShowLogForm(false); setForm(emptyForm); }} className="btn-back flex-1 justify-center">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Main Workouts List Page ─────────────────────────────────────────────
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Workouts</h1>
          <p className="text-white/50 text-sm mt-1">Log training sessions and track your personal workouts.</p>
        </div>
        <button onClick={() => setShowLogForm(true)} className="btn-gold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Log Workout
        </button>
      </div>

      {sessionError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{sessionError}</div>}

      {/* ── Active Team Sessions ── */}
      {activeSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Active Training Sessions
          </h2>
          <div className="space-y-4">
            {activeSessions.map((sess) => {
              const checkInState = sessionCheckInStates[sess.id] || { checkInTime: "", loading: false };
              return (
                <div key={sess.id} className="stat-card border border-green-500/20 hover:border-green-500/30 transition-all">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-white">{sess.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-green-500/20 text-green-300">ACTIVE</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">{sess.sport?.name} · {new Date(sess.startTime).toLocaleString()}</p>
                    </div>
                    {/* Session Check-In Button */}
                    <div>
                      {checkInState.checkInTime ? (
                        <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-1 rounded">
                          Checked In at {checkInState.checkInTime}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={checkInState.loading}
                          onClick={() => {
                            const startTime = new Date(sess.startTime).getTime();
                            const now = Date.now();
                            if (now < startTime) {
                              alert(`You can only check in after the session starts at ${new Date(sess.startTime).toLocaleTimeString()}`);
                              return;
                            }
                            handleSessionCheckIn(sess.id, sess.sportId);
                          }}
                          className="text-xs text-gold border border-gold/25 bg-gold/5 px-2.5 py-1 rounded hover:bg-gold/15 transition-all font-semibold disabled:opacity-55"
                        >
                          {checkInState.loading ? "Checking in..." : "Check In for Session"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {sess.workouts.map((w: any) => {
                      const exName = w.customName || w.workoutType?.name || "Exercise";
                      const key = `${sess.id}_${w.id}`;
                      const myLog = sess.athleteLogs?.find(
                        (log: any) => log.userId === me?.id &&
                        (log.customExerciseName === exName || log.workoutTypeId === w.workoutTypeId)
                      );
                      const isLogged = !!myLog;

                      return (
                        <div key={w.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-white/5 text-sm">
                          <div>
                            <span className="font-medium text-white">{exName}</span>
                            {isLogged && (
                              <span className={`text-xs ml-2 font-medium ${
                                myLog.status === "APPROVED" ? "text-green-400" :
                                myLog.status === "REJECTED" ? "text-red-400" : "text-yellow-400"
                              }`}>
                                ✓ {myLog.value ? `${myLog.value} completed` : "Done"} ({myLog.status})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isLogged ? (
                              <>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="How many?"
                                  className="input-field text-xs py-1.5 px-3 w-28"
                                  value={roundsForm[key] || ""}
                                  onChange={(e) => setRoundsForm({ ...roundsForm, [key]: e.target.value })}
                                />
                                <button
                                  type="button"
                                  onClick={() => submitSessionLog(
                                    sess.id, w.id, exName, true,
                                    roundsForm[key] ? Number(roundsForm[key]) : undefined
                                  )}
                                  disabled={!roundsForm[key]}
                                  className="btn-gold text-xs px-3 py-1.5 disabled:opacity-40"
                                >
                                  Submit ✓
                                </button>
                              </>
                            ) : (
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                myLog.status === "APPROVED" ? "bg-green-500/20 text-green-300" :
                                myLog.status === "REJECTED" ? "bg-red-500/20 text-red-300" :
                                "bg-yellow-500/20 text-yellow-300"
                              }`}>
                                {myLog.status === "APPROVED" ? "✓ Approved" :
                                 myLog.status === "REJECTED" ? "✗ Rejected" : "⏳ Pending"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {sess.workouts.length === 0 && <p className="text-xs text-white/30">No exercises added yet.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ended Sessions (recent) ── */}
      {endedSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-semibold mb-3 text-white/60">Past Sessions</h2>
          <div className="space-y-3">
            {endedSessions.slice(0, 5).map((sess) => {
              const myLogs = sess.athleteLogs?.filter((l: any) => l.userId === me?.id && !l.isCleared) || [];
              return (
                <div key={sess.id} className="stat-card border border-white/5 opacity-70">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-medium text-white text-sm">{sess.title}</span>
                      <span className="text-[10px] ml-2 px-2 py-0.5 rounded bg-white/10 text-white/40 font-bold uppercase">Ended</span>
                    </div>
                    <span className="text-xs text-white/30">{sess.sport?.name} · {new Date(sess.startTime).toLocaleDateString()}</span>
                  </div>
                  {sess.workouts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sess.workouts.map((w: any) => {
                        const exName = w.customName || w.workoutType?.name || "Exercise";
                        const myLog = myLogs.find((l: any) =>
                          l.customExerciseName === exName || l.workoutTypeId === w.workoutTypeId
                        );
                        return (
                          <span key={w.id} className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            myLog ? (myLog.status === "APPROVED" ? "border-green-500/30 bg-green-500/10 text-green-300" :
                              "border-yellow-500/30 bg-yellow-500/10 text-yellow-300") :
                            "border-red-500/20 bg-red-500/10 text-red-400"
                          }`}>
                            {exName} {myLog ? "✓" : "✗ Absent"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Personal Workout History ── */}
      <div className="stat-card mb-6 border border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">History Controls</h3>
            <p className="text-xs text-white/50">Clear, restore or export your logged workouts.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to clear your workout history?")) return;
                await api("/api/workouts/clear", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
            >
              Clear Workouts
            </button>
            <button
              onClick={async () => {
                await api("/api/workouts/restore", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all"
            >
              Restore Workouts
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white text-xs">Past Team Sessions Controls</h3>
            <p className="text-[10px] text-white/50">Clear or restore logs from scheduled sport training sessions.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to clear your past sessions history?")) return;
                await api("/api/workouts/sessions/clear", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
            >
              Clear Past Sessions
            </button>
            <button
              onClick={async () => {
                await api("/api/workouts/sessions/restore", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all"
            >
              Restore Past Sessions
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
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={downloadPdf}
              className="btn-gold text-xs px-3 py-2 flex-1 sm:flex-none"
            >
              Download Workouts PDF
            </button>
            <button
              onClick={downloadSessionsPdf}
              className="btn-gold text-xs px-3 py-2 flex-1 sm:flex-none"
            >
              Download Sessions PDF
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold mb-3">My Workout History</h2>
        <div className="space-y-3">
          {workouts.map((w) => (
            <div key={w.id} className="stat-card hover:border-gold/10 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-white">{w.name}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {[
                      w.exercise,
                      w.sets && `${w.sets} sets`,
                      w.reps && `${w.reps} reps`,
                      w.weightKg && `${w.weightKg} kg`,
                      w.durationMin && `${w.durationMin} min`,
                      w.calories && `${w.calories} cal`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {w.notes && <p className="text-xs text-white/30 mt-1 italic">{w.notes}</p>}
                </div>
                <span className="text-xs text-white/30 shrink-0">{new Date(w.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {workouts.length === 0 && (
            <div className="stat-card text-center py-10">
              <p className="text-white/40 text-sm">No personal workouts logged yet.</p>
              <button onClick={() => setShowLogForm(true)} className="btn-gold text-sm mt-4 mx-auto">
                Log your first workout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
