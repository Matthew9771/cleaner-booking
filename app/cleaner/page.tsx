import Link from "next/link";
import { CalendarCheck2, ClipboardList } from "lucide-react";
import { CleanerNav } from "./cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    offered: "Available",
    accepted: "Accepted",
    pending: "Pending clean",
    ready_for_review: "Sent for review",
    completed: "Completed"
  };
  return labels[status] || status;
}

export default async function CleanerDashboardPage() {
  const { supabase, cleaner } = await requireCleaner();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: assignedJobs }, { data: availableJobs }, { data: completedJobs }, { data: notifications }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, payment_pence, public_offer_token, properties(name, address, check_out_time, check_in_time)")
      .eq("cleaner_id", cleaner.id)
      .in("status", ["accepted", "pending", "ready_for_review"])
      .gte("job_date", today)
      .order("job_date", { ascending: true })
      .limit(10),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, payment_pence, public_offer_token, properties(name, address)")
      .is("cleaner_id", null)
      .eq("status", "draft")
      .gte("job_date", today)
      .order("job_date", { ascending: true })
      .limit(8),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, payment_pence, cleaner_paid_at, properties(name, address)")
      .eq("cleaner_id", cleaner.id)
      .eq("status", "completed")
      .order("job_date", { ascending: false })
      .limit(5),
    supabase
      .from("cleaning_jobs")
      .select("id")
      .eq("cleaner_id", cleaner.id)
      .in("status", ["pending", "ready_for_review"])
      .gte("job_date", today)
  ]);

  const dueToday = (assignedJobs ?? []).filter((job) => job.job_date === today).length;
  const unpaid = (completedJobs ?? []).filter((job) => !job.cleaner_paid_at).length;

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="dashboard" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Cleaner dashboard</p>
          <h1>Hello, {cleaner.name}</h1>
          <p className="intro">Your accepted cleans, available jobs, and payment history.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Cleaner totals">
        <article className="metric-card">
          <CalendarCheck2 aria-hidden="true" />
          <span>Due today</span>
          <strong>{dueToday}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Upcoming</span>
          <strong>{assignedJobs?.length ?? 0}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Unpaid</span>
          <strong>{unpaid}</strong>
        </article>
        <Link className="metric-card metric-link" href="/cleaner/notifications">
          <ClipboardList aria-hidden="true" />
          <span>Notifications</span>
          <strong>{notifications?.length ?? 0}</strong>
        </Link>
      </section>

      <section className="queue-grid">
        <article className="wide-panel priority-panel">
          <div className="section-heading"><div><p className="eyebrow">Upcoming</p><h2>Your cleans</h2></div></div>
          <div className="compact-job-list">
            {(assignedJobs ?? []).map((job) => {
              const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
              return (
                <Link className="job-row" href={`/cleaner/jobs/${job.id}`} key={job.id}>
                  <span><strong>{property?.name ?? "Property"}</strong><small>{property?.address ?? "No address"}</small></span>
                  <span>{formatDate(job.job_date)}</span>
                  <span>£{(job.payment_pence / 100).toFixed(0)}</span>
                  <span className={`status-pill status-${job.status}`}>{formatStatus(job.status)}</span>
                </Link>
              );
            })}
            {!assignedJobs?.length ? <p className="empty-state">No upcoming accepted cleans.</p> : null}
          </div>
        </article>

        <article className="wide-panel">
          <div className="section-heading"><div><p className="eyebrow">Available</p><h2>Jobs you can request</h2></div></div>
          <div className="compact-job-list">
            {(availableJobs ?? []).map((job) => {
              const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
              return (
                <div className="job-row action-row" key={job.id}>
                  <span><strong>{property?.name ?? "Property"}</strong><small>{property?.address ?? "No address"}</small></span>
                  <span>{formatDate(job.job_date)}</span>
                  <span>£{(job.payment_pence / 100).toFixed(0)}</span>
                  <span className="status-pill status-draft">Available</span>
                  <form action={`/cleaner/jobs/${job.id}/claim`} method="post">
                    <button className="mini-button" type="submit">Pick job</button>
                  </form>
                </div>
              );
            })}
            {!availableJobs?.length ? <p className="empty-state">No open jobs available right now.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
