"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminSportDashboard() {
  const { id: sportId } = useParams() as { id: string };
  const [sport, setSport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const sportsList = await api("/api/sports");
        const found = sportsList.find((s: any) => s.id === sportId);
        if (!found) {
          setError("Sport not found");
          return;
        }
        setSport(found);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sportId]);

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading sport details...</div>;
  }

  if (error || !sport) {
    return (
      <div className="stat-card text-center py-10">
        <p className="text-red-300 font-medium mb-3">{error || "Sport details could not be found."}</p>
        <Link href="/dashboard/admin" className="text-xs text-gold hover:underline">
          &larr; Back to Admin Dashboard
        </Link>
      </div>
    );
  }

  const cards = [
    {
      href: `/dashboard/admin/sports/${sportId}/roster`,
      title: "Team Roster & Roles",
      desc: "Assign Captain and Vice-Captain, manage roster memberships, promote to SS, suspend, or delete players.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: `/dashboard/admin/sports/${sportId}/meetings`,
      title: "Team Meetings log",
      desc: "View meeting scores, verify scheduled meetings, and delete scheduled logs.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      href: `/dashboard/admin/sports/${sportId}/announcements`,
      title: "Announcements List",
      desc: "View published announcements, verify authors, and delete old notice boards.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    },
    {
      href: `/dashboard/admin/sports/${sportId}/sessions`,
      title: "Practice & Workouts Logs",
      desc: "Track practice sessions logged by captains and review athlete completions and round counts.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      href: `/dashboard/admin/sports/${sportId}/attendance`,
      title: "Attendance Database",
      desc: "View athlete check-ins, filter by custom ranges, and export CSV/PDF reports.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/admin" className="text-xs text-gold hover:underline">
          &larr; Back to Admin Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1 text-white">{sport.teamName || sport.name}</h1>
          <p className="text-white/50 text-sm">{sport.teamName ? `${sport.name} · ` : ""}Administration & custom configs settings.</p>
        </div>
        <span className={`text-xs uppercase font-bold px-3 py-1 rounded-full border ${sport.isActive ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
          {sport.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}
