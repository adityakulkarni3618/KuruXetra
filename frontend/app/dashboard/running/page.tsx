"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const TRACK_METERS = 250;

export default function RunningPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [distanceKm, setDistanceKm] = useState("");
  const [rounds, setRounds] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setRuns(await api("/api/running/me"));
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/running", {
        method: "POST",
        body: JSON.stringify({
          distanceKm: distanceKm ? Number(distanceKm) : undefined,
          rounds: rounds ? Number(rounds) : undefined,
          durationMin: Number(durationMin),
          notes: notes || undefined,
        }),
      });
      setDistanceKm("");
      setRounds("");
      setDurationMin("");
      setNotes("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalKm = runs.reduce((s, r) => s + r.distanceKm, 0);
  const derivedDistance = rounds ? (Number(rounds) * TRACK_METERS) / 1000 : distanceKm ? Number(distanceKm) : undefined;
  const derivedRounds = distanceKm ? (Number(distanceKm) * 1000) / TRACK_METERS : rounds ? Number(rounds) : undefined;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Running</h1>
      <p className="text-white/50 text-sm mb-8">Log a run by distance or track rounds; pace is calculated automatically.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      <div className="stat-card mb-6">
        <p className="label">Total distance logged</p>
        <p className="font-display text-3xl font-bold text-gold">{totalKm.toFixed(1)} km</p>
      </div>

      <form onSubmit={submit} className="stat-card grid md:grid-cols-4 gap-4 mb-8">
        <label className="block">
          <span className="label">Distance (km)</span>
          <input
            className="input-field"
            type="number"
            step="0.1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Rounds (250m)</span>
          <input
            className="input-field"
            type="number"
            step="1"
            value={rounds}
            onChange={(e) => setRounds(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Duration (min)</span>
          <input
            className="input-field"
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="label">Notes</span>
          <input
            className="input-field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="md:col-span-4">
          <p className="text-xs text-white/40 mb-3">
            {derivedDistance && !distanceKm && `Approx. ${derivedDistance.toFixed(2)} km based on ${rounds} rounds.`}
            {derivedRounds && !rounds && `Approx. ${derivedRounds.toFixed(1)} rounds based on ${distanceKm} km.`}
            {!derivedDistance && !derivedRounds && "Enter either a distance or a rounds count."}
          </p>
          <button type="submit" disabled={loading} className="btn-gold">Log run</button>
        </div>
      </form>

      <h2 className="font-display font-semibold mb-3">History</h2>
      <div className="space-y-2">
        {runs.map((r) => (
          <div key={r.id} className="stat-card flex justify-between items-center">
            <div>
              <p className="font-medium">{r.distanceKm} km in {r.durationMin} min</p>
              <p className="text-xs text-white/40">Pace: {r.paceMinKm?.toFixed(2)} min/km</p>
            </div>
            <span className="text-xs text-white/40">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
        {runs.length === 0 && <p className="text-sm text-white/40">No runs yet.</p>}
      </div>
    </div>
  );
}
