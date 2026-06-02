import Link from "next/link";
import { CleanerNav } from "../cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default async function CleanerPaymentsPage() {
  const { supabase, cleaner } = await requireCleaner();
  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, payment_pence, cleaner_paid_at, public_offer_token, cleaner_invoice_number, properties(name, address)")
    .eq("cleaner_id", cleaner.id)
    .eq("status", "completed")
    .order("job_date", { ascending: false })
    .limit(100);
  const totalPaid = (jobs ?? []).filter((job) => job.cleaner_paid_at).reduce((sum, job) => sum + job.payment_pence, 0);
  const totalUnpaid = (jobs ?? []).filter((job) => !job.cleaner_paid_at).reduce((sum, job) => sum + job.payment_pence, 0);

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="payments" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="dashboard-header compact">
        <div><p className="eyebrow">Payments</p><h1>Your payments</h1><p className="intro">Completed cleans, paid and unpaid.</p></div>
        <a className="button secondary" href="/cleaner/payments/export">Export invoices</a>
      </section>
      <section className="metric-grid">
        <article className="metric-card"><span>Paid</span><strong>£{(totalPaid / 100).toFixed(0)}</strong></article>
        <article className="metric-card"><span>Unpaid</span><strong>£{(totalUnpaid / 100).toFixed(0)}</strong></article>
        <article className="metric-card"><span>Completed</span><strong>{jobs?.length ?? 0}</strong></article>
      </section>
      <section className="wide-panel">
        <div className="jobs-table">
          {(jobs ?? []).map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            return (
              <Link className="job-row" href={`/cleaner/invoices/${job.id}`} key={job.id}>
                <span><strong>{property?.name ?? "Property"}</strong><small>{property?.address ?? "No address"}</small></span>
                <span>{formatDate(job.job_date)}</span>
                <span>£{(job.payment_pence / 100).toFixed(0)}<small>{job.cleaner_invoice_number ?? `Draft ${job.id.slice(0, 8)}`}</small></span>
                <span className={`status-pill ${job.cleaner_paid_at ? "status-completed" : "status-pending"}`}>{job.cleaner_paid_at ? "Paid" : "Unpaid"}</span>
              </Link>
            );
          })}
          {!jobs?.length ? <p className="empty-state">No completed paid jobs yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
