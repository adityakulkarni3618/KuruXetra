"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function CaptainDashboard() {
  const [mySport, setMySport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [me, sports] = await Promise.all([api("/api/auth/me"), api("/api/sports")]);
        const sport = sports.find((s: any) => s.captainId === me.id || s.viceCaptainId === me.id);
        setMySport(sport);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-white/40 text-center py-10">Loading team details...</div>;
  }

  if (error || !mySport) {
    return (
      <div className="stat-card text-center py-10">
        <p className="text-red-300 font-medium mb-3">{error || "You are not assigned as captain or vice-captain of any sport."}</p>
        <p className="text-sm text-white/40">If this is an error, please contact the Sports Secretary.</p>
      </div>
    );
  }

  const cards = [
    {
      href: "/dashboard/captain/roster",
      title: "Team Roster",
      desc: "Manage roster memberships, approve requests, and award MVP/Team Leader badges.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: "/dashboard/captain/meetings",
      title: "Team Meetings",
      desc: "Schedule team meetings, score attendance out of 10, and manage meeting records.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      href: "/dashboard/captain/announcements",
      title: "Announcements",
      desc: "Post news and official announcements directly to your team's feed.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    },
    {
      href: "/dashboard/captain/sessions",
      title: "Conditioning Sessions",
      desc: "Create conditioning/practice sessions, configure rounds, and track athlete completion.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      href: "/dashboard/captain/attendance",
      title: "Mark Attendance",
      desc: "Mark present roster members on the field, view historical reports, and download data.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      href: "/dashboard/captain/settings",
      title: "Sport Profile & Settings",
      desc: "Update custom team name (e.g. Thunder Strikers), ground location, practice times, and description.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1 text-white">{mySport.teamName || mySport.name}</h1>
      <p className="text-white/50 text-sm mb-8">{mySport.teamName ? `${mySport.name} · ` : ""}Team Management & configuration settings.</p>

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
