import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck2, ChevronLeft, ClipboardList } from "lucide-react";
import { CleanerNav } from "../../cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";

type CleanerJobPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const [hours = "", minutes = ""] = value.split(":");
  const hour = Number(hours);
  if (!minutes || Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minutes}${hour >= 12 ? "pm" : "am"}`;
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    draft: "Available",
    pending: "Pending clean",
    ready_for_review: "Sent for review",
    completed: "Completed"
  };
  return labels[status] || status;
}

export default async function CleanerJobPage({ params }: CleanerJobPageProps) {
  const { id } = await params;
  const { supabase, cleaner } = await requireCleaner();
  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, status, duration_minutes, payment_pence, current_lockbox_code, new_lockbox_code, public_offer_token, cleaner_id, cleaner_started_at, cleaner_completed_at, checklist_completed, properties(name, address, bedrooms, bathrooms, check_out_time, check_in_time, cleaning_notes, cleaning_checklist)")
    .eq("id", id)
    .or(`cleaner_id.eq.${cleaner.id},and(cleaner_id.is.null,status.eq.draft)`)
    .maybeSingle();

  if (!job) {
    notFound();
  }

  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
  const assigned = job.cleaner_id === cleaner.id;
  const checklist = (property?.cleaning_checklist?.length ? property.cleaning_checklist : ["Kitchen", "Living areas", "Bedrooms", "Bathrooms", "Hallway", "Lockbox"]) as string[];
  const completedChecklist = (job.checklist_completed ?? []) as string[];

  if (!property) {
    notFound();
  }

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="jobs" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/cleaner/jobs">
            <ChevronLeft aria-hidden="true" />
            Jobs
          </Link>
          <p className="eyebrow">Cleaner job</p>
          <h1>{property.name}</h1>
          <p className="intro">{property.address}</p>
        </div>
        <span className={`status-pill status-${job.status}`}>{formatStatus(job.status)}</span>
      </section>

      <section className="job-layout">
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Job details</p>
              <h2>{formatDate(job.job_date)}</h2>
            </div>
            <CalendarCheck2 aria-hidden="true" />
          </div>
          <div className="job-summary">
            <div><span>Timing</span><strong>Checkout {formatTime(property.check_out_time, "11:00am")}, ready by {formatTime(property.check_in_time, "3:00pm")}</strong></div>
            <div><span>Duration</span><strong>{Math.round(job.duration_minutes / 60)} hours</strong></div>
            <div><span>Payment</span><strong>£{(job.payment_pence / 100).toFixed(0)}</strong></div>
            <div><span>Lockbox</span><strong>Change {job.current_lockbox_code || "current code"} to {job.new_lockbox_code || "new code"}</strong></div>
            <div><span>Bedrooms / bathrooms</span><strong>{property.bedrooms ?? "?"} bedrooms · {property.bathrooms ?? "?"} bathrooms</strong></div>
            <div><span>Started</span><strong>{job.cleaner_started_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(job.cleaner_started_at)) : "Not started in app"}</strong></div>
          </div>
          {assigned ? (
            <>
              {!job.cleaner_started_at && ["accepted", "pending"].includes(job.status) ? (
                <form action={`/cleaner/jobs/${job.id}/start`} method="post">
                  <button className="button primary full-width" type="submit">
                    <CalendarCheck2 aria-hidden="true" />
                    Start clean
                  </button>
                </form>
              ) : null}
              <Link className="button primary full-width" href={`/jobs/complete/${job.public_offer_token}`}>
                <ClipboardList aria-hidden="true" />
                Finish clean
              </Link>
              {["accepted", "pending"].includes(job.status) ? (
                <form action={`/cleaner/jobs/${job.id}/decline`} method="post">
                  <button className="button secondary full-width" type="submit">
                    Request cover
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <form action={`/cleaner/jobs/${job.id}/claim`} method="post">
              <button className="button primary full-width" type="submit">
                <ClipboardList aria-hidden="true" />
                Pick this job
              </button>
            </form>
          )}
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Property notes</p>
              <h2>Before you go</h2>
            </div>
            <ClipboardList aria-hidden="true" />
          </div>
          <p className="notes-block">{property.cleaning_notes || "No special cleaning notes for this property yet."}</p>
          <div className="tag-list room-checklist">
            {checklist.map((item) => (
              <strong className={completedChecklist.includes(item) ? "complete-tag" : ""} key={item}>{item}</strong>
            ))}
          </div>
          {job.status === "ready_for_review" ? <p className="sync-message">You have submitted this clean. Agatha Living will review it next.</p> : null}
          {job.status === "completed" ? <p className="sync-message">This clean has been verified as complete.</p> : null}
        </article>
      </section>
    </main>
  );
}
