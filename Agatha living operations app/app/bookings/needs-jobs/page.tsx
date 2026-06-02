import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { createJobsFromSelectedBookings } from "./actions";

type BookingsNeedingJobsPageProps = {
  searchParams: Promise<{
    created?: string;
    filter?: string;
    q?: string;
    skipped?: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));
}

export default async function BookingsNeedingJobsPage({ searchParams }: BookingsNeedingJobsPageProps) {
  const { created, filter = "all", q = "", skipped } = await searchParams;
  const query = q.trim().toLowerCase();
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: bookings }, { data: linkedJobs }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, guest_name, source, check_in_date, check_out_date, guest_lockbox_code, reviewed, properties(name, address, default_cleaner_id, current_lockbox_code)")
      .order("check_out_date", { ascending: true })
      .limit(80),
    supabase.from("cleaning_jobs").select("booking_id").not("booking_id", "is", null).neq("status", "cancelled")
  ]);

  const bookingIdsWithJobs = new Set((linkedJobs ?? []).map((job) => job.booking_id));
  const queue = (bookings ?? []).filter((booking) => !bookingIdsWithJobs.has(booking.id));
  const filteredQueue = queue.filter((booking) => {
    const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
    const ready = Boolean(property?.default_cleaner_id && property.current_lockbox_code && booking.guest_lockbox_code);
    const missingCode = !booking.guest_lockbox_code;
    const needsReview = !booking.reviewed;
    const noDefaultCleaner = !property?.default_cleaner_id;
    const searchText = `${booking.guest_name ?? ""} ${booking.source} ${booking.check_in_date} ${booking.check_out_date} ${property?.name ?? ""} ${property?.address ?? ""}`.toLowerCase();

    if (query && !searchText.includes(query)) return false;
    if (filter === "ready") return ready;
    if (filter === "missing-code") return missingCode;
    if (filter === "needs-review") return needsReview;
    if (filter === "no-default-cleaner") return noDefaultCleaner;
    return true;
  });
  const filterItems = [
    { href: "/bookings/needs-jobs", label: "All", key: "all" },
    { href: "/bookings/needs-jobs?filter=ready", label: "Ready", key: "ready" },
    { href: "/bookings/needs-jobs?filter=missing-code", label: "Missing code", key: "missing-code" },
    { href: "/bookings/needs-jobs?filter=needs-review", label: "Needs review", key: "needs-review" },
    { href: "/bookings/needs-jobs?filter=no-default-cleaner", label: "No default cleaner", key: "no-default-cleaner" }
  ];
  const readyShownCount = filteredQueue.filter((booking) => {
    const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
    return Boolean(property?.default_cleaner_id && property.current_lockbox_code && booking.guest_lockbox_code);
  }).length;

  return (
    <main className="app-shell">
      <AdminNav active="queue" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Bookings</p>
          <h1>Needs cleaning jobs</h1>
          <p className="intro">Review stays that do not yet have a linked cleaning job.</p>
        </div>
        <Link className="button primary" href="/bookings/new">
          Add booking
        </Link>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
          <p className="eyebrow">Queue</p>
            <h2>{filteredQueue.length} bookings shown</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <form action="/bookings/needs-jobs" className="queue-tools">
          <input defaultValue={filter} name="filter" type="hidden" />
          <label>
            Search
            <input defaultValue={q} name="q" placeholder="Property, guest, or date" type="search" />
          </label>
          <button className="button secondary" type="submit">
            Search
          </button>
        </form>
        <div className="filter-tabs">
          {filterItems.map((item) => (
            <Link className={`filter-tab${filter === item.key ? " active" : ""}`} href={query ? `${item.href}${item.href.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}` : item.href} key={item.key}>
              {item.label}
            </Link>
          ))}
        </div>
        {created !== undefined ? (
          <p className="sync-message">
            Created {created} cleaning job{created === "1" ? "" : "s"}. {Number(skipped ?? 0) > 0 ? `${skipped} skipped because setup or duplicate checks blocked them.` : ""}
          </p>
        ) : null}
        <form action={createJobsFromSelectedBookings} className="bulk-form">
          <div className="bulk-toolbar">
            <span>{readyShownCount} ready to create in this view</span>
            <button className="button primary" disabled={!readyShownCount} type="submit">
              Create selected jobs
            </button>
          </div>
          <div className="compact-job-list">
          {filteredQueue.map((booking) => {
            const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
            const ready = Boolean(property?.default_cleaner_id && property.current_lockbox_code && booking.guest_lockbox_code);

            return (
              <div className="job-row action-row" key={booking.id}>
                <label className="checkbox-label compact">
                  <input disabled={!ready} name="booking_ids" type="checkbox" value={booking.id} />
                  Select
                </label>
                <Link href={`/bookings/${booking.id}`}>
                  <strong>{property?.name ?? "Unknown property"}</strong>
                  <small>{booking.guest_name || booking.source}</small>
                </Link>
                <span>Checkout {formatDate(booking.check_out_date)}</span>
                <span>{booking.guest_lockbox_code ? "Guest code ready" : "Needs guest code"}</span>
                <span>{booking.reviewed ? "Reviewed" : "Needs review"}</span>
                <span className={`status-pill ${ready ? "status-accepted" : "status-draft"}`}>{ready ? "Ready" : "Missing info"}</span>
                <button className="mini-button" disabled={!ready} name="single_booking_id" type="submit" value={booking.id}>
                  Create job
                </button>
              </div>
            );
          })}
          {!filteredQueue.length ? <p className="empty-state">No bookings match this view.</p> : null}
          </div>
        </form>
      </section>
    </main>
  );
}
