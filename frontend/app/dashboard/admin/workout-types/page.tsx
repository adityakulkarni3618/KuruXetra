"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminWorkoutTypesPage() {
  const [workoutTypes, setWorkoutTypes] = useState<any[]>([]);
  const [newWorkoutType, setNewWorkoutType] = useState({ name: "", points: 15 });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const types = await api("/api/admin-features/workout-types");
      setWorkoutTypes(types);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createWorkoutType(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/admin-features/workout-types", {
        method: "POST",
        body: JSON.stringify({
          name: newWorkoutType.name,
          points: newWorkoutType.points,
        }),
      });
      setNewWorkoutType({ name: "", points: 15 });
      setMessage("Workout type added successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleWorkoutType(id: string, isActive: boolean) {
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/workout-types/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      setMessage("Workout type status updated.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading workout types...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="text-xs text-gold hover:underline">
          &larr; Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1 text-white">Workout types</h1>
        <p className="text-white/50 text-sm">Configure approved workouts and points scaling for workouts logged by student athletes.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Creation Form */}
        <div className="stat-card md:col-span-1 h-fit">
          <h2 className="font-display font-semibold mb-3 text-white">Add Workout Type</h2>
          <form onSubmit={createWorkoutType} className="space-y-4">
            <label className="block">
              <span className="label">Type Name</span>
              <input
                className="input-field"
                placeholder="e.g. Swimming"
                value={newWorkoutType.name}
                onChange={(e) => setNewWorkoutType({ ...newWorkoutType, name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">Points</span>
              <input
                className="input-field"
                type="number"
                value={String(newWorkoutType.points)}
                onChange={(e) => setNewWorkoutType({ ...newWorkoutType, points: Number(e.target.value) })}
                required
              />
            </label>
            <button type="submit" className="btn-gold w-full mt-2">Add workout type</button>
          </form>
        </div>

        {/* List of types */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="font-display font-semibold text-white">Configured Workout Types ({workoutTypes.length})</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {workoutTypes.map((type) => (
              <div key={type.id} className="stat-card flex flex-col justify-between hover:border-gold/20 transition-all duration-200">
                <div className="mb-4">
                  <p className="font-medium text-white text-lg">{type.name}</p>
                  <p className="text-xs text-white/40 mt-1">{type.points} reward points</p>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${type.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {type.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => toggleWorkoutType(type.id, !type.isActive)}
                    className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                      type.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    }`}
                    type="button"
                  >
                    {type.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {workoutTypes.length === 0 && <p className="text-sm text-white/40">No workout types configured yet.</p>}
        </div>
      </div>
    </div>
  );
}
