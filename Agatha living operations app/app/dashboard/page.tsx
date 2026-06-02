import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarCheck2, CalendarPlus, ClipboardList, Plus, UsersRound } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { createCleaner, createProperty, markBookingReviewed, quickCreateCleaningJobFromBooking } from "./actions";

type DashboardJob = {
  id: string;
  job_date: string;
  status: string;
  payment_pence: number;
  properties: { name: string; address: string } | { name: string; address: string }[] | null;
  cleaners: { name: string } | { name: string }[] | null;
};

function formatJobDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    offered: "Awaiting cleaner",
    accepted: "Pending clean",
    pending: "Pending clean",
    ready_for_review: "Ready for review",
    completed: "Completed",
    declined: "Declined",
    cancelled: "Cancelled"
  };

  return labels[status] || status;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekAheadDate = new Date();
  weekAheadDate.setDate(weekAheadDate.getDate() + 7);
  const weekAhead = weekAheadDate.toISOString().slice(0, 10);

  const [
    { count: propertyCount },
    { count: cleanerCount },
    { count: jobCount },
    { data: properties },
    { data: cleaners },
    { data: recentBookings },
    { data: reviewBookings },
    { data: bookingLinkedJobs },
    { data: needsActionJobs },
    { data: upcomingJobs },
    { data: completedJobs },
    { data: followUpJobs },
    { count: unpaidCompletedCount },
    { data: setupProperties }
  ] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("cleaners").select("*", { count: "exact", head: true }),
    supabase.from("cleaning_jobs").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("id, name, address").order("created_at", { ascending: false }).limit(5),
    supabase.from("cleaners").select("id, name, phone, is_primary").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("bookings")
      .select("id, guest_name, source, check_in_date, check_out_date, guest_lockbox_code, properties(name, address, default_cleaner_id, current_lockbox_code)")
      .order("check_out_date", { ascending: true })
      .limit(12),
    supabase
      .from("bookings")
      .select("id, guest_name, source, check_in_date, check_out_date, guest_lockbox_code, reviewed, properties(name, address)")
      .or("reviewed.eq.false,guest_lockbox_code.is.null")
      .order("check_out_date", { ascending: true })
      .limit(8),
    supabase.from("cleaning_jobs").select("booking_id").not("booking_id", "is", null),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, payment_pence, properties(name, address), cleaners(name)")
      .in("status", ["offered", "accepted", "pending", "ready_for_review", "declined"])
      .order("job_date", { ascending: true })
      .limit(8),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, payment_pence, properties(name, address), cleaners(name)")
      .in("status", ["draft", "offered", "accepted", "pending", "ready_for_review"])
      .gte("job_date", today)
      .order("job_date", { ascending: true })
      .limit(20),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, payment_pence, properties(name, address), cleaners(name)")
      .eq("status", "completed")
      .order("job_date", { ascending: false })
      .limit(8),
    supabase
      .from("cleaning_jobs")
      .select("id, completion_issue_tags")
      .in("status", ["ready_for_review", "completed"])
      .not("completion_issue_tags", "is", null)
      .limit(100),
    supabase
      .from("cleaning_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .is("cleaner_paid_at", null),
    supabase
      .from("properties")
      .select("id, bedrooms, bathrooms, default_cleaner_id, default_duration_minutes, default_payment_pence, current_lockbox_code, cleaning_notes")
      .limit(100)
  ]);

  const bookingIdsWithJobs = new Set((bookingLinkedJobs ?? []).map((job) => job.booking_id));
  const bookingsNeedingJobs = (recentBookings ?? []).filter((booking) => !bookingIdsWithJobs.has(booking.id)).slice(0, 8);
  const todayJobs = (upcomingJobs ?? []).filter((job) => job.job_date === today);
  const weekJobs = (upcomingJobs ?? []).filter((job) => job.job_date >= today && job.job_date <= weekAhead);
  const followUpCount = (followUpJobs ?? []).filter((job) => Array.isArray(job.completion_issue_tags) && job.completion_issue_tags.length > 0).length;
  const setupGapCount = (setupProperties ?? []).filter(
    (property) =>
      property.bedrooms == null ||
      property.bathrooms == null ||
      !property.default_cleaner_id ||
      !property.default_duration_minutes ||
      !property.default_payment_pence ||
      !property.current_lockbox_code ||
      !property.cleaning_notes
  ).length;

  const renderJobRow = (job: DashboardJob, label?: string) => {
    const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
    const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;

    return (
      <Link className="job-row" href={`/jobs/${job.id}`} key={job.id}>
        <span>
          <strong>{property?.name ?? "Unknown property"}</strong>
          <small>{property?.address ?? "No address"}</small>
        </span>
        <span>{formatJobDate(job.job_date)}</span>
        <span>{cleaner?.name ?? "No cleaner"}</span>
        <span>{label ?? `£${(job.payment_pence / 100).toFixed(0)}`}</span>
        <span className={`status-pill status-${job.status}`}>{formatStatus(job.status)}</span>
      </Link>
    );
  };

  return (
    <main className="app-shell">
      <AdminNav active="dashboard" />
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Operations workspace</h1>
          <p className="intro">Your login is connected. The next step is building the cleaner job workflow.</p>
        </div>
        <Link className="button secondary" href="/">
          Home
        </Link>
        <Link className="button secondary" href="/calendar">
          Calendar
        </Link>
        <Link className="button secondary" href="/bookings/new">
          Add booking
        </Link>
        <Link className="button primary" href="/jobs/new">
          New cleaning job
        </Link>
      </section>

      <section className="metric-grid" aria-label="Operations totals">
        <article className="metric-card">
          <Building2 aria-hidden="true" />
          <span>Properties</span>
          <strong>{propertyCount ?? 0}</strong>
        </article>
        <article className="metric-card">
          <UsersRound aria-hidden="true" />
          <span>Cleaners</span>
          <strong>{cleanerCount ?? 0}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Cleaning jobs</span>
          <strong>{jobCount ?? 0}</strong>
        </article>
      </section>

      <section className="operations-shortcut-grid" aria-label="Priority shortcuts">
        <Link className="metric-card action-card" href="/today">
          <CalendarCheck2 aria-hidden="true" />
          <span>Today</span>
          <strong>{todayJobs.length}</strong>
          <small>Jobs due now</small>
        </Link>
        <Link className="metric-card action-card" href="/follow-ups">
          <ClipboardList aria-hidden="true" />
          <span>Follow-ups</span>
          <strong>{followUpCount}</strong>
          <small>Issues from cleans</small>
        </Link>
        <Link className="metric-card action-card" href="/payments">
          <UsersRound aria-hidden="true" />
          <span>Payments</span>
          <strong>{unpaidCompletedCount ?? 0}</strong>
          <small>Completed jobs unpaid</small>
        </Link>
        <Link className="metric-card action-card" href="/properties">
          <Building2 aria-hidden="true" />
          <span>Setup gaps</span>
          <strong>{setupGapCount}</strong>
          <small>Properties to finish</small>
        </Link>
      </section>

      <section className="quick-action-strip admin-launch-strip" aria-label="Launch shortcuts">
        <Link href="/mobile-test">iPhone test</Link>
        <Link href="/portal">Portal links</Link>
        <Link href="/deploy">Deploy prep</Link>
        <Link href="/settings">App settings</Link>
      </section>

      <section className="queue-grid">
        <article className="wide-panel priority-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Jobs due today</h2>
            </div>
          </div>
          <div className="compact-job-list">
            {todayJobs.map((job) => renderJobRow(job))}
            {!todayJobs.length ? <p className="empty-state">No cleaning jobs due today.</p> : null}
          </div>
        </article>

        <article className="wide-panel priority-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">This week</p>
              <h2>Next 7 days</h2>
            </div>
          </div>
          <div className="compact-job-list">
            {weekJobs.slice(0, 8).map((job) => renderJobRow(job))}
            {!weekJobs.length ? <p className="empty-state">No jobs scheduled this week.</p> : null}
          </div>
        </article>
      </section>

      <section className="management-grid">
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Properties</p>
              <h2>Add a property</h2>
            </div>
            <Building2 aria-hidden="true" />
          </div>
          <form action={createProperty} className="data-form">
            <label>
              Property name
              <input name="name" placeholder="62 Greystead Road" required type="text" />
            </label>
            <label>
              Address
              <input name="address" placeholder="62 Greystead Road, Forest Hill, SE23 3SD" required type="text" />
            </label>
            <label>
              Notes
              <textarea name="notes" placeholder="Access notes, parking, preferred clean details" rows={3} />
            </label>
            <button className="button primary" type="submit">
              <Plus aria-hidden="true" />
              Add property
            </button>
          </form>
          <div className="data-list">
            {(properties ?? []).map((property) => (
              <Link className="data-row" href={`/properties/${property.id}`} key={property.id}>
                <strong>{property.name}</strong>
                <span>{property.address}</span>
              </Link>
            ))}
            {!properties?.length ? <p className="empty-state">No properties yet.</p> : null}
          </div>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Cleaners</p>
              <h2>Add a cleaner</h2>
            </div>
            <UsersRound aria-hidden="true" />
          </div>
          <form action={createCleaner} className="data-form">
            <label>
              Cleaner name
              <input name="name" placeholder="Primary cleaner" required type="text" />
            </label>
            <label>
              WhatsApp phone
              <input name="phone" placeholder="447307215813" required type="tel" />
            </label>
            <label>
              Email
              <input name="email" placeholder="cleaner@example.com" type="email" />
            </label>
            <label className="checkbox-label">
              <input name="is_primary" type="checkbox" />
              Primary cleaner
            </label>
            <button className="button primary" type="submit">
              <Plus aria-hidden="true" />
              Add cleaner
            </button>
          </form>
          <div className="data-list">
            {(cleaners ?? []).map((cleaner) => (
              <Link className="data-row" href={`/cleaners/${cleaner.id}`} key={cleaner.id}>
                <strong>{cleaner.name}</strong>
                <span>
                  {cleaner.phone}
                  {cleaner.is_primary ? " · Primary" : ""}
                </span>
              </Link>
            ))}
            {!cleaners?.length ? <p className="empty-state">No cleaners yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="wide-panel priority-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cleaning jobs</p>
            <h2>Needs action</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <div className="jobs-table" aria-label="Jobs needing action">
          {(needsActionJobs ?? []).map((job) => {
            const label =
              job.status === "offered"
                ? "Await reply"
                : job.status === "accepted" || job.status === "pending"
                  ? "Pending clean"
                  : job.status === "ready_for_review"
                    ? "Verify"
                : job.status === "declined"
                  ? "Reassign"
                  : undefined;

            return renderJobRow(job, label);
          })}
          {!needsActionJobs?.length ? <p className="empty-state">Nothing needs action.</p> : null}
        </div>
      </section>

      <section className="wide-panel priority-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bookings</p>
            <h2>Need review</h2>
          </div>
          <CalendarPlus aria-hidden="true" />
        </div>
        <div className="jobs-table" aria-label="Bookings needing review">
          {(reviewBookings ?? []).map((booking) => {
            const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
            const label = booking.guest_lockbox_code ? "Review" : "Add code";

            return (
              <div className="job-row booking-row action-row" key={booking.id}>
                <Link href={`/bookings/${booking.id}`}>
                  <strong>{booking.guest_name || "Guest stay"}</strong>
                  <small>{property?.address ?? "No address"}</small>
                </Link>
                <span>{formatJobDate(booking.check_out_date)}</span>
                <span>{booking.source}</span>
                <span>{label}</span>
                <form action={markBookingReviewed}>
                  <input name="booking_id" type="hidden" value={booking.id} />
                  <button className="mini-button" disabled={!booking.guest_lockbox_code} type="submit">
                    Mark reviewed
                  </button>
                </form>
              </div>
            );
          })}
          {!reviewBookings?.length ? <p className="empty-state">No imported bookings need review.</p> : null}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bookings</p>
            <h2>Need cleaning jobs</h2>
          </div>
          <CalendarPlus aria-hidden="true" />
        </div>
        <div className="jobs-table" aria-label="Bookings needing cleaning jobs">
          {bookingsNeedingJobs.map((booking) => {
            const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
            const canQuickCreate = Boolean(property?.default_cleaner_id && property.current_lockbox_code && booking.guest_lockbox_code);

            return (
              <div className="job-row booking-row action-row" key={booking.id}>
                <Link href={`/bookings/${booking.id}`}>
                  <strong>{booking.guest_name || "Guest stay"}</strong>
                  <small>{property?.address ?? "No address"}</small>
                </Link>
                <span>{formatJobDate(booking.check_out_date)}</span>
                <span>{booking.source}</span>
                <span>{canQuickCreate ? "Ready" : "Needs setup"}</span>
                <form action={quickCreateCleaningJobFromBooking}>
                  <input name="booking_id" type="hidden" value={booking.id} />
                  <button className="mini-button" disabled={!canQuickCreate} type="submit">
                    Create job
                  </button>
                </form>
              </div>
            );
          })}
          {!bookingsNeedingJobs.length ? <p className="empty-state">No imported bookings need cleaning jobs.</p> : null}
        </div>
      </section>

      <section className="queue-grid">
        <article className="wide-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Upcoming</p>
              <h2>Next jobs</h2>
            </div>
          </div>
          <div className="compact-job-list">
            {(upcomingJobs ?? []).map((job) => renderJobRow(job))}
            {!upcomingJobs?.length ? <p className="empty-state">No upcoming jobs.</p> : null}
          </div>
        </article>

        <article className="wide-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Completed</p>
              <h2>Recently done</h2>
            </div>
          </div>
          <div className="compact-job-list">
            {(completedJobs ?? []).map((job) => renderJobRow(job))}
            {!completedJobs?.length ? <p className="empty-state">No completed jobs yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
