"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminSportsPage() {
  const [sports, setSports] = useState<any[]>([]);
  const [newSport, setNewSport] = useState({ name: "", slug: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const s = await api("/api/sports");
      setSports(s);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createSport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/sports", {
        method: "POST",
        body: JSON.stringify(newSport),
      });
      setNewSport({ name: "", slug: "" });
      setMessage("Sport created successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deactivateSport(id: string) {
    if (!confirm("Are you sure you want to deactivate this sport?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      setMessage("Sport deactivated.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function activateSport(id: string) {
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });
      setMessage("Sport activated.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/admin" className="text-white/40 hover:text-white transition-colors text-sm">
          ← Admin Panel
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/60 text-sm">Manage Sports</span>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1 text-white">Manage Sports</h1>
        <p className="text-white/50 text-sm">Create sports, assign leadership, and configure each team.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      {/* Create Sport Form */}
      <div className="stat-card mb-8">
        <h2 className="font-display font-semibold text-white text-lg mb-4">Create New Sport</h2>
        <form onSubmit={createSport} className="grid md:grid-cols-3 gap-4">
          <label className="block">
            <span className="label">Sport Name</span>
            <input
              className="input-field"
              placeholder="e.g. Volleyball"
              value={newSport.name}
              onChange={(e) => setNewSport({ ...newSport, name: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="label">URL Slug</span>
            <input
              className="input-field"
              placeholder="e.g. volleyball"
              value={newSport.slug}
              onChange={(e) => setNewSport({ ...newSport, slug: e.target.value.toLowerCase() })}
              required
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-gold w-full">
              + Create Sport
            </button>
          </div>
        </form>
      </div>

      {/* Sports List */}
      {loading ? (
        <div className="text-white/40 text-center py-10">Loading sports...</div>
      ) : sports.length === 0 ? (
        <div className="stat-card text-center py-10 text-white/40">No sports created yet. Use the form above to add the first one.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sports.map((s) => (
            <div key={s.id} className="stat-card flex flex-col justify-between hover:border-gold/20 transition-all duration-200">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-display font-semibold text-white text-lg">{s.teamName || s.name}</h3>
                    {s.teamName && <p className="text-xs text-white/40">{s.name}</p>}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      s.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-xs text-white/50 space-y-1 mt-3 border-t border-white/5 pt-3">
                  <p>👑 Captain: {s.captain ? s.captain.fullName : "Unassigned"}</p>
                  {s.viceCaptain && <p>🥈 Vice-Captain: {s.viceCaptain.fullName}</p>}
                  <p>👥 {s._count?.memberships ?? 0} roster members</p>
                  {s.ground && <p>📍 {s.ground}</p>}
                  {s.practiceTime && <p>⏰ {s.practiceTime}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Link
                  href={`/dashboard/admin/sports/${s.id}`}
                  className="btn-gold text-xs px-3.5 py-1.5 flex-1 text-center font-medium"
                >
                  Manage →
                </Link>
                {s.isActive ? (
                  <button
                    onClick={() => deactivateSport(s.id)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/10 px-3 py-1.5 rounded-lg"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => activateSport(s.id)}
                    className="text-xs text-green-400 hover:text-green-300 border border-green-500/20 bg-green-500/10 px-3 py-1.5 rounded-lg"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
