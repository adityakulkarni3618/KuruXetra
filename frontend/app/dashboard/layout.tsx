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

  useEffect(() => {
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
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="btn-primary text-xs px-3 py-2"
          type="button"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      <aside
        className={`md:w-60 md:shrink-0 md:border-r border-border p-6 flex flex-col bg-surface md:bg-transparent ${
          menuOpen ? "block absolute inset-x-0 top-16 z-20 border-b border-border" : "hidden"
        } md:block`}
      >
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
            <button onClick={toggleTheme} className="text-xs text-gold hover:text-gold/80 flex items-center gap-1" type="button">
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
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
