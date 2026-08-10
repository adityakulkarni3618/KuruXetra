"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";
import CaptainSportSelector from "@/components/CaptainSportSelector";
export default function CaptainAnnouncementsPage() {
  const [mySport, setMySport] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
        const mySports = sports.filter((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
        const savedId = localStorage.getItem("selected_captain_sport_id");
        const sport = mySports.find((s: any) => s.id === savedId) || mySports[0];
        setMySport(sport);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    init();
  }, []);

  async function load() {
    if (!mySport) return;
    setError("");
    setMessage("");
    try {
      const anns = await api(`/api/admin-features/announcements?sportId=${mySport.id}`);
      setAnnouncements(anns);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [mySport?.id]);

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/admin-features/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: announcementForm.title,
          body: announcementForm.body,
          sportId: mySport.id,
        }),
      });
      setAnnouncementForm({ title: "", body: "" });
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
      setMessage("Announcement deleted successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleExportCSV() {
    const dataToExport = announcements.map((a) => ({
      "Title": a.title,
      "Body": a.body,
      "Date": new Date(a.createdAt).toLocaleDateString(),
      "Author": a.author.fullName,
    }));
    exportToCSV(dataToExport, `${mySport.name}_Announcements`);
  }

  function handleExportPDF() {
    const headers = ["Title", "Body", "Date", "Author"];
    const rows = announcements.map((a) => [
      a.title,
      a.body,
      new Date(a.createdAt).toLocaleDateString(),
      a.author.fullName,
    ]);
    printReport(`${mySport.name} - Announcements List`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading announcements...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/captain" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Dashboard
        </Link>
      </div>

      <CaptainSportSelector onSportChanged={setMySport} currentSportId={mySport?.id} />

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Announcements</h1>
          <p className="text-white/50 text-sm">Post team notices and announcements for {mySport?.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Post Form */}
        <div className="stat-card">
          <h2 className="font-display font-semibold mb-3 text-white">Post announcement</h2>
          <form onSubmit={postAnnouncement} className="space-y-4">
            <label className="block">
              <span className="label">Title</span>
              <input
                className="input-field"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="label">Body</span>
              <textarea
                className="input-field min-h-[160px]"
                value={announcementForm.body}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, body: e.target.value }))}
                required
              />
            </label>
            <button type="submit" className="btn-gold">Post announcement</button>
          </form>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-white">Previous Announcements ({announcements.length})</h2>
          {announcements.map((ann) => (
            <div key={ann.id} className="stat-card border border-white/5 hover:border-gold/20 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-semibold text-white">{ann.title}</h3>
                  <p className="text-xs text-white/40">{new Date(ann.createdAt).toLocaleDateString()} · Posted by {ann.author.fullName}</p>
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
