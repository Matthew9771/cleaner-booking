import Link from "next/link";
import { CalendarDays, Home, KeyRound, Sparkles, UsersRound } from "lucide-react";

const workflows = [
  {
    title: "Cleaning Jobs",
    description: "Create, assign, confirm, and track cleaner jobs from one place.",
    icon: Sparkles
  },
  {
    title: "Properties",
    description: "Store addresses, check-in rules, lockbox details, and guest notes.",
    icon: Home
  },
  {
    title: "Calendar",
    description: "See upcoming checkouts, cleans, arrivals, and gaps.",
    icon: CalendarDays
  },
  {
    title: "Team Access",
    description: "Give cleaners and admins the right view after login.",
    icon: UsersRound
  }
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="brand">
          <KeyRound aria-hidden="true" />
          <span>Agatha Living</span>
        </div>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Property Operations</p>
            <h1>Run cleaning jobs, properties, and team access from one app.</h1>
            <p className="intro">
              This project is now set up as a full app foundation with login and database tooling ready for Supabase.
            </p>
            <div className="actions">
              <Link className="button primary" href="/login">
                Sign in
              </Link>
              <Link className="button secondary" href="/jobs/new">
                Create job flow
              </Link>
            </div>
          </div>
          <div className="operations-panel" aria-label="Operations snapshot">
            <div className="panel-header">
              <span>Today</span>
              <strong>3 actions</strong>
            </div>
            <div className="panel-row">
              <span>62 Greystead Road</span>
              <strong>Cleaner needed</strong>
            </div>
            <div className="panel-row">
              <span>Lockbox update</span>
              <strong>Pending</strong>
            </div>
            <div className="panel-row">
              <span>Guest check-in</span>
              <strong>3:00pm</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="workflow-grid" aria-label="Core workflows">
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          return (
            <article className="workflow-card" key={workflow.title}>
              <Icon aria-hidden="true" />
              <h2>{workflow.title}</h2>
              <p>{workflow.description}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
