"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminAnnouncementsPage() {
  const [sports, setSports] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "", sportId: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [s, a] = await Promise.all([
        api("/api/sports"),
        api("/api/admin-features/announcements"),
      ]);
      setSports(s);
      setAnnouncements(a);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/admin-features/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: newAnnouncement.title,
          body: newAnnouncement.body,
          sportId: newAnnouncement.sportId || undefined,
        }),
      });
      setNewAnnouncement({ title: "", body: "", sportId: "" });
      setMessage("Announcement posted successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/announcements/${id}`, { method: "DELETE" });
      setMessage("Announcement deleted.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading announcements...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="text-xs text-gold hover:underline">
          &larr; Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1 text-white">Announcements & Notices</h1>
        <p className="text-white/50 text-sm">Post new notices or delete current active announcements from the board.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Creation Form */}
        <div className="stat-card h-fit">
          <h2 className="font-display font-semibold mb-3 text-white">Post Announcement</h2>
          <form onSubmit={createAnnouncement} className="space-y-4">
            <label className="block">
              <span className="label">Title</span>
              <input className="input-field" placeholder="Announcement Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} required />
            </label>
            <label className="block">
              <span className="label">Target Audience / Sport (optional)</span>
              <select
                className="input-field"
                value={newAnnouncement.sportId}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, sportId: e.target.value })}
              >
                <option value="">College-wide (All athletes)</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Notice Content / Body</span>
              <textarea
                className="input-field min-h-[160px]"
                placeholder="Details of the announcement..."
                value={newAnnouncement.body}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })}
                required
              />
            </label>
            <button type="submit" className="btn-gold w-full mt-2">Post Announcement</button>
          </form>
        </div>

        {/* Previous list */}
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-white">Active Notices ({announcements.length})</h2>
          {announcements.map((ann) => (
            <div key={ann.id} className="stat-card border border-white/5 hover:border-gold/20 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-semibold text-white">{ann.title}</h3>
                  <p className="text-xs text-white/40 mt-1">
                    {ann.sport ? `${ann.sport.name} feed` : "College-wide"} · {new Date(ann.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                  type="button"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-white/50 mt-3 whitespace-pre-wrap">{ann.body}</p>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-sm text-white/40">No announcements yet.</p>}
        </div>
      </div>
    </div>
  );
}
