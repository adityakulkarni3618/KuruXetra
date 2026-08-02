"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminCombatPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Sport addition state
  const [selectedEventId, setSelectedEventId] = useState("");
  const [newSportName, setNewSportName] = useState("");
  const [headUniqueId, setHeadUniqueId] = useState("");

  // Head re-assignment state
  const [editingSportId, setEditingSportId] = useState("");
  const [editHeadUniqueId, setEditHeadUniqueId] = useState("");

  useEffect(() => {
    loadCombatData();
  }, []);

  async function loadCombatData() {
    try {
      const list = await api("/api/combat/events");
      setEvents(list || []);
      if (list && list.length > 0) {
        setSelectedEventId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load events data");
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventName.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api("/api/combat/events", {
        method: "POST",
        body: JSON.stringify({ name: eventName, isActive: true })
      });
      setMessage("Combat tournament created successfully!");
      setEventName("");
      loadCombatData();
    } catch (err: any) {
      setError(err.message || "Failed to create combat tournament");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId || !newSportName.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api("/api/combat/sports", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedEventId,
          sportName: newSportName,
          headUniqueId: headUniqueId || undefined
        })
      });
      setMessage(`Sport "${newSportName}" added successfully to event!`);
      setNewSportName("");
      setHeadUniqueId("");
      loadCombatData();
    } catch (err: any) {
      setError(err.message || "Failed to add sport");
    } finally {
      setLoading(false);
    }
  }

  async function handleReassignHead(e: React.FormEvent, sportId: string) {
    e.preventDefault();
    if (!editHeadUniqueId.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/combat/sports/${sportId}/head`, {
        method: "PATCH",
        body: JSON.stringify({ headUniqueId: editHeadUniqueId })
      });
      setMessage("Sport head updated successfully!");
      setEditingSportId("");
      setEditHeadUniqueId("");
      loadCombatData();
    } catch (err: any) {
      setError(err.message || "Failed to reassign sport head");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header breadcrumb */}
      <div className="mb-6">
        <Link href="/dashboard/admin" className="btn-back">
          &larr; Back to Admin Panel
        </Link>
      </div>

      <h1 className="font-display text-3xl font-bold mb-1 text-white">Manage Combat Events</h1>
      <p className="text-white/50 text-sm mb-8">Create annual Combat tournaments, register sports, and assign Sport Heads to direct matches.</p>

      {/* Alerts */}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 rounded-lg mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/20 text-green-300 text-xs p-3 rounded-lg mb-6">{message}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Create Tournament & Add Sport Forms */}
        <div className="md:col-span-1 space-y-6">
          {/* Create Tournament */}
          <div className="stat-card">
            <h2 className="font-semibold text-white mb-3 text-sm">Create New Combat Event</h2>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <label className="block">
                <span className="label text-[10px]">Tournament Title</span>
                <input
                  className="input-field text-xs"
                  placeholder="e.g. COMBAT 22"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={loading} className="btn-gold text-xs w-full py-2">
                Create Tournament
              </button>
            </form>
          </div>

          {/* Register Sport inside tournament */}
          {events.length > 0 && (
            <div className="stat-card">
              <h2 className="font-semibold text-white mb-3 text-sm">Add Sport to Combat Event</h2>
              <form onSubmit={handleAddSport} className="space-y-3">
                <label className="block">
                  <span className="label text-[10px]">Select Tournament</span>
                  <select
                    className="input-field text-xs bg-surface"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                  >
                    {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="label text-[10px]">Sport Category Name</span>
                  <input
                    className="input-field text-xs"
                    placeholder="e.g. Cricket, Chess, Football"
                    value={newSportName}
                    onChange={(e) => setNewSportName(e.target.value)}
                    required
                  />
                </label>

                <label className="block">
                  <span className="label text-[10px]">Sport Head Athletic ID (Optional)</span>
                  <input
                    className="input-field text-xs"
                    placeholder="e.g. KX24123071"
                    value={headUniqueId}
                    onChange={(e) => setHeadUniqueId(e.target.value)}
                  />
                  <span className="text-[9px] text-white/30 block mt-1">Leave empty to assign or delegate later.</span>
                </label>

                <button type="submit" disabled={loading} className="btn-gold text-xs w-full py-2">
                  Register Sport
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Events & Registered Sports list */}
        <div className="md:col-span-2 space-y-6">
          <div className="stat-card">
            <h2 className="font-semibold text-white mb-4 text-sm">Tournaments & Sports Overview</h2>
            {events.length === 0 ? (
              <p className="text-xs text-white/30 italic">No combat events registered. Create one to get started.</p>
            ) : (
              <div className="space-y-6">
                {events.map((ev) => (
                  <div key={ev.id} className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white text-base">{ev.name}</h3>
                      <span className="text-[10px] uppercase px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full font-bold">
                        {ev.isActive ? "Active" : "Closed"}
                      </span>
                    </div>

                    {/* Sports list inside tournament */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/40 uppercase font-semibold">Registered Sports ({ev.sports?.length || 0})</p>
                      {(!ev.sports || ev.sports.length === 0) ? (
                        <p className="text-xs text-white/30 italic">No sports registered in this tournament.</p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {ev.sports.map((sp: any) => (
                            <div key={sp.id} className="bg-surface/50 border border-white/5 rounded-lg p-3 flex flex-col justify-between">
                              <div>
                                <h4 className="font-semibold text-xs text-white mb-1">{sp.sportName}</h4>
                                {sp.headUser ? (
                                  <div className="text-[10px] text-white/60">
                                    <span className="text-gold font-medium">Head:</span> {sp.headUser.fullName} ({sp.headUser.uniqueId})
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-red-400/80 italic font-medium">No Sport Head Assigned</span>
                                )}

                                {/* Sub-Heads delegation indicators */}
                                {sp.subHeads?.length > 0 && (
                                  <div className="text-[9px] text-white/30 mt-1">
                                    🔑 Delegated scorekeepers: {sp.subHeads.map((sb: any) => sb.user.fullName.split(" ")[0]).join(", ")}
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 pt-2 border-t border-white/5 flex flex-col gap-2">
                                {editingSportId === sp.id ? (
                                  <form onSubmit={(e) => handleReassignHead(e, sp.id)} className="flex gap-1.5 items-center">
                                    <input
                                      className="input-field py-1 px-1.5 text-[9px] flex-1 bg-surface"
                                      placeholder="New Athletic ID"
                                      value={editHeadUniqueId}
                                      onChange={(e) => setEditHeadUniqueId(e.target.value)}
                                      required
                                    />
                                    <button type="submit" className="btn-gold py-1 px-2 text-[9px] shrink-0">
                                      Save
                                    </button>
                                    <button type="button" onClick={() => setEditingSportId("")} className="text-white/40 hover:text-white text-[9px]">
                                      Cancel
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSportId(sp.id);
                                      setEditHeadUniqueId(sp.headUser?.uniqueId || "");
                                    }}
                                    className="text-[9px] text-gold hover:underline text-left"
                                  >
                                    {sp.headUser ? "🔄 Change Sport Head ID" : "➕ Assign Sport Head"}
                                  </button>
                                )}
                                <span className="text-[9px] text-white/30">{sp.matches?.length || 0} matches scheduled</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
