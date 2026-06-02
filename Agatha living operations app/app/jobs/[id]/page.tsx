import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Ban, CheckCircle2, ChevronLeft, Pencil, Send } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { WhatsAppIcon } from "@/app/whatsapp-icon";
import { createClient } from "@/lib/supabase/server";
import { cancelCleaningJob, publishCleaningJob } from "./actions";

type JobPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function formatDuration(minutes: number) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hours` : `${hours.toFixed(1)} hours`;
}

function formatTime(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const [hours = "", minutes = ""] = value.split(":");
  if (!hours || !minutes) {
    return value;
  }

  const hourNumber = Number(hours);
  if (Number.isNaN(hourNumber)) {
    return value;
  }

  const suffix = hourNumber >= 12 ? "pm" : "am";
  const displayHour = hourNumber % 12 || 12;
  return `${displayHour}:${minutes}${suffix}`;
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    offered: "Awaiting cleaner",
    accepted: "Pending clean",
    pending: "Pending clean",
    ready_for_review: "Ready for admin review",
    completed: "Completed",
    declined: "Declined",
    cancelled: "Cancelled"
  };

  return labels[status] || status;
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const requestHeaders = await headers();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select(
      "id, booking_id, job_date, duration_minutes, payment_pence, current_lockbox_code, new_lockbox_code, public_offer_token, status, completed_at, cleaner_paid_at, completion_notes, before_photos_confirmed, after_photos_confirmed, before_photo_paths, after_photo_paths, cleaner_completed_at, properties(name, address, check_out_time, check_in_time, current_lockbox_code, cleaning_notes), cleaners(name, phone), bookings(guest_name, check_in_date, check_out_date, guest_lockbox_code, notes)"
    )
    .eq("id", id)
    .single();

  if (!job) {
    notFound();
  }

  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
  const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
  const booking = Array.isArray(job.bookings) ? job.bookings[0] : job.bookings;

  if (!property) {
    notFound();
  }

  const dateLabel = formatDate(job.job_date);
  const duration = formatDuration(job.duration_minutes);
  const payment = `£${(job.payment_pence / 100).toFixed(0)}`;
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const requestUrl = host ? `${protocol}://${host}` : "http://localhost:3006";
  const appUrl = host?.startsWith("localhost") ? requestUrl : process.env.NEXT_PUBLIC_APP_URL || requestUrl;
  const responseUrl = `${appUrl}/jobs/offer/${job.public_offer_token}`;
  const completionUrl = `${appUrl}/jobs/complete/${job.public_offer_token}`;
  const whatsappPhone = cleaner?.phone.replace(/\D/g, "") ?? "";
  const checkOutTime = formatTime(property.check_out_time, "11:00am");
  const checkInTime = formatTime(property.check_in_time, "3:00pm");
  const message = cleaner ? `Hi ${cleaner.name}, Agatha Living here. We have a cleaning job available, can you take it?

Property: ${property.address}
Date: ${dateLabel}
Guest checks out: ${checkOutTime}
Guest checks in: ${checkInTime}
Duration: ${duration}
Payment: ${payment}

Guest lockbox:
Current code: ${job.current_lockbox_code}
Please change it to: ${job.new_lockbox_code}

Photo evidence required:
Please send photos of every room before and after the clean.

Please tap the link below to confirm or decline the job:
${responseUrl}

Thank you, Agatha Living` : "";
  const reminderMessage = cleaner ? `Hi ${cleaner.name}, your Agatha Living clean is confirmed:

Property: ${property.address}
Date: ${dateLabel}
Timing: checkout ${checkOutTime}, ready by ${checkInTime}
Duration: ${duration}
Payment: ${payment}

Lockbox: change ${job.current_lockbox_code} to ${job.new_lockbox_code}

After the clean, please use the completion link to confirm photos and add any notes. Thank you.` : "";
  const completionMessage = cleaner ? `Hi ${cleaner.name}, thank you for taking this Agatha Living clean.

When the clean is finished, please use this link to confirm photos and add any notes:
${completionUrl}` : "";
  const guestMessage = `Hi${booking?.guest_name ? ` ${booking.guest_name}` : ""}, here are your Agatha Living check-in details:

Property: ${property.address}
Check-in: ${booking?.check_in_date ? formatDate(booking.check_in_date) : "your arrival date"} from ${checkInTime}
Lockbox code: ${booking?.guest_lockbox_code || job.new_lockbox_code}

Please let us know once you are in safely.`;
  const encodedMessage = encodeURIComponent(message);
  const encodedReminderMessage = encodeURIComponent(reminderMessage);
  const encodedCompletionMessage = encodeURIComponent(completionMessage);
  const whatsappDesktopUrl = `whatsapp://send?phone=${whatsappPhone}&text=${encodedMessage}`;
  const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedMessage}`;
  const reminderDesktopUrl = `whatsapp://send?phone=${whatsappPhone}&text=${encodedReminderMessage}`;
  const reminderWebUrl = `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedReminderMessage}`;
  const completionDesktopUrl = `whatsapp://send?phone=${whatsappPhone}&text=${encodedCompletionMessage}`;
  const completionWebUrl = `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedCompletionMessage}`;
  const cancelAction = cancelCleaningJob.bind(null, job.id);
  const publishAction = publishCleaningJob.bind(null, job.id);
  const today = new Date().toISOString().slice(0, 10);
  const beforePhotoCount = ((job.before_photo_paths ?? []) as string[]).length;
  const afterPhotoCount = ((job.after_photo_paths ?? []) as string[]).length;
  const warnings = [
    job.status === "offered" ? "Cleaner has not accepted this job yet." : "",
    (job.status === "accepted" || job.status === "pending") && job.job_date < today ? "This clean is overdue and has not been submitted by the cleaner." : "",
    (job.status === "accepted" || job.status === "pending") && job.job_date === today ? "This clean is due today. Send a reminder if needed." : "",
    job.status === "declined" ? "Cleaner declined this job. Reassign it before the checkout date." : "",
    job.status === "ready_for_review" && (!beforePhotoCount || !afterPhotoCount) ? "Cleaner submitted the clean but photo evidence is incomplete." : "",
    job.status === "ready_for_review" ? "Admin verification is needed before this job becomes complete." : "",
    job.status === "completed" && !job.cleaner_paid_at ? "Cleaner payment is still unpaid." : ""
  ].filter(Boolean);

  return (
    <main className="app-shell">
      <AdminNav active="job" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard">
            <ChevronLeft aria-hidden="true" />
            Dashboard
          </Link>
          <p className="eyebrow">Cleaning Job</p>
          <h1>{property.name}</h1>
          <p className="intro">{dateLabel}</p>
        </div>
      </section>

      {warnings.length ? (
        <section className="warning-panel">
          {warnings.map((warning) => (
            <p className="warning-chip large" key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}

      <section className="job-layout">
        {cleaner ? (
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ready to send</p>
              <h2>WhatsApp cleaner</h2>
            </div>
            <WhatsAppIcon className="whatsapp-icon" />
          </div>

          <div className="job-summary">
            <div>
              <span>Cleaner</span>
              <strong>{cleaner.name}</strong>
            </div>
            <div>
              <span>Property</span>
              <strong>{property.address}</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{duration}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{payment}</strong>
            </div>
            <div>
              <span>Lockbox change</span>
              <strong>
                {job.current_lockbox_code} to {job.new_lockbox_code}
              </strong>
            </div>
          </div>

          <a className="button primary full-width" href={whatsappDesktopUrl}>
            <WhatsAppIcon className="whatsapp-icon" />
            Open WhatsApp Desktop
          </a>
          <a className="button secondary full-width" href={whatsappWebUrl} target="_blank">
            <WhatsAppIcon className="whatsapp-icon" />
            Open WhatsApp Web
          </a>
          <a className="button secondary full-width" href={responseUrl} target="_blank">
            Test cleaner confirmation page
          </a>
          {appUrl.includes("localhost") ? (
            <p className="helper-text">
              This confirmation link is local-only until the app is deployed. WhatsApp may refuse to open it from a
              message, even on this computer.
            </p>
          ) : null}
        </article>
        ) : (
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Available job</p>
              <h2>Open to cleaners</h2>
            </div>
            <WhatsAppIcon className="whatsapp-icon" />
          </div>
          <div className="job-summary">
            <div><span>Status</span><strong className={`status-pill status-${job.status}`}>{formatStatus(job.status)}</strong></div>
            <div><span>Property</span><strong>{property.address}</strong></div>
            <div><span>Payment</span><strong>{payment}</strong></div>
            <div><span>Cleaner</span><strong>Not assigned yet</strong></div>
          </div>
          <p className="helper-text">This job is visible to cleaners in their calendar when the status is Draft and no cleaner is assigned.</p>
        </article>
        )}

        {cleaner ? (
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Reminder</p>
              <h2>Accepted job message</h2>
            </div>
            <Send aria-hidden="true" />
          </div>
          <p className="helper-text">Use this once the cleaner has accepted, usually the day before or morning of the clean.</p>
          <a className="button primary full-width" href={reminderDesktopUrl}>
            <WhatsAppIcon className="whatsapp-icon" />
            Send reminder in WhatsApp
          </a>
          <a className="button secondary full-width" href={reminderWebUrl} target="_blank">
            <WhatsAppIcon className="whatsapp-icon" />
            Reminder in WhatsApp Web
          </a>
        </article>
        ) : null}

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Manage</p>
              <h2>Job controls</h2>
            </div>
            <Pencil aria-hidden="true" />
          </div>
          <div className="job-summary">
            <div>
              <span>Status</span>
              <strong className={`status-pill status-${job.status}`}>{formatStatus(job.status)}</strong>
            </div>
            <div>
              <span>Property current code</span>
              <strong>{property.current_lockbox_code || "Not set"}</strong>
            </div>
            {job.completed_at ? (
              <div>
                <span>Completed</span>
                <strong>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(job.completed_at))}</strong>
              </div>
            ) : null}
          </div>
          <Link className="button secondary full-width" href={`/jobs/${job.id}/edit`}>
            <Pencil aria-hidden="true" />
            Edit job
          </Link>
          <Link className="button secondary full-width" href={`/jobs/${job.id}/reassign`}>
            <Send aria-hidden="true" />
            Reassign cleaner
          </Link>
          <form action={publishAction}>
            <button className="button secondary full-width" type="submit">
              <Send aria-hidden="true" />
              Make available to cleaners
            </button>
          </form>
          {job.status === "ready_for_review" ? (
            <Link className="button primary full-width" href={`/jobs/${job.id}/complete`}>
              <CheckCircle2 aria-hidden="true" />
              Verify clean
            </Link>
          ) : null}
          {job.status !== "ready_for_review" ? (
            <Link className="button secondary full-width" href={`/jobs/${job.id}/complete`}>
              <CheckCircle2 aria-hidden="true" />
              Review completion
            </Link>
          ) : null}
          <form action={cancelAction}>
            <button className="button danger full-width" type="submit">
              <Ban aria-hidden="true" />
              Cancel job
            </button>
          </form>
        </article>

        {cleaner ? (
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Cleaner completion</p>
              <h2>Completion link</h2>
            </div>
            <CheckCircle2 aria-hidden="true" />
          </div>
          <p className="helper-text">This is for the cleaner to submit after the clean. Admin verifies it before the job becomes complete.</p>
          <a className="button primary full-width" href={completionDesktopUrl}>
            <WhatsAppIcon className="whatsapp-icon" />
            Send completion link
          </a>
          <a className="button secondary full-width" href={completionWebUrl} target="_blank">
            <WhatsAppIcon className="whatsapp-icon" />
            Completion link in WhatsApp Web
          </a>
          <a className="button secondary full-width" href={completionUrl} target="_blank">
            Test completion page
          </a>
        </article>
        ) : null}

        {cleaner ? (
        <article className="message-preview span-two">
          <p className="eyebrow">Cleaner offer preview</p>
          <pre>{message}</pre>
        </article>
        ) : null}

        {cleaner ? (
        <article className="message-preview">
          <p className="eyebrow">Cleaner reminder preview</p>
          <pre>{reminderMessage}</pre>
        </article>
        ) : null}

        <article className="message-preview">
          <p className="eyebrow">Guest check-in message</p>
          <pre>{guestMessage}</pre>
        </article>

        {cleaner ? (
        <article className="message-preview">
          <p className="eyebrow">Cleaner completion link</p>
          <pre>{completionMessage}</pre>
        </article>
        ) : null}

        <article className="management-panel span-two">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Internal checklist</p>
              <h2>Clean notes</h2>
            </div>
            <CheckCircle2 aria-hidden="true" />
          </div>
          <div className="job-summary">
            <div>
              <span>Before photos</span>
              <strong>{job.before_photos_confirmed ? "Received" : "Needed"}</strong>
            </div>
            <div>
              <span>After photos</span>
              <strong>{job.after_photos_confirmed ? "Received" : "Needed"}</strong>
            </div>
            <div>
              <span>Lockbox</span>
              <strong>Change {job.current_lockbox_code} to {job.new_lockbox_code}</strong>
            </div>
            <div>
              <span>Property notes</span>
              <strong>{property.cleaning_notes || "No property cleaning notes"}</strong>
            </div>
            <div>
              <span>Completion notes</span>
              <strong>{job.completion_notes || "No completion notes yet"}</strong>
            </div>
            <div>
              <span>Cleaner submitted</span>
              <strong>{job.status === "ready_for_review" || job.status === "completed" ? "Submitted" : "Not submitted yet"}</strong>
            </div>
            <div>
              <span>Cleaner payment</span>
              <strong>{job.cleaner_paid_at ? "Paid" : "Unpaid"}</strong>
            </div>
          </div>
          {job.status === "completed" ? (
            <form action={`/payments/${job.id}/mark`} method="post">
              <input name="paid" type="hidden" value={job.cleaner_paid_at ? "no" : "yes"} />
              <button className="button primary full-width" type="submit">
                <CheckCircle2 aria-hidden="true" />
                {job.cleaner_paid_at ? "Mark cleaner unpaid" : "Mark cleaner paid"}
              </button>
            </form>
          ) : null}
        </article>
      </section>
    </main>
  );
}
