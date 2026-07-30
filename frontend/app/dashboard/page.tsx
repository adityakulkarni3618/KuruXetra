"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function OverviewPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    api("/api/attendance/me").then(setAttendance).catch(() => {});
    api("/api/workouts/me").then(setWorkouts).catch(() => {});
    api("/api/running/me").then(setRuns).catch(() => {});
    api("/api/leaderboard").then(setLeaderboard).catch(() => {});
  }, []);

  const myRank = leaderboard.find((r) => r.id === user?.id);
  const totalDistance = runs.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
  const openCheckIn = attendance.find((a) => !a.timeOut);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Welcome back, {user?.fullName?.split(" ")[0]}</h1>
      <p className="text-white/50 text-sm mb-8">Here's where you stand today.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Leaderboard rank" value={myRank ? `#${myRank.rank}` : "—"} />
        <Stat label="Total points" value={myRank ? myRank.points : 0} />
        <Stat label="Total runs" value={runs.length} />
        <Stat label="Distance logged" value={`${totalDistance.toFixed(1)} km`} />
      </div>

      <div className="stat-card mb-6">
        <h2 className="font-display font-semibold mb-2">Ground status</h2>
        {openCheckIn ? (
          <p className="text-sm text-green-400">
            Currently checked in since {new Date(openCheckIn.timeIn).toLocaleTimeString()}
          </p>
        ) : (
          <p className="text-sm text-white/50">You're not checked in. Head to the Attendance tab when you arrive.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3">Recent workouts</h2>
          {workouts.slice(0, 5).map((w) => (
            <div key={w.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
              <span>{w.name}</span>
              <span className="text-white/40">{new Date(w.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {workouts.length === 0 && <p className="text-sm text-white/40">No workouts logged yet.</p>}
        </div>
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3">Recent runs</h2>
          {runs.slice(0, 5).map((r) => (
            <div key={r.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
              <span>{r.distanceKm} km</span>
              <span className="text-white/40">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {runs.length === 0 && <p className="text-sm text-white/40">No runs logged yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <p className="font-display text-2xl font-bold text-gold">{value}</p>
    </div>
  );
}
