import Link from "next/link";
import { Bell } from "lucide-react";
import { CleanerNav } from "../cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export default async function CleanerNotificationsPage() {
  const { supabase, cleaner } = await requireCleaner();
  const today = new Date().toISOString().slice(0, 10);
  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, status, payment_pence, cleaner_paid_at, properties(name, address)")
    .eq("cleaner_id", cleaner.id)
    .in("status", ["pending", "ready_for_review", "completed"])
    .gte("job_date", today)
    .order("job_date", { ascending: true })
    .limit(40);
  const items = (jobs ?? []).filter((job) => job.status !== "completed" || !job.cleaner_paid_at);

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="notifications" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Your notification centre</h1>
          <p className="intro">Upcoming cleans, submitted jobs, and unpaid completed work.</p>
        </div>
      </section>
      <section className="wide-panel">
        <div className="section-heading"><div><p className="eyebrow">Action needed</p><h2>{items.length} notifications</h2></div><Bell aria-hidden="true" /></div>
        <div className="compact-job-list">
          {items.map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const label = job.status === "ready_for_review" ? "Waiting for admin review" : job.status === "completed" ? "Payment pending" : "Clean upcoming";
            return (
              <Link className="job-row" href={`/cleaner/jobs/${job.id}`} key={job.id}>
                <span><strong>{label}</strong><small>{property?.name ?? "Property"} · {property?.address ?? "No address"}</small></span>
                <span>{formatDate(job.job_date)}</span>
                <span>£{(job.payment_pence / 100).toFixed(0)}</span>
                <span className={`status-pill status-${job.status}`}>{job.status}</span>
              </Link>
            );
          })}
          {!items.length ? <p className="empty-state">No cleaner notifications right now.</p> : null}
        </div>
      </section>
    </main>
  );
}
