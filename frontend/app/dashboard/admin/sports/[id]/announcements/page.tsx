"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { exportToCSV, printReport } from "@/lib/export";

export default function AdminSportAnnouncementsPage() {
  const { id: sportId } = useParams() as { id: string };
  const [sport, setSport] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setMessage("");
    try {
      const [sportsList, anns] = await Promise.all([
        api("/api/sports"),
        api(`/api/admin-features/announcements?sportId=${sportId}`),
      ]);
      const found = sportsList.find((s: any) => s.id === sportId);
      if (!found) {
        setError("Sport not found");
        return;
      }
      setSport(found);
      setAnnouncements(anns);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sportId]);

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
    exportToCSV(dataToExport, `${sport.name}_Announcements`);
  }

  function handleExportPDF() {
    const headers = ["Title", "Body", "Date", "Author"];
    const rows = announcements.map((a) => [
      a.title,
      a.body,
      new Date(a.createdAt).toLocaleDateString(),
      a.author.fullName,
    ]);
    printReport(`${sport.name} - Announcements List`, headers, rows);
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading announcements...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/dashboard/admin/sports/${sportId}`} className="text-xs text-gold hover:underline">
          &larr; Back to Sport Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1 text-white">Announcements Feed</h1>
          <p className="text-white/50 text-sm">View and manage announcements posted to the team feed for {sport.name}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-primary text-xs px-3.5 py-2">Export CSV</button>
          <button onClick={handleExportPDF} className="btn-gold text-xs px-3.5 py-2">Download PDF / Print</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="space-y-4 max-w-3xl">
        <h2 className="font-display font-semibold text-white">Announcements ({announcements.length})</h2>
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
        {announcements.length === 0 && <p className="text-sm text-white/40">No announcements posted for this sport yet.</p>}
      </div>
    </div>
  );
}
