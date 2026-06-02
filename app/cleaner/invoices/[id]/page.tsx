import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CleanerNav } from "../../cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";

type CleanerInvoicePageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default async function CleanerInvoicePage({ params }: CleanerInvoicePageProps) {
  const { id } = await params;
  const { supabase, cleaner } = await requireCleaner();
  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, payment_pence, cleaner_paid_at, cleaner_invoice_number, completed_at, properties(name, address)")
    .eq("id", id)
    .eq("cleaner_id", cleaner.id)
    .eq("status", "completed")
    .maybeSingle();

  if (!job) notFound();

  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="payments" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/cleaner/payments"><ChevronLeft aria-hidden="true" />Payments</Link>
          <p className="eyebrow">Invoice</p>
          <h1>{job.cleaner_invoice_number ?? `Draft ${job.id.slice(0, 8)}`}</h1>
          <p className="intro">{property?.name ?? "Property"} · {formatDate(job.job_date)}</p>
        </div>
      </section>
      <section className="job-layout single">
        <article className="management-panel printable-invoice">
          <div className="job-summary">
            <div><span>Cleaner</span><strong>{cleaner.name}</strong></div>
            <div><span>Property</span><strong>{property?.address ?? "No address"}</strong></div>
            <div><span>Clean date</span><strong>{formatDate(job.job_date)}</strong></div>
            <div><span>Amount</span><strong>£{(job.payment_pence / 100).toFixed(2)}</strong></div>
            <div><span>Status</span><strong>{job.cleaner_paid_at ? "Paid" : "Unpaid"}</strong></div>
          </div>
          <p className="helper-text">Use browser print to save this invoice as a PDF.</p>
        </article>
      </section>
    </main>
  );
}
