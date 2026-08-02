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
  const [newPointsWeight, setNewPointsWeight] = useState(10);

  // Settings & Roster Panel state
  const [selectedSport, setSelectedSport] = useState<any | null>(null);
  const [settingsWeight, setSettingsWeight] = useState(10);
  const [settingsHeadUniqueId, setSettingsHeadUniqueId] = useState("");
  const [rosterAthleteId, setRosterAthleteId] = useState("");
  const [rosterPlayers, setRosterPlayers] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

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

  // Reload selected sport data if open
  async function reloadSelectedSport(sportId: string) {
    try {
      // Find the sport in events state to refresh details
      const list = await api("/api/combat/events");
      setEvents(list || []);
      const updatedEvents = list || [];
      for (const ev of updatedEvents) {
        const found = ev.sports?.find((s: any) => s.id === sportId);
        if (found) {
          setSelectedSport(found);
          setSettingsWeight(found.pointsWeight || 10);
          setSettingsHeadUniqueId(found.headUser?.uniqueId || "");
          break;
        }
      }
      // Load roster
      setRosterLoading(true);
      const players = await api(`/api/combat/sports/${sportId}/players`);
      setRosterPlayers(players || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRosterLoading(false);
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
          headUniqueId: headUniqueId || undefined,
          pointsWeight: Number(newPointsWeight)
        })
      });
      setMessage(`Sport "${newSportName}" added successfully to event!`);
      setNewSportName("");
      setHeadUniqueId("");
      setNewPointsWeight(10);
      loadCombatData();
    } catch (err: any) {
      setError(err.message || "Failed to add sport");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenSettings(sport: any) {
    setSelectedSport(sport);
    setSettingsWeight(sport.pointsWeight || 10);
    setSettingsHeadUniqueId(sport.headUser?.uniqueId || "");
    setRosterAthleteId("");
    
    // Load Roster
    setRosterLoading(true);
    try {
      const players = await api(`/api/combat/sports/${sport.id}/players`);
      setRosterPlayers(players || []);
    } catch (err: any) {
      setError(err.message || "Failed to load roster players");
    } finally {
      setRosterLoading(false);
    }
  }

  async function handleUpdateSportSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSport) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/combat/sports/${selectedSport.id}/head`, {
        method: "PATCH",
        body: JSON.stringify({
          headUniqueId: settingsHeadUniqueId,
          pointsWeight: Number(settingsWeight)
        })
      });
      setMessage(`Settings for ${selectedSport.sportName} updated successfully!`);
      reloadSelectedSport(selectedSport.id);
    } catch (err: any) {
      setError(err.message || "Failed to update sport settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSport || !rosterAthleteId.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/combat/sports/${selectedSport.id}/players`, {
        method: "POST",
        body: JSON.stringify({ athleteUniqueId: rosterAthleteId.trim() })
      });
      setMessage(`Player added to roster successfully!`);
      setRosterAthleteId("");
      reloadSelectedSport(selectedSport.id);
    } catch (err: any) {
      setError(err.message || "Failed to register player");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePlayer(playerId: string) {
    if (!selectedSport) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/combat/sports/${selectedSport.id}/players/${playerId}`, {
        method: "DELETE"
      });
      setMessage("Player removed from roster.");
      reloadSelectedSport(selectedSport.id);
    } catch (err: any) {
      setError(err.message || "Failed to remove player");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header breadcrumb */}
      <div className="mb-6">
        <Link href="/dashboard/admin/events" className="btn-back">
          &larr; Back to Events Overview
        </Link>
      </div>

      <h1 className="font-display text-3xl font-bold mb-1 text-white">Manage Combat Events</h1>
      <p className="text-white/50 text-sm mb-8">Create annual Combat tournaments, register sports, set customized winning point weights, and manage registered athlete rosters.</p>

      {/* Alerts */}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 rounded-lg mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/20 text-green-300 text-xs p-3 rounded-lg mb-6">{message}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Create Tournament & Add Sport Forms */}
        <div className="space-y-6">
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
                </label>

                <label className="block">
                  <span className="label text-[10px]">Winning Trophy Points Weight</span>
                  <input
                    type="number"
                    className="input-field text-xs"
                    placeholder="e.g. 10"
                    value={newPointsWeight}
                    onChange={(e) => setNewPointsWeight(Number(e.target.value))}
                    required
                  />
                  <span className="text-[9px] text-white/30 block mt-1">Points awarded to winning department in Leaderboard.</span>
                </label>

                <button type="submit" disabled={loading} className="btn-gold text-xs w-full py-2">
                  Register Sport
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Center/Right Column: Events & Registered Sports list */}
        <div className="lg:col-span-2 space-y-6">
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
                            <div key={sp.id} className={`bg-surface/50 border rounded-lg p-3 flex flex-col justify-between transition-colors ${selectedSport?.id === sp.id ? 'border-gold bg-gold/5' : 'border-white/5'}`}>
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-semibold text-xs text-white">{sp.sportName}</h4>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/10 text-gold font-bold">
                                    {sp.pointsWeight} Points
                                  </span>
                                </div>
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
                                    🔑 Scorekeepers: {sp.subHeads.map((sb: any) => sb.user.fullName.split(" ")[0]).join(", ")}
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] text-white/30">{sp.matches?.length || 0} matches scheduled</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenSettings(sp)}
                                  className="text-[10px] text-gold font-semibold hover:underline"
                                >
                                  ⚙️ Settings & Roster
                                </button>
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

          {/* Settings & Roster Panel Details */}
          {selectedSport && (
            <div className="stat-card border border-gold/30 bg-gold/[0.02]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure: {selectedSport.sportName}</h3>
                  <p className="text-[10px] text-white/40">Edit head permissions, change tournament weights, or build player team lists.</p>
                </div>
                <button
                  onClick={() => setSelectedSport(null)}
                  className="text-xs text-white/40 hover:text-white"
                >
                  ✕ Close Panel
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Edit Settings Column */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gold">Sport Settings</h4>
                  <form onSubmit={handleUpdateSportSettings} className="space-y-3">
                    <label className="block">
                      <span className="label text-[10px]">Sport Head Athletic ID</span>
                      <input
                        className="input-field text-xs"
                        placeholder="e.g. KX24123071"
                        value={settingsHeadUniqueId}
                        onChange={(e) => setSettingsHeadUniqueId(e.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="label text-[10px]">Points Weight</span>
                      <input
                        type="number"
                        className="input-field text-xs"
                        placeholder="e.g. 10"
                        value={settingsWeight}
                        onChange={(e) => setSettingsWeight(Number(e.target.value))}
                        required
                      />
                    </label>

                    <button type="submit" disabled={loading} className="btn-gold text-xs w-full py-1.5">
                      Save Settings
                    </button>
                  </form>
                </div>

                {/* Team Roster List Column */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gold">Player Roster</h4>
                  
                  {/* Add Player Input */}
                  <form onSubmit={handleRegisterPlayer} className="flex gap-2">
                    <input
                      className="input-field text-xs py-1.5"
                      placeholder="Enter Player Athletic ID"
                      value={rosterAthleteId}
                      onChange={(e) => setRosterAthleteId(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={loading} className="btn-gold text-xs py-1.5 px-3 shrink-0">
                      Add
                    </button>
                  </form>

                  {/* Player list */}
                  <div className="bg-surface/30 border border-white/5 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1.5">
                    {rosterLoading ? (
                      <p className="text-center text-[10px] text-white/30 py-4">Loading roster...</p>
                    ) : rosterPlayers.length === 0 ? (
                      <p className="text-center text-[10px] text-white/30 py-4 italic">No registered athletes in roster</p>
                    ) : (
                      rosterPlayers.map((player: any) => (
                        <div key={player.id} className="flex items-center justify-between bg-surface/50 border border-white/5 px-2 py-1.5 rounded">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{player.user.fullName}</p>
                            <p className="text-[9px] text-white/40">{player.user.uniqueId} • {player.user.department}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePlayer(player.id)}
                            className="text-[9px] text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
