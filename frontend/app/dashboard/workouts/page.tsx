"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const empty = { name: "", exercise: "", sets: "", reps: "", weightKg: "", durationMin: "", calories: "", notes: "" };

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setWorkouts(await api("/api/workouts/me"));
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: any = { name: form.name, exercise: form.exercise || undefined, notes: form.notes || undefined };
      for (const k of ["sets", "reps", "weightKg", "durationMin", "calories"] as const) {
        if (form[k]) payload[k] = Number(form[k]);
      }
      await api("/api/workouts", { method: "POST", body: JSON.stringify(payload) });
      setForm(empty);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Workouts</h1>
      <p className="text-white/50 text-sm mb-8">Log your training. +15 points per entry.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      <form onSubmit={submit} className="stat-card grid md:grid-cols-3 gap-4 mb-8">
        <Input label="Workout name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Input label="Exercise" value={form.exercise} onChange={(v) => setForm({ ...form, exercise: v })} />
        <Input label="Duration (min)" value={form.durationMin} onChange={(v) => setForm({ ...form, durationMin: v })} type="number" />
        <Input label="Sets" value={form.sets} onChange={(v) => setForm({ ...form, sets: v })} type="number" />
        <Input label="Reps" value={form.reps} onChange={(v) => setForm({ ...form, reps: v })} type="number" />
        <Input label="Weight (kg)" value={form.weightKg} onChange={(v) => setForm({ ...form, weightKg: v })} type="number" />
        <Input label="Calories" value={form.calories} onChange={(v) => setForm({ ...form, calories: v })} type="number" />
        <div className="md:col-span-2">
          <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        </div>
        <div className="md:col-span-3">
          <button type="submit" disabled={loading} className="btn-gold">Log workout</button>
        </div>
      </form>

      <h2 className="font-display font-semibold mb-3">History</h2>
      <div className="space-y-2">
        {workouts.map((w) => (
          <div key={w.id} className="stat-card flex justify-between items-center">
            <div>
              <p className="font-medium">{w.name}</p>
              <p className="text-xs text-white/40">
                {[w.sets && `${w.sets} sets`, w.reps && `${w.reps} reps`, w.durationMin && `${w.durationMin} min`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="text-xs text-white/40">{new Date(w.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
        {workouts.length === 0 && <p className="text-sm text-white/40">No workouts yet.</p>}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input-field" type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
