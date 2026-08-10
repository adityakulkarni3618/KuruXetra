"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const baseNav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/search", label: "Search Directory" },
  { href: "/dashboard/attendance", label: "Attendance" },
  { href: "/dashboard/workouts", label: "Workouts" },
  { href: "/dashboard/running", label: "Running" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/sports", label: "Sports" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && user.status === "PENDING_APPROVAL" && pathname !== "/dashboard/profile") {
      router.push("/dashboard/profile");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-white/40">Loading...</div>;
  }

  const nav = user.status === "PENDING_APPROVAL"
    ? [{ href: "/dashboard/profile", label: "Profile" }]
    : [...baseNav];

  if (user.status !== "PENDING_APPROVAL") {
    if (user.role === "CAPTAIN" || (user.captainOf && user.captainOf.length > 0)) {
      nav.push({ href: "/dashboard/captain", label: "My Team" });
    }
    if (user.role === "SUPER_ADMIN") {
      nav.push({ href: "/dashboard/admin", label: "Admin" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden w-full border-b border-border px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg font-bold">
          KURUXETRA<span className="text-gold">.</span>
        </Link>
        <div className="flex items-center gap-2">
          {mounted ? (
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg border border-gold/20 bg-gold/5 hover:bg-gold/10 transition-colors flex items-center justify-center shrink-0"
              type="button"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg border border-gold/10 bg-gold/5 shrink-0" />
          )}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="btn-primary text-xs px-3 py-2"
            type="button"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      <aside
        className={`md:w-60 md:shrink-0 md:border-r border-border p-6 flex flex-col bg-surface md:bg-transparent ${
          menuOpen ? "block absolute inset-x-0 top-16 z-20 border-b border-border" : "hidden"
        } md:block`}
      >
        <div className="hidden md:flex items-center justify-between mb-6 pb-4 border-b border-border">
          <Link href="/dashboard" className="font-display text-lg font-bold">
            KURUXETRA<span className="text-gold">.</span>
          </Link>
          {mounted ? (
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg border border-gold/20 bg-gold/5 hover:bg-gold/10 transition-colors flex items-center justify-center shrink-0"
              type="button"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg border border-gold/10 bg-gold/5 shrink-0" />
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm ${
                pathname === item.href ? "bg-blue text-white" : "text-white/60 hover:bg-border hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4 mt-4 md:mt-8">
          <p className="text-sm font-medium">{user.fullName}</p>
          <p className="text-xs text-white/40">{user.uniqueId} · {roleLabel(user.role)}</p>
          <div className="flex justify-between items-center mt-3">
            <button onClick={logout} className="text-xs text-red-400 hover:text-red-300" type="button">
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Sports Secretary",
    CAPTAIN: "Captain",
    STUDENT_ATHLETE: "Athlete",
    FITNESS_MEMBER: "Fitness Member",
  };
  return map[role] || role;
}
