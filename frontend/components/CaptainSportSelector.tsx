"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  onSportChanged: (sport: any) => void;
  currentSportId?: string;
}

export default function CaptainSportSelector({ onSportChanged, currentSportId }: Props) {
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [me, allSports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
        const mySports = allSports.filter((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
        setSports(mySports);

        // Determine which sport is currently active
        const savedId = localStorage.getItem("selected_captain_sport_id");
        const activeSport = mySports.find((s: any) => s.id === savedId) || mySports[0];
        if (activeSport && activeSport.id !== currentSportId) {
          onSportChanged(activeSport);
        }
      } catch (err) {
        console.error("Failed to load sports for captain selector", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentSportId, onSportChanged]);

  if (loading || sports.length <= 1) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 p-4 rounded-xl border border-gold/20 bg-gold/5 max-w-xl">
      <div>
        <p className="text-xs text-white/50 font-medium">Switch Managed Team</p>
        <p className="text-xs text-gold/70">You are assigned as a leader for multiple sports.</p>
      </div>
      <select
        value={currentSportId || ""}
        onChange={(e) => {
          const selected = sports.find((s: any) => s.id === e.target.value);
          if (selected) {
            localStorage.setItem("selected_captain_sport_id", selected.id);
            onSportChanged(selected);
          }
        }}
        className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50 cursor-pointer"
      >
        {sports.map((s) => (
          <option key={s.id} value={s.id}>
            {s.teamName || s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
