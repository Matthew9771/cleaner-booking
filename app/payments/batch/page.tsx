import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function PaymentBatchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, payment_pence, cleaners(id, name), properties(name)")
    .eq("status", "completed")
    .is("cleaner_paid_at", null)
    .order("job_date", { ascending: true });
  const byCleaner = new Map<string, { name: string; total: number; jobs: typeof jobs }>();
  for (const job of jobs ?? []) {
    const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
    const key = cleaner?.id ?? "unassigned";
    const current = byCleaner.get(key) ?? { name: cleaner?.name ?? "No cleaner", total: 0, jobs: [] as typeof jobs };
    current.total += job.payment_pence;
    current.jobs = [...(current.jobs ?? []), job];
    byCleaner.set(key, current);
  }

  return (
    <main className="app-shell">
      <AdminNav active="payments" />
      <section className="dashboard-header compact">
        <div><Link className="back-link" href="/payments"><ChevronLeft aria-hidden="true" />Payments</Link><p className="eyebrow">Payment batch</p><h1>Unpaid cleaner batch</h1></div>
      </section>
      <section className="wide-panel">
        <div className="section-heading"><div><p className="eyebrow">Batch totals</p><h2>{jobs?.length ?? 0} unpaid jobs</h2></div><ClipboardList aria-hidden="true" /></div>
        <div className="data-list no-border">
          {Array.from(byCleaner.entries()).map(([id, row]) => (
            <Link className="data-row" href={id === "unassigned" ? "/payments" : `/cleaners/${id}`} key={id}>
              <strong>{row.name}</strong>
              <span>{row.jobs?.length ?? 0} jobs</span>
              <span>£{(row.total / 100).toFixed(0)}</span>
            </Link>
          ))}
          {!jobs?.length ? <p className="empty-state">No unpaid jobs in this batch.</p> : null}
        </div>
      </section>
    </main>
  );
}
