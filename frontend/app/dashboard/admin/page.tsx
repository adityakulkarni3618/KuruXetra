"use client";

import Link from "next/link";

export default function AdminPage() {
  const cards = [
    {
      href: "/dashboard/admin/pending-approvals",
      title: "Pending Approvals",
      desc: "Approve or reject new user registrations and student athlete profiles waiting for activation.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/admin/sports",
      title: "Manage Sports",
      desc: "Create new sports, assign captains, manage rosters, and configure team settings for all active teams.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/admin/search-athletes",
      title: "Search Athletes Database",
      desc: "Query all athletes, reset passwords, suspend/activate accounts, promote to Sports Secretary, or delete accounts.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/admin/workout-types",
      title: "Workout Configurations",
      desc: "Configure points scales, add new approved activities, and enable/disable workouts.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      href: "/dashboard/admin/announcements",
      title: "Announcements & Notices",
      desc: "Manage college-wide announcements and notice boards visible to all athletes.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/admin/sports-secretaries",
      title: "Sports Secretaries",
      desc: "View all users who have Sports Secretary access. See their profiles, role history, and manage their permissions.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/admin/captains",
      title: "Captains & Leaders",
      desc: "View profiles, contact information, and assigned sports for all current captains and vice-captains.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/admin/events",
      title: "Events & Tournaments",
      desc: "Manage college inter-department events like COMBAT. Configure sports, assign Sport Heads, set points, and build player rosters.",
      icon: (
        <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.003 9.003 0 1020.945 13H18a5 5 0 01-5-5V5.055a9.003 9.003 0 00-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1 text-white">Sports Secretary Admin Panel</h1>
        <p className="text-white/50 text-sm">Select an administrative task, edit sports settings, or approve roster requests.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="stat-card flex flex-col justify-between hover:border-gold/30 transition-all group duration-200"
          >
            <div>
              <div className="mb-4">{card.icon}</div>
              <h2 className="font-display font-semibold text-lg text-white mb-2 group-hover:text-gold transition-colors">
                {card.title}
              </h2>
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
