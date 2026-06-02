import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { WhatsAppIcon } from "@/app/whatsapp-icon";
import { createClient } from "@/lib/supabase/server";

type JobRow = {
  id: string;
  job_date: string;
  status: string;
  payment_pence: number;
  public_offer_token: string;
  properties: { name: string; address: string; check_out_time: string | null; check_in_time: string | null } | { name: string; address: string; check_out_time: string | null; check_in_time: string | null }[] | null;
  cleaners: { name: string; phone: string } | { name: string; phone: string }[] | null;
};

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    offered: "Chase reply",
    accepted: "Pending clean",
    pending: "Pending clean",
    ready_for_review: "Verify now",
    completed: "Completed",
    declined: "Reassign"
  };
  return labels[status] || status;
}

function warningLabel(job: JobRow, today: string) {
  if (job.status === "offered") return "Not accepted";
  if ((job.status === "accepted" || job.status === "pending") && job.job_date < today) return "Overdue";
  if (job.status === "declined") return "Needs reassigning";
  return "Due today";
}

function formatTime(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const [hours = "", minutes = ""] = value.split(":");
  const hourNumber = Number(hours);
  if (!minutes || Number.isNaN(hourNumber)) return value;
  return `${hourNumber % 12 || 12}:${minutes}${hourNumber >= 12 ? "pm" : "am"}`;
}

function whatsappUrl(job: JobRow, text: string) {
  const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
  const phone = cleaner?.phone?.replace(/\D/g, "");
  return phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}` : "#";
}

export default async function TodayPage() {
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
    .select("id, job_date, status, payment_pence, public_offer_token, properties(name, address, check_out_time, check_in_time), cleaners(name, phone)")
    .in("status", ["offered", "accepted", "pending", "ready_for_review", "declined"])
    .lte("job_date", today)
    .order("job_date", { ascending: true })
    .limit(40);

  const rows = (jobs ?? []) as JobRow[];
  const chaseJobs = rows.filter((job) => job.status === "offered" || job.status === "accepted" || job.status === "pending");
  const reviewJobs = rows.filter((job) => job.status === "ready_for_review");

  return (
    <main className="app-shell">
      <AdminNav active="today" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Daily operations</h1>
          <p className="intro">Chase confirmations, remind cleaners, and verify completed cleans from one place.</p>
        </div>
        <Link className="button primary" href="/jobs/new">
          New cleaning job
        </Link>
      </section>

      <section className="metric-grid" aria-label="Today totals">
        <article className="metric-card">
          <CalendarCheck2 aria-hidden="true" />
          <span>Needs chasing</span>
          <strong>{chaseJobs.length}</strong>
        </article>
        <article className="metric-card">
          <CalendarCheck2 aria-hidden="true" />
          <span>Ready to verify</span>
          <strong>{reviewJobs.length}</strong>
        </article>
        <article className="metric-card">
          <CalendarCheck2 aria-hidden="true" />
          <span>Total open</span>
          <strong>{rows.length}</strong>
        </article>
      </section>

      <section className="wide-panel priority-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cleaner chase</p>
            <h2>Due today or overdue</h2>
          </div>
          <WhatsAppIcon className="whatsapp-icon" />
        </div>
        <div className="jobs-table">
          {chaseJobs.map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
            const checkOut = formatTime(property?.check_out_time, "11:00am");
            const checkIn = formatTime(property?.check_in_time, "3:00pm");
            const reminder = `Hi ${cleaner?.name ?? ""}, reminder for your Agatha Living clean today:\n\n${property?.address ?? "Property"}\nCheckout ${checkOut}, ready by ${checkIn}.\n\nPlease confirm everything is on track.`;

            return (
              <div className="job-row action-row" key={job.id}>
                <Link href={`/jobs/${job.id}`}>
                  <strong>{property?.name ?? "Unknown property"}</strong>
                  <small>{property?.address ?? "No address"}</small>
                </Link>
                <span>{cleaner?.name ?? "No cleaner"}</span>
                <span className="warning-chip">{warningLabel(job, today)}</span>
                <span className={`status-pill status-${job.status}`}>{formatStatus(job.status)}</span>
                <a className="mini-button" href={whatsappUrl(job, reminder)}>
                  <WhatsAppIcon className="whatsapp-icon" />
                  WhatsApp
                </a>
              </div>
            );
          })}
          {!chaseJobs.length ? <p className="empty-state">No cleaners need chasing.</p> : null}
        </div>
      </section>

      <section className="wide-panel priority-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Admin review</p>
            <h2>Cleans waiting for verification</h2>
          </div>
        </div>
        <div className="jobs-table">
          {reviewJobs.map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
            return (
              <Link className="job-row" href={`/jobs/${job.id}/complete`} key={job.id}>
                <span>
                  <strong>{property?.name ?? "Unknown property"}</strong>
                  <small>{property?.address ?? "No address"}</small>
                </span>
                <span>{cleaner?.name ?? "No cleaner"}</span>
                <span className="status-pill status-ready_for_review">Verify</span>
              </Link>
            );
          })}
          {!reviewJobs.length ? <p className="empty-state">No completed cleans are waiting for review.</p> : null}
        </div>
      </section>
    </main>
  );
}
