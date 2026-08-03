"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { printReport } from "@/lib/export";

const TRACK_METERS = 250;

export default function RunningPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [distanceKm, setDistanceKm] = useState("");
  const [rounds, setRounds] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfStart, setPdfStart] = useState("");
  const [pdfEnd, setPdfEnd] = useState("");

  const downloadPdf = () => {
    let filtered = runs;
    if (pdfStart) {
      const start = new Date(pdfStart).getTime();
      filtered = filtered.filter(r => new Date(r.createdAt).getTime() >= start);
    }
    if (pdfEnd) {
      const end = new Date(pdfEnd);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.createdAt).getTime() <= end.getTime());
    }

    const headers = ["Distance (km)", "Duration (min)", "Pace (min/km)", "Speed (km/h)", "Date", "Notes"];
    const rows = filtered.map(r => [
      `${r.distanceKm} km`,
      `${r.durationMin} min`,
      r.paceMinKm ? `${r.paceMinKm.toFixed(2)} min/km` : "—",
      r.paceMinKm ? `${(60 / r.paceMinKm).toFixed(2)} km/h` : "—",
      new Date(r.createdAt).toLocaleDateString(),
      r.notes || "—"
    ]);

    printReport(`${me?.fullName || "Athlete"}'s Running History Report`, headers, rows);
  };

  const handleDistanceChange = (val: string) => {
    setDistanceKm(val);
    if (val) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        setRounds(String(Math.round((parsed * 1000) / TRACK_METERS)));
      }
    } else {
      setRounds("");
    }
  };

  const handleRoundsChange = (val: string) => {
    setRounds(val);
    if (val) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        setDistanceKm(String((parsed * TRACK_METERS) / 1000));
      }
    } else {
      setDistanceKm("");
    }
  };

  async function load() {
    const [r, m] = await Promise.all([
      api("/api/running/me"),
      api("/api/auth/me")
    ]);
    setRuns(r);
    setMe(m);
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
            onChange={(e) => handleDistanceChange(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Rounds (250m)</span>
          <input
            className="input-field"
            type="number"
            step="1"
            value={rounds}
            onChange={(e) => handleRoundsChange(e.target.value)}
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

      <div className="stat-card mb-6 border border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">History Controls</h3>
            <p className="text-xs text-white/50">Clear, restore or export your logged running sessions.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to clear your running history?")) return;
                await api("/api/running/clear", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
            >
              Clear History
            </button>
            <button
              onClick={async () => {
                await api("/api/running/restore", { method: "POST" });
                await load();
              }}
              className="text-xs px-3 py-1.5 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all"
            >
              Restore History
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 mt-4 pt-4 flex flex-col sm:flex-row items-end gap-3">
          <label className="block flex-1">
            <span className="label text-[10px] text-white/40 mb-1">Start Date</span>
            <input type="date" className="input-field text-xs py-1.5" value={pdfStart} onChange={(e) => setPdfStart(e.target.value)} />
          </label>
          <label className="block flex-1">
            <span className="label text-[10px] text-white/40 mb-1">End Date</span>
            <input type="date" className="input-field text-xs py-1.5" value={pdfEnd} onChange={(e) => setPdfEnd(e.target.value)} />
          </label>
          <button
            onClick={downloadPdf}
            className="btn-gold text-xs px-4 py-2"
          >
            Download PDF
          </button>
        </div>
      </div>

      <h2 className="font-display font-semibold mb-3">History</h2>
      <div className="space-y-2">
        {runs.map((r) => (
          <div key={r.id} className="stat-card flex justify-between items-center">
            <div>
              <p className="font-medium">{r.distanceKm} km in {r.durationMin} min</p>
              <p className="text-xs text-white/40">Speed: {r.paceMinKm ? (60 / r.paceMinKm).toFixed(2) : "—"} km/h</p>
            </div>
            <span className="text-xs text-white/40">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
        {runs.length === 0 && <p className="text-sm text-white/40">No runs yet.</p>}
      </div>
    </div>
  );
}
