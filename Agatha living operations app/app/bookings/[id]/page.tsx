import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarPlus, ChevronLeft, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCleaningJobFromBooking, updateBookingReview } from "./actions";

type BookingPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    conflict?: string;
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

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { id } = await params;
  const { conflict } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: booking }, { data: cleaners }, { data: jobs }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, property_id, guest_name, source, check_in_date, check_out_date, guest_lockbox_code, notes, reviewed, properties(name, address, default_cleaner_id, default_duration_minutes, default_payment_pence, current_lockbox_code)")
      .eq("id", id)
      .single(),
    supabase.from("cleaners").select("id, name, phone, is_primary").eq("active", true).order("is_primary", {
      ascending: false
    }),
    supabase.from("cleaning_jobs").select("id, status").eq("booking_id", id).neq("status", "cancelled").limit(1)
  ]);

  if (!booking) {
    notFound();
  }

  const property = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
  const existingJob = jobs?.[0];
  const createJobAction = createCleaningJobFromBooking.bind(null, id);
  const reviewAction = updateBookingReview.bind(null, id);
  const defaultCleanerId = property?.default_cleaner_id ?? "";
  const defaultDuration = property?.default_duration_minutes ?? 180;
  const defaultPayment = property?.default_payment_pence ?? 6000;
  const [{ data: propertyDateJobs }, { data: defaultCleanerDateJobs }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id, status, cleaners(name)")
      .eq("property_id", booking.property_id)
      .eq("job_date", booking.check_out_date)
      .neq("status", "cancelled")
      .limit(1),
    defaultCleanerId
      ? supabase
          .from("cleaning_jobs")
          .select("id, status, properties(name)")
          .eq("cleaner_id", defaultCleanerId)
          .eq("job_date", booking.check_out_date)
          .neq("status", "cancelled")
          .limit(1)
      : Promise.resolve({ data: [] })
  ]);
  const propertyDateConflict = propertyDateJobs?.find((job) => job.id !== existingJob?.id);
  const defaultCleanerConflict = defaultCleanerDateJobs?.find((job) => job.id !== existingJob?.id);

  return (
    <main className="app-shell">
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard">
            <ChevronLeft aria-hidden="true" />
            Dashboard
          </Link>
          <p className="eyebrow">Booking</p>
          <h1>{booking.guest_name || "Guest stay"}</h1>
          <p className="intro">{property?.name ?? "Unknown property"}</p>
        </div>
      </section>

      <section className="job-layout">
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{booking.source}</p>
              <h2>Stay details</h2>
            </div>
            <CalendarPlus aria-hidden="true" />
          </div>
          <div className="job-summary">
            <div>
              <span>Property</span>
              <strong>{property?.address ?? "No address"}</strong>
            </div>
            <div>
              <span>Check-in</span>
              <strong>{formatDate(booking.check_in_date)}</strong>
            </div>
            <div>
              <span>Checkout</span>
              <strong>{formatDate(booking.check_out_date)}</strong>
            </div>
            <div>
              <span>Guest code</span>
              <strong>{booking.guest_lockbox_code || "Not set"}</strong>
            </div>
          </div>
          <div className="notes-panel">
            <span>Notes</span>
            <p>{booking.notes || "No notes"}</p>
          </div>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Review</p>
              <h2>Booking details</h2>
            </div>
            <Save aria-hidden="true" />
          </div>
          <form action={reviewAction} className="data-form">
            <div className="form-grid two">
              <label>
                Guest name
                <input defaultValue={booking.guest_name ?? ""} name="guest_name" placeholder="Guest name" type="text" />
              </label>
              <label>
                Source
                <select defaultValue={booking.source} name="source">
                  <option>iCal</option>
                  <option>Airbnb</option>
                  <option>Booking.com</option>
                  <option>Direct</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            <label>
              Guest lockbox code
              <input defaultValue={booking.guest_lockbox_code ?? ""} maxLength={10} name="guest_lockbox_code" placeholder="9134" type="text" />
            </label>
            <label>
              Notes
              <textarea defaultValue={booking.notes ?? ""} name="notes" rows={4} />
            </label>
            <label className="checkbox-label large">
              <input defaultChecked={booking.reviewed} name="reviewed" type="checkbox" />
              Mark booking reviewed
            </label>
            <button className="button primary" type="submit">
              <Save aria-hidden="true" />
              Save review
            </button>
          </form>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Cleaning job</p>
              <h2>Create from checkout</h2>
            </div>
          </div>

          {conflict ? <p className="sync-message sync-error">{conflict}</p> : null}
          {propertyDateConflict ? (
            <p className="sync-message sync-missing">
              This property already has a cleaning job on {formatDate(booking.check_out_date)}.
            </p>
          ) : null}
          {defaultCleanerConflict ? (
            <p className="sync-message sync-missing">
              The default cleaner already has another job on {formatDate(booking.check_out_date)}.
            </p>
          ) : null}

          {existingJob ? (
            <div className="notice-panel compact">
              <div>
                <h2>Cleaning job already created</h2>
                <p>Status: {existingJob.status}</p>
                <Link className="button primary" href={`/jobs/${existingJob.id}`}>
                  Open job
                </Link>
              </div>
            </div>
          ) : (
            <form action={createJobAction} className="data-form">
              <label>
                Cleaner
                <select defaultValue={defaultCleanerId} name="cleaner_id" required>
                  <option value="">Choose cleaner</option>
                  {(cleaners ?? []).map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.name} - {cleaner.phone}
                      {cleaner.is_primary ? " - Primary" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid two">
                <label>
                  Duration
                  <select defaultValue={String(defaultDuration)} name="duration_minutes" required>
                    <option value="120">2 hours</option>
                    <option value="150">2.5 hours</option>
                    <option value="180">3 hours</option>
                    <option value="210">3.5 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </label>
                <label>
                  Payment
                  <input defaultValue={(defaultPayment / 100).toFixed(0)} min="0" name="payment_pounds" required step="1" type="number" />
                </label>
              </div>
              <div className="form-grid two">
                <label>
                  Current code
                  <input defaultValue={property?.current_lockbox_code ?? ""} maxLength={10} name="current_lockbox_code" placeholder="Current code" required type="text" />
                </label>
                <label>
                  New guest code
                  <input defaultValue={booking.guest_lockbox_code ?? ""} maxLength={10} name="new_lockbox_code" required type="text" />
                </label>
              </div>
              <button className="button primary" type="submit">
                <CalendarPlus aria-hidden="true" />
                Create cleaning job
              </button>
            </form>
          )}
        </article>
      </section>
    </main>
  );
}
