"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import CaptainSportSelector from "@/components/CaptainSportSelector";
export default function CaptainSettingsPage() {
  const [mySport, setMySport] = useState<any>(null);
  const [form, setForm] = useState({
    teamName: "",
    ground: "",
    practiceTime: "",
    description: "",
    customAbout: "",
    customNotice: "",
  });
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
      setForm({
        teamName: mySport.teamName || "",
        ground: mySport.ground || "",
        practiceTime: mySport.practiceTime || "",
        description: mySport.description || "",
        customAbout: mySport.customAbout || "",
        customNotice: mySport.customNotice || "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [mySport?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${mySport.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setMessage("Sport profile updated successfully.");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleResign() {
    if (!confirm("Are you sure you want to resign from your position as Captain of this team? This action is immediate and cannot be undone.")) return;
    setError("");
    setMessage("");
    try {
      await api(`/api/sports/${mySport.id}/resign-captain`, { method: "POST" });
      alert("You have stepped down from captainship.");
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading settings...</div>;
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

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1 text-white">Sport Profile Settings</h1>
        <p className="text-white/50 text-sm">Configure practice grounds, schedule timings, description and custom team name for {mySport?.name}.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}
      {message && <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-4 py-3 mb-6">{message}</div>}

      <div className="stat-card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="label">Custom Team Name (e.g. Thunder Strikers)</span>
            <input
              className="input-field"
              value={form.teamName}
              onChange={(e) => setForm({ ...form, teamName: e.target.value })}
              placeholder="e.g. Thunder Strikers"
            />
          </label>
          <label className="block">
            <span className="label">Practice Ground Location</span>
            <input
              className="input-field"
              value={form.ground}
              onChange={(e) => setForm({ ...form, ground: e.target.value })}
              placeholder="e.g. Main Ground Backside"
            />
          </label>
          <label className="block">
            <span className="label">Practice Timings</span>
            <input
              className="input-field"
              value={form.practiceTime}
              onChange={(e) => setForm({ ...form, practiceTime: e.target.value })}
              placeholder="e.g. 6:00 AM - 8:00 AM"
            />
          </label>
          <label className="block">
            <span className="label">Sport Description</span>
            <textarea
              className="input-field min-h-[120px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Provide information about training, trials, and team rules..."
            />
          </label>
          <label className="block">
            <span className="label">Explore Details - Custom About (What others see on clicking Explore)</span>
            <textarea
              className="input-field min-h-[100px]"
              value={form.customAbout}
              onChange={(e) => setForm({ ...form, customAbout: e.target.value })}
              placeholder="Explain team culture, recruitment info, achievements for non-members..."
            />
          </label>
          <label className="block">
            <span className="label">Explore Details - Notice Message</span>
            <input
              className="input-field"
              value={form.customNotice}
              onChange={(e) => setForm({ ...form, customNotice: e.target.value })}
              placeholder="e.g. Tryouts starting next week! Attend at ground."
            />
          </label>
          <button type="submit" className="btn-gold w-full mt-4">Save Profile Settings</button>
        </form>

        <div className="border-t border-white/5 mt-8 pt-6">
          <h3 className="text-red-400 font-semibold mb-2 text-sm">Danger Zone</h3>
          <p className="text-xs text-white/40 mb-3">Stepping down from captainship will remove your access to the team manager panels immediately.</p>
          <button
            type="button"
            onClick={handleResign}
            className="bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 font-semibold px-5 py-2 rounded-lg transition-all text-xs"
          >
            Resign Captainship
          </button>
        </div>
      </div>
    </div>
  );
}
