"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminPage() {
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

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading admin panel...</div>;
  }

  const cards = [
    {
      href: "/dashboard/admin/pending-approvals",
      title: "Pending Approvals",
      desc: "Approve or reject new user registrations and student athlete profiles waiting for activation.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      href: "/dashboard/admin/search-athletes",
      title: "Search Athletes Database",
      desc: "Query all athletes, reset passwords, suspend/activate accounts, promote to Sports Secretary, or delete accounts.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      href: "/dashboard/admin/workout-types",
      title: "Workout Configurations",
      desc: "Configure points scales, add new approved activities, and enable/disable workouts.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    },
    {
      href: "/dashboard/admin/announcements",
      title: "Announcements & Notices",
      desc: "Manage college-wide announcements and notice boards visible to all athletes.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1 text-white">Sports Secretary Admin Panel</h1>
        <p className="text-white/50 text-sm">Select an administrative task, edit sports settings, or approve roster requests.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="stat-card flex flex-col justify-between hover:border-gold/30 transition-all group duration-200">
            <div>
              <div className="mb-4">{card.icon}</div>
              <h2 className="font-display font-semibold text-lg text-white mb-2 group-hover:text-gold transition-colors">{card.title}</h2>
              <p className="text-xs text-white/50 leading-relaxed">{card.desc}</p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-gold group-hover:translate-x-1 transition-transform">
              Open Panel &rarr;
            </div>
          </Link>
        ))}
      </div>

      {/* Manage Sports section - Kept clean on dashboard */}
      <h2 className="font-display font-semibold mb-3 text-white">Manage Sports</h2>
      <form onSubmit={createSport} className="stat-card grid md:grid-cols-3 gap-4 mb-8">
        <label className="block">
          <span className="label">Sport Name</span>
          <input className="input-field" placeholder="e.g. Volleyball" value={newSport.name} onChange={(e) => setNewSport({ ...newSport, name: e.target.value })} required />
        </label>
        <label className="block">
          <span className="label">URL Slug</span>
          <input className="input-field" placeholder="e.g. volleyball" value={newSport.slug} onChange={(e) => setNewSport({ ...newSport, slug: e.target.value.toLowerCase() })} required />
        </label>
        <div className="md:col-span-3">
          <button type="submit" className="btn-gold">Create Sport</button>
        </div>
      </form>

      <div className="grid md:grid-cols-2 gap-4">
        {sports.map((s) => (
          <div key={s.id} className="stat-card flex flex-col justify-between hover:border-gold/20 transition-all duration-200">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-display font-semibold text-white text-lg">{s.teamName || s.name}</h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${s.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                  {s.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {s.teamName && <p className="text-xs text-white/40 mt-0.5">{s.name}</p>}
              <p className="text-xs text-white/40 mt-1">{s._count?.memberships ?? 0} roster members</p>
              <div className="text-xs text-white/50 mt-3 border-t border-white/5 pt-2">
                <p>Captain: {s.captain ? s.captain.fullName : "Unassigned"}</p>
                {s.viceCaptain && <p className="mt-1">Vice-Captain: {s.viceCaptain.fullName}</p>}
              </div>
            </div>
            <div>
              <div className="flex gap-2 mt-4">
                <Link href={`/dashboard/admin/sports/${s.id}`} className="btn-gold text-xs px-3.5 py-1.5 flex-1 text-center font-medium">
                  Manage Sport &rarr;
                </Link>
                {s.isActive && (
                  <button onClick={() => deactivateSport(s.id)} className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/10 px-3 py-1.5 rounded-lg">
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
