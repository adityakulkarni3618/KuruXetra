import Link from "next/link";

const sports = ["Kho-Kho", "Kabaddi", "Cricket", "Football", "Volleyball", "Badminton", "Table Tennis"];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-border">
        <div className="font-display text-xl font-bold tracking-tight">
          KURUXETRA<span className="text-gold">.</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/70 hover:text-white px-4 py-2">
            Log in
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Register
          </Link>
        </div>
      </nav>

      <section className="px-6 md:px-12 py-20 md:py-28 max-w-5xl">
        <p className="label text-gold">The ground register, digitized</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] mt-3">
          Every check-in, every rep,
          <br />
          every run — on record.
        </h1>
        <p className="text-white/60 text-lg mt-6 max-w-xl">
          One account for attendance, training, and rankings across every sport on campus.
          No more paper registers at the ground gate.
        </p>
        <div className="flex gap-4 mt-8">
          <Link href="/register" className="btn-gold">
            Get your athlete ID
          </Link>
          <Link href="/login" className="btn-primary bg-surface border border-border hover:bg-card">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="px-6 md:px-12 pb-24">
        <p className="label mb-4">Sports on the platform</p>
        <div className="flex flex-wrap gap-3">
          {sports.map((s) => (
            <div key={s} className="stat-card px-5 py-3 text-sm font-medium">
              {s}
            </div>
          ))}
          <div className="stat-card px-5 py-3 text-sm font-medium text-white/50">Individual Fitness</div>
        </div>
      </section>

      <section className="px-6 md:px-12 pb-24 grid md:grid-cols-3 gap-5 max-w-5xl">
        {[
          { t: "Check in at the ground", d: "Scan-free digital attendance replaces the paper register." },
          { t: "Log training yourself", d: "Workouts and runs, tracked like Strava, points added automatically." },
          { t: "Climb the leaderboard", d: "Global, per-sport, and department rankings, updated live." },
        ].map((f) => (
          <div key={f.t} className="stat-card">
            <h3 className="font-display font-semibold mb-2">{f.t}</h3>
            <p className="text-sm text-white/50">{f.d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
