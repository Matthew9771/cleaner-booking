import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, ChevronLeft } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { CleanerConflictWarning } from "../conflict-warning";
import { createCleaningJob } from "./actions";

type NewJobPageProps = {
  searchParams: Promise<{
    conflict?: string;
  }>;
};

export default async function NewJobPage({ searchParams }: NewJobPageProps) {
  const { conflict } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: properties }, { data: cleaners }, { data: cleanerConflicts }] = await Promise.all([
    supabase.from("properties").select("id, name, address").order("name"),
    supabase.from("cleaners").select("id, name, phone, is_primary, preferred_areas, weekly_availability").eq("active", true).order("is_primary", {
      ascending: false
    }),
    supabase
      .from("cleaning_jobs")
      .select("id, cleaner_id, job_date, properties(name)")
      .in("status", ["draft", "offered", "accepted", "pending", "ready_for_review"])
      .order("job_date", { ascending: true })
  ]);

  const hasSetup = Boolean(properties?.length && cleaners?.length);

  return (
    <main className="app-shell">
      <AdminNav active="job" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard">
            <ChevronLeft aria-hidden="true" />
            Dashboard
          </Link>
          <p className="eyebrow">Cleaning Jobs</p>
          <h1>Create cleaning job</h1>
          <p className="intro">Save the job, lockbox change, cleaner assignment, and WhatsApp-ready message.</p>
        </div>
      </section>

      {!hasSetup ? (
        <section className="notice-panel">
          <CalendarPlus aria-hidden="true" />
          <div>
            <h2>Add a property and cleaner first</h2>
            <p>Create at least one property and one cleaner before making a cleaning job.</p>
            <Link className="button primary" href="/dashboard">
              Go to dashboard
            </Link>
          </div>
        </section>
      ) : (
        <section className="job-layout">
          <form action={createCleaningJob} className="management-panel data-form">
            <label>
              Property
              <select name="property_id" required>
                <option value="">Choose property</option>
                {(properties ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cleaner
              <select name="cleaner_id" required>
                <option value="">Choose cleaner</option>
                {(cleaners ?? []).map((cleaner) => (
                  <option key={cleaner.id} value={cleaner.id}>
                    {cleaner.name} - {cleaner.phone}
                    {cleaner.is_primary ? " - Primary" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="room-check-section">
              <p className="eyebrow">Matching signals</p>
              <div className="data-list no-border">
                {(cleaners ?? []).slice(0, 6).map((cleaner) => {
                  const weeklyAvailability = (cleaner.weekly_availability ?? {}) as Record<string, boolean>;
                  const unavailableDays = Object.entries(weeklyAvailability).filter(([, available]) => available === false).map(([day]) => day);
                  return (
                    <div className="data-row" key={cleaner.id}>
                      <strong>{cleaner.name}{cleaner.is_primary ? " · primary" : ""}</strong>
                      <span>{cleaner.preferred_areas || "No preferred areas"}{unavailableDays.length ? ` · unavailable ${unavailableDays.join(", ")}` : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-grid two">
              <label>
                Job date
                <input name="job_date" required type="date" />
              </label>
              <label>
                Duration
                <select name="duration_minutes" required defaultValue="180">
                  <option value="120">2 hours</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                  <option value="210">3.5 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </label>
            </div>
            <CleanerConflictWarning
              conflicts={(cleanerConflicts ?? []).map((job) => {
                const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
                return {
                  cleaner_id: job.cleaner_id,
                  job_date: job.job_date,
                  job_id: job.id,
                  property_name: property?.name ?? "another property"
                };
              })}
            />
            {conflict ? <p className="sync-message sync-error">{conflict}</p> : null}

            <label>
              Payment
              <input defaultValue="60" min="0" name="payment_pounds" required step="1" type="number" />
            </label>

            <div className="form-grid two">
              <label>
                Current guest code
                <input maxLength={10} name="current_lockbox_code" placeholder="4821" required type="text" />
              </label>
              <label>
                New guest code
                <input maxLength={10} name="new_lockbox_code" placeholder="9134" required type="text" />
              </label>
            </div>

            <button className="button primary" type="submit">
              <CalendarPlus aria-hidden="true" />
              Save and prepare WhatsApp
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
