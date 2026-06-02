import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

type PaymentJob = {
  id: string;
  job_date: string;
  payment_pence: number;
  cleaner_paid_at: string | null;
  cleaners: { id: string; name: string } | { id: string; name: string }[] | null;
  properties: { name: string; address: string } | { name: string; address: string }[] | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, payment_pence, cleaner_paid_at, cleaners(id, name), properties(name, address)")
    .eq("status", "completed")
    .order("job_date", { ascending: false })
    .limit(80);

  const paymentJobs = (jobs ?? []) as PaymentJob[];
  const unpaidTotal = paymentJobs.filter((job) => !job.cleaner_paid_at).reduce((sum, job) => sum + job.payment_pence, 0);
  const paidTotal = paymentJobs.filter((job) => job.cleaner_paid_at).reduce((sum, job) => sum + job.payment_pence, 0);
  const unpaidByCleaner = new Map<string, { cleanerId: string; cleanerName: string; total: number; count: number }>();
  paymentJobs
    .filter((job) => !job.cleaner_paid_at)
    .forEach((job) => {
      const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
      const key = cleaner?.id ?? "unassigned";
      const current = unpaidByCleaner.get(key) ?? { cleanerId: key, cleanerName: cleaner?.name ?? "No cleaner", total: 0, count: 0 };
      current.total += job.payment_pence;
      current.count += 1;
      unpaidByCleaner.set(key, current);
    });

  return (
    <main className="app-shell">
      <AdminNav active="payments" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Payments</p>
          <h1>Cleaner payments</h1>
          <p className="intro">Track completed cleaning jobs and mark cleaner payments as paid.</p>
        </div>
        <Link className="button secondary" href="/payments/batch">Payment batch</Link>
      </section>

      <section className="metric-grid" aria-label="Payment totals">
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Unpaid</span>
          <strong>£{(unpaidTotal / 100).toFixed(0)}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Paid</span>
          <strong>£{(paidTotal / 100).toFixed(0)}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Completed jobs</span>
          <strong>{paymentJobs.length}</strong>
        </article>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Payment run</p>
            <h2>Unpaid by cleaner</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <div className="data-list no-border">
          {Array.from(unpaidByCleaner.values()).map((row) => (
            <Link className="data-row" href={row.cleanerId === "unassigned" ? "/payments" : `/cleaners/${row.cleanerId}`} key={row.cleanerId}>
              <strong>{row.cleanerName}</strong>
              <span>{row.count} completed unpaid {row.count === 1 ? "job" : "jobs"}</span>
              <span>£{(row.total / 100).toFixed(0)}</span>
            </Link>
          ))}
          {!unpaidByCleaner.size ? <p className="empty-state">No unpaid cleaner totals.</p> : null}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Completed cleans</p>
            <h2>Payment list</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <div className="compact-job-list">
          {paymentJobs.map((job) => {
            const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;

            return (
              <div className="job-row action-row" key={job.id}>
                <Link href={`/jobs/${job.id}`}>
                  <strong>{property?.name ?? "Unknown property"}</strong>
                  <small>{cleaner?.name ?? "No cleaner"}</small>
                </Link>
                <span>{formatDate(job.job_date)}</span>
                <span>£{(job.payment_pence / 100).toFixed(0)}</span>
                <span className={`status-pill ${job.cleaner_paid_at ? "status-completed" : "status-draft"}`}>
                  {job.cleaner_paid_at ? "Paid" : "Unpaid"}
                </span>
                <form action={`/payments/${job.id}/mark`} method="post">
                  <input name="paid" type="hidden" value={job.cleaner_paid_at ? "no" : "yes"} />
                  <button className="mini-button" type="submit">
                    {job.cleaner_paid_at ? "Mark unpaid" : "Mark paid"}
                  </button>
                </form>
              </div>
            );
          })}
          {!paymentJobs.length ? <p className="empty-state">No completed jobs to pay yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
