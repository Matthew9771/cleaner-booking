import Link from "next/link";
import { CleanerNav } from "../cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

type CleanerJobsPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function CleanerJobsPage({ searchParams }: CleanerJobsPageProps) {
  const { status = "upcoming" } = await searchParams;
  const { supabase, cleaner } = await requireCleaner();
  let query = supabase
    .from("cleaning_jobs")
    .select("id, job_date, status, payment_pence, public_offer_token, cleaner_paid_at, properties(name, address)")
    .eq("cleaner_id", cleaner.id)
    .order("job_date", { ascending: false })
    .limit(100);
  if (status === "upcoming") {
    query = query.in("status", ["accepted", "pending", "ready_for_review"]);
  } else if (status === "completed") {
    query = query.eq("status", "completed");
  } else if (status === "unpaid") {
    query = query.eq("status", "completed").is("cleaner_paid_at", null);
  }
  const { data: jobs } = await query;
  const filters = [["upcoming", "Upcoming"], ["completed", "Completed"], ["unpaid", "Unpaid"], ["all", "All"]];

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="jobs" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="dashboard-header compact">
        <div><p className="eyebrow">Jobs</p><h1>Your job history</h1><p className="intro">Upcoming, submitted, and completed cleans.</p></div>
      </section>
      <section className="wide-panel">
        <div className="filter-tabs">
          {filters.map(([key, label]) => (
            <Link className={`filter-tab${status === key ? " active" : ""}`} href={`/cleaner/jobs?status=${key}`} key={key}>{label}</Link>
          ))}
        </div>
        <div className="jobs-table">
          {(jobs ?? []).map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            return (
              <Link className="job-row" href={`/cleaner/jobs/${job.id}`} key={job.id}>
                <span><strong>{property?.name ?? "Property"}</strong><small>{property?.address ?? "No address"}</small></span>
                <span>{formatDate(job.job_date)}</span>
                <span>£{(job.payment_pence / 100).toFixed(0)}</span>
                <span className={`status-pill status-${job.status}`}>{job.status}</span>
              </Link>
            );
          })}
          {!jobs?.length ? <p className="empty-state">No jobs yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
