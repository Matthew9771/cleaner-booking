import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck2, ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { WhatsAppIcon } from "@/app/whatsapp-icon";
import { createClient } from "@/lib/supabase/server";

type ReminderJob = {
  id: string;
  job_date: string;
  status: string;
  public_offer_token: string;
  properties: { name: string; address: string; check_out_time: string | null; check_in_time: string | null } | { name: string; address: string; check_out_time: string | null; check_in_time: string | null }[] | null;
  cleaners: { name: string; phone: string } | { name: string; phone: string }[] | null;
};

type UnpaidJob = {
  id: string;
  job_date: string;
  payment_pence: number;
  properties: { name: string; address: string } | { name: string; address: string }[] | null;
  cleaners: { name: string } | { name: string }[] | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const [hours = "", minutes = ""] = value.split(":");
  const hourNumber = Number(hours);
  if (!minutes || Number.isNaN(hourNumber)) return value;
  return `${hourNumber % 12 || 12}:${minutes}${hourNumber >= 12 ? "pm" : "am"}`;
}

function statusLabel(status: string, overdue: boolean) {
  if (status === "offered") return "Awaiting reply";
  if (status === "ready_for_review") return "Admin review";
  if (overdue) return "Overdue clean";
  return "Pending clean";
}

function warningLabel(job: ReminderJob, today: string, tomorrow: string) {
  if (job.status === "offered") return "Cleaner has not accepted yet";
  if ((job.status === "accepted" || job.status === "pending") && job.job_date < today) return "Clean is overdue";
  if ((job.status === "accepted" || job.status === "pending") && job.job_date === today) return "Clean due today";
  if ((job.status === "accepted" || job.status === "pending") && job.job_date === tomorrow) return "Clean due tomorrow";
  if (job.status === "ready_for_review") return "Admin needs to verify";
  return "Needs attention";
}

function reminderText(job: ReminderJob, baseUrl: string) {
  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
  const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
  const checkOut = formatTime(property?.check_out_time, "11:00am");
  const checkIn = formatTime(property?.check_in_time, "3:00pm");

  if (job.status === "offered") {
    return `Hi ${cleaner?.name ?? ""}, can you confirm this Agatha Living clean please?\n\n${property?.address ?? "Property"}\n${formatDate(job.job_date)}\nCheckout ${checkOut}, ready by ${checkIn}\n\nOffer link: ${baseUrl}/jobs/offer/${job.public_offer_token}`;
  }

  if (job.status === "ready_for_review") {
    return `Hi ${cleaner?.name ?? ""}, thanks. We have your clean marked for admin review for ${property?.address ?? "the property"}.`;
  }

  return `Hi ${cleaner?.name ?? ""}, reminder for your Agatha Living clean:\n\n${property?.address ?? "Property"}\n${formatDate(job.job_date)}\nCheckout ${checkOut}, ready by ${checkIn}\n\nPlease use the completion link after the clean: ${baseUrl}/jobs/complete/${job.public_offer_token}`;
}

export default async function RemindersPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const [{ data: jobs }, { data: unpaidJobs }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, public_offer_token, properties(name, address, check_out_time, check_in_time), cleaners(name, phone)")
      .in("status", ["offered", "accepted", "pending", "ready_for_review"])
      .lte("job_date", tomorrow)
      .order("job_date", { ascending: true })
      .limit(80),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, payment_pence, properties(name, address), cleaners(name)")
      .eq("status", "completed")
      .is("cleaner_paid_at", null)
      .order("job_date", { ascending: false })
      .limit(40)
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3006";
  const rows = (jobs ?? []) as ReminderJob[];
  const unpaidRows = (unpaidJobs ?? []) as UnpaidJob[];
  const awaitingReply = rows.filter((job) => job.status === "offered").length;
  const dueTomorrow = rows.filter((job) => job.job_date === tomorrow && (job.status === "accepted" || job.status === "pending")).length;
  const readyForReview = rows.filter((job) => job.status === "ready_for_review").length;

  return (
    <main className="app-shell">
      <AdminNav active="reminders" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Reminders</p>
          <h1>Cleaner chase queue</h1>
          <p className="intro">WhatsApp nudges for outstanding replies, pending cleans, overdue cleans, and review items.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Reminder totals">
        <article className="metric-card">
          <WhatsAppIcon className="whatsapp-icon" />
          <span>Not accepted</span>
          <strong>{awaitingReply}</strong>
        </article>
        <article className="metric-card">
          <CalendarCheck2 aria-hidden="true" />
          <span>Due tomorrow</span>
          <strong>{dueTomorrow}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Ready for review</span>
          <strong>{readyForReview}</strong>
        </article>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Needs attention</h2>
          </div>
          <CalendarCheck2 aria-hidden="true" />
        </div>
        <div className="jobs-table">
          {rows.map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
            const phone = cleaner?.phone?.replace(/\D/g, "");
            const overdue = job.job_date < today && (job.status === "accepted" || job.status === "pending");
            const message = reminderText(job, baseUrl);

            return (
              <div className="job-row action-row" key={job.id}>
                <Link href={`/jobs/${job.id}`}>
                  <strong>{property?.name ?? "Unknown property"}</strong>
                  <small>{formatDate(job.job_date)} · {property?.address ?? "No address"}</small>
                </Link>
                <span>{cleaner?.name ?? "No cleaner"}</span>
                <span className="warning-chip">{warningLabel(job, today, tomorrow)}</span>
                <span className={`status-pill ${overdue ? "status-declined" : `status-${job.status}`}`}>{statusLabel(job.status, overdue)}</span>
                <a className="mini-button" href={phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}` : "#"}>
                  <WhatsAppIcon className="whatsapp-icon" />
                  WhatsApp
                </a>
              </div>
            );
          })}
          {!rows.length ? <p className="empty-state">No reminders needed right now.</p> : null}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Payments</p>
            <h2>Completed jobs not paid</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <div className="jobs-table">
          {unpaidRows.map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;

            return (
              <Link className="job-row" href={`/jobs/${job.id}`} key={job.id}>
                <span>
                  <strong>{property?.name ?? "Unknown property"}</strong>
                  <small>{formatDate(job.job_date)} · {property?.address ?? "No address"}</small>
                </span>
                <span>{cleaner?.name ?? "No cleaner"}</span>
                <span>£{(job.payment_pence / 100).toFixed(0)}</span>
                <span className="warning-chip">Cleaner unpaid</span>
              </Link>
            );
          })}
          {!unpaidRows.length ? <p className="empty-state">No unpaid completed jobs.</p> : null}
        </div>
      </section>
    </main>
  );
}
