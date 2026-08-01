"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [newSport, setNewSport] = useState({ name: "", slug: "" });
  const [searchParams, setSearchParams] = useState({
    uniqueId: "",
    name: "",
    rollNumber: "",
    department: "",
    academicYear: "",
    passoutYear: "",
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<any[]>([]);
  const [newWorkoutType, setNewWorkoutType] = useState({ name: "", points: 15 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "", sportId: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [p, s, w, a] = await Promise.all([
      api("/api/admin/pending-users"),
      api("/api/sports"),
      api("/api/admin-features/workout-types"),
      api("/api/admin-features/announcements"),
    ]);
    setPendingUsers(p);
    setSports(s);
    setWorkoutTypes(w);
    setAnnouncements(a);
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

  async function searchUsers() {
    setError("");
    setMessage("");

    const query = Object.entries(searchParams)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value.trim())}`)
      .join("&");

    try {
      const results = await api(`/api/admin/users/search${query ? `?${query}` : ""}`);
      setSearchResults(results);
      if (results.length === 0) {
        setMessage("No matching users found.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function promoteToSS(userId: string) {
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/promote-to-ss`, { method: "POST" });
      setMessage("Sports Secretary promotion completed.");
      await load();
      if (searchResults.length > 0) {
        await searchUsers(); // Refresh search results
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function demoteSS(userId: string) {
    if (!confirm("Are you sure you want to remove the Sports Secretary role from this user?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/demote-from-ss`, { method: "POST" });
      setMessage("Sports Secretary role removed successfully.");
      await load();
      if (searchResults.length > 0) {
        await searchUsers(); // Refresh search results
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeProfile(userId: string) {
    if (!confirm("Are you sure you want to permanently delete this athlete's profile? This will delete all their records, and they will be able to re-register/re-login from scratch.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/remove-profile`, { method: "DELETE" });
      setMessage("Player profile permanently removed.");
      await load();
      if (searchResults.length > 0) {
        await searchUsers(); // Refresh search results
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function removeCaptain(sportId: string) {
    if (!confirm("Are you sure you want to remove the captain of this sport?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${sportId}/demote-captain`, { method: "POST" });
      setMessage("Captain demoted successfully.");
      await load();
      if (searchResults.length > 0) {
        await searchUsers(); // Refresh search list to update role badges
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleStatus(userId: string, currentStatus: string) {
    const nextStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    if (!confirm(`Are you sure you want to change this user's status to ${nextStatus}?`)) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setMessage(`User status updated to ${nextStatus}.`);
      await load();
      if (searchResults.length > 0) {
        await searchUsers();
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function resetPassword(userId: string) {
    if (!confirm("Are you sure you want to reset this user's password? A temporary password will be generated.")) return;
    setError("");
    setMessage("");
    try {
      const data = await api(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      alert(`Temporary Password: ${data.tempPassword}\n\nPlease relay this temporary password to the student once. It will not be shown again.`);
      setMessage(`Temporary password generated: ${data.tempPassword}`);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function awardChampion(userId: string) {
    if (!confirm("Are you sure you want to award the Champion badge to this user?")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/users/${userId}/award-badge`, {
        method: "POST",
      });
      setMessage("Champion badge awarded successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deactivateSport(sportId: string) {
    if (!confirm("Are you sure you want to deactivate this sport? It will be hidden from new join requests, but historical data is preserved.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/sports/${sportId}/deactivate`, {
        method: "PATCH",
      });
      setMessage("Sport deactivated successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function createWorkoutType(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/admin-features/workout-types", {
        method: "POST",
        body: JSON.stringify({
          name: newWorkoutType.name,
          points: newWorkoutType.points,
        }),
      });
      setNewWorkoutType({ name: "", points: 15 });
      setMessage("Workout type added.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleWorkoutType(id: string, isActive: boolean) {
    setError("");
    setMessage("");
    try {
      await api(`/api/admin-features/workout-types/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      setMessage("Workout type updated.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

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
      setMessage("Announcement posted.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function assignCaptain(sportId: string, uniqueId: string) {
    // This now accepts the public athlete uniqueId (KX000001) rather than the
    // internal database UUID. The backend resolves it to the actual user id.
    try {
      await api(`/api/sports/${sportId}/captain`, {
        method: "POST",
        body: JSON.stringify({ uniqueId }),
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

      <h2 className="font-display font-semibold mb-3">Search athletes</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <label className="block">
          <span className="label">Athlete ID</span>
          <input
            className="input-field"
            value={searchParams.uniqueId}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, uniqueId: e.target.value }))}
            placeholder="KX000001"
          />
        </label>
        <label className="block">
          <span className="label">Name</span>
          <input
            className="input-field"
            value={searchParams.name}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="John Doe"
          />
        </label>
        <label className="block">
          <span className="label">Roll Number</span>
          <input
            className="input-field"
            value={searchParams.rollNumber}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, rollNumber: e.target.value }))}
            placeholder="26CS0001"
          />
        </label>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <label className="block">
          <span className="label">Department</span>
          <input
            className="input-field"
            value={searchParams.department}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, department: e.target.value }))}
            placeholder="Computer Engineering"
          />
        </label>
        <label className="block">
          <span className="label">Academic Year</span>
          <input
            className="input-field"
            value={searchParams.academicYear}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, academicYear: e.target.value }))}
            placeholder="BE"
          />
        </label>
        <label className="block">
          <span className="label">Passout Year</span>
          <input
            className="input-field"
            value={searchParams.passoutYear}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, passoutYear: e.target.value }))}
            placeholder="2028"
          />
        </label>
      </div>
      <div className="flex gap-3 mb-10">
        <button onClick={searchUsers} className="btn-gold px-5 py-2.5 text-sm">Search</button>
        <button
          onClick={() => {
            setSearchParams({ uniqueId: "", name: "", rollNumber: "", department: "", academicYear: "", passoutYear: "" });
            setSearchResults([]);
            setMessage("");
            setError("");
          }}
          className="btn-primary px-5 py-2.5 text-sm"
          type="button"
        >
          Clear
        </button>
      </div>

      <h2 className="font-display font-semibold mb-3">Add a sport</h2>
      <form onSubmit={createSport} className="stat-card grid md:grid-cols-3 gap-4 mb-10">
        <Input label="Sport name" value={newSport.name} onChange={(v) => setNewSport((prev) => ({ ...prev, name: v }))} required />
        <Input label="URL slug" value={newSport.slug} onChange={(v) => setNewSport((prev) => ({ ...prev, slug: v }))} />
        <div className="md:col-span-3">
          <button type="submit" className="btn-gold">Create sport</button>
        </div>
      </form>

      {searchResults.length > 0 && (
        <div className="space-y-4 mb-10">
          <h3 className="font-display font-semibold mb-3">Search results ({searchResults.length})</h3>
          {searchResults.map((user) => (
            <div key={user.id} className="stat-card flex flex-col gap-4 border border-white/10 hover:border-gold/30 transition-all duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-lg">{user.fullName}</p>
                    <span className="text-white/30 text-sm">({user.uniqueId})</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${user.role === "SUPER_ADMIN" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                      user.role === "CAPTAIN" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                        "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}>
                      {user.role === "SUPER_ADMIN" ? "Sports Secretary" : user.role === "CAPTAIN" ? "Captain" : "Athlete"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${user.status === "ACTIVE" ? "bg-green-500/20 text-green-300" :
                      user.status === "SUSPENDED" ? "bg-red-500/20 text-red-300" :
                        "bg-yellow-500/20 text-yellow-300"
                      }`}>
                      {user.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {user.department} · {user.academicYear} · Roll No: {user.rollNumber} · Passout: {user.passoutYear}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap self-start md:self-center">
                  {user.role !== "SUPER_ADMIN" ? (
                    <button
                      onClick={() => promoteToSS(user.id)}
                      className="btn-gold text-xs px-3 py-1.5"
                    >
                      Promote to Sports Secretary
                    </button>
                  ) : (
                    currentUser?.id !== user.id && user.uniqueId !== "KX000001" && (
                      <button
                        onClick={() => demoteSS(user.id)}
                        className="btn-primary bg-yellow-600 hover:bg-yellow-500 text-xs px-3 py-1.5"
                      >
                        Remove Sports Secretary Role
                      </button>
                    )
                  )}
                  {currentUser?.id !== user.id && user.uniqueId !== "KX000001" && (
                    <>
                      <button
                        onClick={() => toggleStatus(user.id, user.status)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          user.status === "SUSPENDED" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"
                        }`}
                      >
                        {user.status === "SUSPENDED" ? "Activate Account" : "Suspend Account"}
                      </button>
                      <button
                        onClick={() => resetPassword(user.id)}
                        className="btn-primary bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5"
                      >
                        Reset Password
                      </button>
                    </>
                  )}
                  {user.status === "ACTIVE" && (
                    <button
                      onClick={() => awardChampion(user.id)}
                      className="btn-primary bg-purple-600 hover:bg-purple-500 text-xs px-3 py-1.5"
                    >
                      Award Champion Badge
                    </button>
                  )}
                  {currentUser?.id !== user.id && user.uniqueId !== "KX000001" && (
                    <button
                      onClick={() => removeProfile(user.id)}
                      className="btn-primary bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5"
                    >
                      Remove Player Profile
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-white/5 pt-3 text-white/60">
                <div>
                  <p className="text-white/30 font-semibold mb-0.5">Contact Details</p>
                  <p>{user.email}</p>
                  <p className="mt-0.5">{user.mobileNumber}</p>
                </div>
                <div>
                  <p className="text-white/30 font-semibold mb-0.5">Personal Info</p>
                  <p>Gender: {user.gender || "N/A"}</p>
                  <p className="mt-0.5">Blood Group: {user.bloodGroup || "N/A"}</p>
                </div>
                <div>
                  <p className="text-white/30 font-semibold mb-0.5">Fitness & DOB</p>
                  <p>DOB: {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                  <p className="mt-0.5">Goal: {user.fitnessGoal || "None"}</p>
                </div>
                <div>
                  <p className="text-white/30 font-semibold mb-0.5">Documents & Photo</p>
                  <div className="flex flex-col gap-1 mt-0.5">
                    {user.profilePhotoUrl ? (
                      <a href={user.profilePhotoUrl} target="_blank" rel="noreferrer" className="text-blue-light hover:underline">View Profile Photo</a>
                    ) : <span>No Photo</span>}
                    {user.studentIdCardUrl || user.collegeIdUrl ? (
                      <a href={user.studentIdCardUrl || user.collegeIdUrl} target="_blank" rel="noreferrer" className="text-blue-light hover:underline">View ID Card</a>
                    ) : <span>No ID Card</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display font-semibold mb-3">Manage Sports</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {sports.map((s) => (
          <div key={s.id} className="stat-card flex flex-col justify-between">
            <div>
              <h3 className="font-display font-semibold">{s.name}</h3>
              <p className="text-xs text-white/40 mb-3">{s._count?.memberships ?? 0} members · {s.status}</p>
              <div className="text-xs text-white/50 mb-2 flex items-center justify-between gap-2">
                <span>Captain: {s.captain ? s.captain.fullName : "Unassigned"}</span>
                {s.viceCaptain && <span className="ml-2">Vice-Captain: {s.viceCaptain.fullName}</span>}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mt-3 border-t border-white/5 pt-3">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${s.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                  {s.isActive ? "Active" : "Inactive"}
                </span>
                {s.isActive && (
                  <button
                    onClick={() => deactivateSport(s.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/10 px-2.5 py-1 rounded transition-all"
                    type="button"
                  >
                    Deactivate Sport
                  </button>
                )}
              </div>
              <Link
                href={`/dashboard/admin/sports/${s.id}`}
                className="btn-gold text-xs px-3.5 py-2 mt-4 block text-center font-medium"
              >
                Manage Captain, Vice-Captain & roster &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display font-semibold mb-3">Workout types</h2>
      <form onSubmit={createWorkoutType} className="stat-card grid md:grid-cols-3 gap-4 mb-8">
        <Input label="Type name" value={newWorkoutType.name} onChange={(v) => setNewWorkoutType((prev) => ({ ...prev, name: v }))} required />
        <Input label="Points" type="number" value={String(newWorkoutType.points)} onChange={(v) => setNewWorkoutType((prev) => ({ ...prev, points: Number(v) }))} required />
        <div className="md:col-span-3">
          <button type="submit" className="btn-gold">Add workout type</button>
        </div>
      </form>
      <div className="space-y-3 mb-10">
        {workoutTypes.map((type) => (
          <div key={type.id} className="stat-card flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{type.name}</p>
              <p className="text-xs text-white/40">{type.points} points · {type.isActive ? "Active" : "Inactive"}</p>
            </div>
            <button
              onClick={() => toggleWorkoutType(type.id, !type.isActive)}
              className="btn-primary text-xs px-3 py-1.5"
              type="button"
            >
              {type.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
        {workoutTypes.length === 0 && <p className="text-sm text-white/40">No workout types configured yet.</p>}
      </div>

      <h2 className="font-display font-semibold mb-3">Announcements</h2>
      <form onSubmit={createAnnouncement} className="stat-card grid gap-4 mb-8">
        <Input label="Title" value={newAnnouncement.title} onChange={(v) => setNewAnnouncement((prev) => ({ ...prev, title: v }))} required />
        <label className="block">
          <span className="label">Sport (optional)</span>
          <select
            className="input-field"
            value={newAnnouncement.sportId}
            onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, sportId: e.target.value }))}
          >
            <option value="">College-wide</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-3">
          <span className="label">Body</span>
          <textarea
            className="input-field min-h-[140px]"
            value={newAnnouncement.body}
            onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, body: e.target.value }))}
            required
          />
        </label>
        <div>
          <button type="submit" className="btn-gold">Post announcement</button>
        </div>
      </form>
      <div className="space-y-3 mb-10">
        {announcements.map((ann) => (
          <div key={ann.id} className="stat-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{ann.title}</p>
                <p className="text-xs text-white/40">{ann.sport ? ann.sport.name : "College-wide"}</p>
              </div>
              <span className="text-xs text-white/40">{new Date(ann.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-white/50 mt-3">{ann.body}</p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-sm text-white/40">No announcements yet.</p>}
      </div>
    </div>
  );
}

function AssignCaptainForm({ sportId, onAssign }: { sportId: string; onAssign: (sportId: string, uniqueId: string) => void }) {
  const [uniqueId, setUniqueId] = useState("");
  return (
    <div className="flex gap-2">
      <input
        className="input-field text-xs"
        placeholder="Athlete ID (e.g. KX000001)"
        value={uniqueId}
        onChange={(e) => setUniqueId(e.target.value)}
      />
      <button
        onClick={async () => {
          if (uniqueId) {
            await onAssign(sportId, uniqueId);
            setUniqueId("");
          }
        }}
        className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
        type="button"
      >
        Assign captain
      </button>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input-field"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
