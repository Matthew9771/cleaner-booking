import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronLeft } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, status, cleaner_paid_at, properties(name, address), cleaners(name)")
    .in("status", ["offered", "pending", "ready_for_review", "completed", "declined"])
    .order("job_date", { ascending: true })
    .limit(80);
  const items = (jobs ?? [])
    .filter((job) => job.status === "ready_for_review" || job.status === "declined" || (job.status === "offered" && job.job_date <= today) || (job.status === "completed" && !job.cleaner_paid_at))
    .slice(0, 30);

  return (
    <main className="app-shell">
      <AdminNav active="notifications" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard"><ChevronLeft aria-hidden="true" />Dashboard</Link>
          <p className="eyebrow">Notifications</p>
          <h1>Admin notification centre</h1>
          <p className="intro">Cleaner replies, review work, declined jobs, and unpaid completed cleans.</p>
        </div>
      </section>
      <section className="wide-panel">
        <div className="section-heading"><div><p className="eyebrow">Action needed</p><h2>{items.length} notifications</h2></div><Bell aria-hidden="true" /></div>
        <div className="compact-job-list">
          {items.map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
            const label = job.status === "ready_for_review" ? "Verify clean" : job.status === "declined" ? "Reassign cleaner" : job.status === "completed" ? "Mark payment" : "Chase reply";
            return (
              <Link className="job-row" href={`/jobs/${job.id}`} key={job.id}>
                <span><strong>{label}</strong><small>{property?.name ?? "Property"} · {cleaner?.name ?? "No cleaner"}</small></span>
                <span>{formatDate(job.job_date)}</span>
                <span className={`status-pill status-${job.status}`}>{job.status}</span>
              </Link>
            );
          })}
          {!items.length ? <p className="empty-state">No admin notifications right now.</p> : null}
        </div>
      </section>
    </main>
  );
}
