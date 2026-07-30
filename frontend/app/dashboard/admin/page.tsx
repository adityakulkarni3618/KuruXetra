"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [newSport, setNewSport] = useState({ name: "", slug: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [p, s] = await Promise.all([api("/api/admin/pending-users"), api("/api/sports")]);
    setPendingUsers(p);
    setSports(s);
  }
  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    const backup = [...pendingUsers];
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${id}/approve`, { method: "PATCH" });
      setMessage("User approved successfully.");
    } catch (err: any) {
      setPendingUsers(backup);
      setError(err.message);
    }
  }

  async function reject(id: string) {
    const backup = [...pendingUsers];
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${id}/reject`, { method: "PATCH" });
      setMessage("Registration rejected and user removed.");
    } catch (err: any) {
      setPendingUsers(backup);
      setError(err.message);
    }
  }

  async function createSport(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      await api("/api/sports", {
        method: "POST",
        body: JSON.stringify({
          name: newSport.name,
          slug: newSport.slug || newSport.name.toLowerCase().replace(/\s+/g, "-"),
        }),
      });
      setMessage(`${newSport.name} added.`);
      setNewSport({ name: "", slug: "" });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function assignCaptain(sportId: string, uniqueId: string) {
    // Look up the user by uniqueId isn't exposed as an endpoint yet — for now
    // this expects the internal userId. Extend /api/users with a lookup-by-uniqueId
    // route if you want to type the college ID directly here.
    try {
      await api(`/api/sports/${sportId}/captain`, {
        method: "POST",
        body: JSON.stringify({ userId: uniqueId }),
      });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-1">Admin — Sports Secretary</h1>
      <p className="text-white/50 text-sm mb-8">Approve new athletes and manage sports on the platform.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <h2 className="font-display font-semibold mb-3">Pending registrations ({pendingUsers.length})</h2>
      <div className="space-y-2 mb-10">
        {pendingUsers.map((u) => (
          <div key={u.id} className="stat-card flex justify-between items-center">
            <div>
              <p className="font-medium">{u.fullName} <span className="text-white/30 text-xs">({u.uniqueId})</span></p>
              <p className="text-xs text-white/40">{u.department} · {u.academicYear} · {u.email}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => approve(u.id)} className="btn-gold text-xs px-3 py-1.5">Approve</button>
              <button onClick={() => reject(u.id)} className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5">Reject</button>
            </div>
          </div>
        ))}
        {pendingUsers.length === 0 && <p className="text-sm text-white/40">No pending registrations.</p>}
      </div>

      <h2 className="font-display font-semibold mb-3">Add a sport</h2>
      <form onSubmit={createSport} className="stat-card flex gap-4 items-end mb-10">
        <label className="block flex-1">
          <span className="label">Sport name</span>
          <input className="input-field" value={newSport.name} onChange={(e) => setNewSport({ ...newSport, name: e.target.value })} required />
        </label>
        <button type="submit" className="btn-gold">Add sport</button>
      </form>

      <h2 className="font-display font-semibold mb-3">All sports ({sports.length})</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {sports.map((s) => (
          <div key={s.id} className="stat-card">
            <h3 className="font-display font-semibold">{s.name}</h3>
            <p className="text-xs text-white/40 mb-3">{s._count?.memberships ?? 0} members · {s.status}</p>
            <p className="text-xs text-white/50 mb-2">
              Captain: {s.captain ? s.captain.fullName : "Unassigned"}
            </p>
            <AssignCaptainForm sportId={s.id} onAssign={assignCaptain} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignCaptainForm({ sportId, onAssign }: { sportId: string; onAssign: (sportId: string, userId: string) => void }) {
  const [userId, setUserId] = useState("");
  return (
    <div className="flex gap-2">
      <input
        className="input-field text-xs"
        placeholder="Internal user ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <button
        onClick={() => userId && onAssign(sportId, userId)}
        className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
      >
        Assign captain
      </button>
    </div>
  );
}
