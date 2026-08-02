"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

interface CaptainInfo {
  id: string;
  fullName: string;
  uniqueId: string;
  email: string;
  mobileNumber: string;
  rollNumber: string;
  department: string;
  academicYear: string;
  profilePhotoUrl?: string;
  fitnessGoal?: string;
  sportName: string;
  roleType: "Captain" | "Vice-Captain";
}

export default function AdminCaptainsPage() {
  const [captains, setCaptains] = useState<CaptainInfo[]>([]);
  const [selectedCaptain, setSelectedCaptain] = useState<CaptainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const sports = await api("/api/sports");
        const list: CaptainInfo[] = [];
        sports.forEach((sport: any) => {
          if (sport.captain) {
            list.push({
              ...sport.captain,
              sportName: sport.teamName || sport.name,
              roleType: "Captain",
            });
          }
          if (sport.viceCaptain) {
            list.push({
              ...sport.viceCaptain,
              sportName: sport.teamName || sport.name,
              roleType: "Vice-Captain",
            });
          }
        });
        setCaptains(list);
      } catch (err: any) {
        setError(err.message || "Failed to load leaders");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading captains list...</div>;
  }

  if (selectedCaptain) {
    return (
      <div>
        <div className="mb-6">
          <button onClick={() => setSelectedCaptain(null)} className="btn-back">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Captains List
          </button>
        </div>

        <div className="stat-card max-w-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
            {selectedCaptain.profilePhotoUrl ? (
              <img
                src={selectedCaptain.profilePhotoUrl}
                alt={selectedCaptain.fullName}
                className="w-24 h-24 rounded-full object-cover border-2 border-gold/40"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-surface-light border-2 border-dashed border-white/10 flex items-center justify-center text-white/20">
                No Photo
              </div>
            )}
            <div className="text-center sm:text-left">
              <h2 className="font-display text-2xl font-bold text-white">{selectedCaptain.fullName}</h2>
              <p className="text-sm text-gold mt-1">
                {selectedCaptain.roleType} of {selectedCaptain.sportName}
              </p>
              <p className="text-xs text-white/40 mt-1">Athletic ID: {selectedCaptain.uniqueId}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-6 text-sm">
            <div>
              <p className="label text-xs">Email Address</p>
              <p className="text-white mt-0.5">{selectedCaptain.email}</p>
            </div>
            <div>
              <p className="label text-xs">Mobile Number</p>
              <p className="text-white mt-0.5">{selectedCaptain.mobileNumber || "—"}</p>
            </div>
            <div>
              <p className="label text-xs">Roll Number</p>
              <p className="text-white mt-0.5">{selectedCaptain.rollNumber || "—"}</p>
            </div>
            <div>
              <p className="label text-xs">Department</p>
              <p className="text-white mt-0.5">{selectedCaptain.department || "—"}</p>
            </div>
            <div>
              <p className="label text-xs">Academic Year</p>
              <p className="text-white mt-0.5">{selectedCaptain.academicYear || "—"}</p>
            </div>
            {selectedCaptain.fitnessGoal && (
              <div className="md:col-span-2">
                <p className="label text-xs">Fitness Goal</p>
                <p className="text-white mt-0.5">{selectedCaptain.fitnessGoal}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="btn-back">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1 text-white">Captains & Leaders</h1>
        <p className="text-white/50 text-sm">List of all sports captains and vice-captains. Click on any profile to see full details.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {captains.map((cap) => (
          <div
            key={`${cap.id}-${cap.roleType}`}
            onClick={() => setSelectedCaptain(cap)}
            className="stat-card hover:border-gold/30 transition-all cursor-pointer flex items-center gap-4 group duration-150"
          >
            {cap.profilePhotoUrl ? (
              <img
                src={cap.profilePhotoUrl}
                alt={cap.fullName}
                className="w-12 h-12 rounded-full object-cover shrink-0 border border-white/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surface-light border border-dashed border-white/10 flex items-center justify-center text-white/20 shrink-0">
                <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div className="overflow-hidden">
              <h3 className="font-display font-semibold text-white truncate group-hover:text-gold transition-colors">{cap.fullName}</h3>
              <p className="text-xs text-gold font-medium mt-0.5">{cap.roleType}</p>
              <p className="text-[10px] text-white/40 truncate">{cap.sportName}</p>
            </div>
          </div>
        ))}
        {captains.length === 0 && (
          <div className="col-span-full stat-card text-center py-10 text-white/40">
            No captains or vice-captains assigned in the system.
          </div>
        )}
      </div>
    </div>
  );
}
