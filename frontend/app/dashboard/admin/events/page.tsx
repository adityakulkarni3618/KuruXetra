"use client";

import Link from "next/link";

export default function AdminEventsPage() {
  const events = [
    {
      href: "/dashboard/admin/events/combat",
      title: "COMBAT",
      subtitle: "Annual Inter-Department Championship",
      desc: "The college's flagship annual inter-departmental competition. 6 departments battle across indoor and outdoor sports. Manage all sports, assign Sport Heads, schedule matches, assign points, and build department rosters.",
      badge: "Active",
      badgeColor: "text-green-400 bg-green-500/10 border-green-500/20",
      icon: (
        <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.003 9.003 0 1020.945 13H18a5 5 0 01-5-5V5.055a9.003 9.003 0 00-2-2z" />
        </svg>
      ),
      stats: [
        { label: "Departments", value: "6" },
        { label: "Sport Types", value: "Multi" },
        { label: "Format", value: "Points-based" },
      ],
    },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/dashboard/admin" className="btn-back">
          &larr; Back to Admin Panel
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1 text-white">Events & Tournaments</h1>
        <p className="text-white/50 text-sm">
          Manage college-wide inter-department events. Each event has its own configuration, sport categories, match schedules, and leaderboard.
        </p>
      </div>

      {/* Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {events.map((ev) => (
          <Link
            key={ev.href}
            href={ev.href}
            className="stat-card flex flex-col justify-between hover:border-gold/30 transition-all group duration-200"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/20">
                  {ev.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${ev.badgeColor}`}>
                  {ev.badge}
                </span>
              </div>

              <h2 className="font-display text-2xl font-bold text-white mb-0.5 group-hover:text-gold transition-colors">
                {ev.title}
              </h2>
              <p className="text-[11px] font-semibold text-gold/70 mb-3 uppercase tracking-wider">
                {ev.subtitle}
              </p>
              <p className="text-xs text-white/50 leading-relaxed mb-4">{ev.desc}</p>

              {/* Quick stats */}
              <div className="flex gap-4 mt-2">
                {ev.stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-sm font-bold text-white">{s.value}</div>
                    <div className="text-[9px] text-white/40 uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs font-semibold text-gold group-hover:translate-x-1 transition-transform">
              Open Event Dashboard &rarr;
            </div>
          </Link>
        ))}

        {/* Placeholder: future events */}
        <div className="stat-card flex flex-col items-center justify-center py-12 border-dashed border-white/10 text-center opacity-50 cursor-not-allowed">
          <svg className="w-10 h-10 text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-xs text-white/30 font-medium">More events coming soon</p>
          <p className="text-[10px] text-white/20 mt-1">Future tournaments will appear here</p>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-gold/5 border border-gold/15 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] text-white/50 leading-relaxed">
          <span className="text-gold font-semibold">Admin-only</span> — All event settings, roster management, points configuration and match scheduling controls are available inside each event dashboard. Sport Heads get limited access to their own sport panel after being assigned.
        </p>
      </div>
    </div>
  );
}
