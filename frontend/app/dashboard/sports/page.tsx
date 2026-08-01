"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SportsPage() {
  const { user } = useAuth();
  const [sports, setSports] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const [s, m] = await Promise.all([api("/api/sports"), api("/api/auth/me")]);
    setSports(s);
    setMe(m);
  }
  useEffect(() => { load(); }, []);

  async function join(sportId: string) {
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/join`, { method: "POST" });
      setMessage("Request sent — waiting on captain approval.");
      await load();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  const myMembershipIds = new Set((me?.memberships || []).map((m: any) => m.sportId));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Sports</h1>
      <p className="text-white/50 text-sm mb-6">Join a team. Your captain will approve or reject the request.</p>

      {message && <div className="bg-blue/10 border border-blue/30 text-blue-light text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {sports.filter((s) => s.isActive !== false).map((s) => {
          const joined = myMembershipIds.has(s.id);
          return (
            <div key={s.id} className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-semibold">{s.name}</h3>
                  <p className="text-xs text-white/40 mt-1">{s._count?.memberships ?? 0} members</p>
                </div>
                {s.captain && <span className="text-xs text-gold">Captain: {s.captain.fullName}</span>}
              </div>
              {s.description && <p className="text-sm text-white/50 mt-3">{s.description}</p>}
              <button
                onClick={() => join(s.id)}
                disabled={joined}
                className="btn-primary text-sm mt-4 disabled:opacity-40"
              >
                {joined ? "Requested / Joined" : "Request to join"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
