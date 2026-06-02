import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, CalendarSync, ChevronLeft, Save } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

type PropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function timeValue(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: property }, { data: jobs }, { data: cleaners }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).single(),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, cleaners(name)")
      .eq("property_id", id)
      .order("job_date", { ascending: false })
      .limit(12),
    supabase.from("cleaners").select("id, name, phone, is_primary").eq("active", true).order("is_primary", {
      ascending: false
    })
  ]);

  if (!property) {
    notFound();
  }
  const readiness = [
    property.bedrooms == null ? "Add bedrooms" : "",
    property.bathrooms == null ? "Add bathrooms" : "",
    property.default_cleaner_id ? "" : "Choose default cleaner",
    property.default_payment_pence ? "" : "Set default payment",
    property.current_lockbox_code ? "" : "Add current lockbox code",
    property.ical_feed_url ? "" : "Connect iCal",
    property.cleaning_notes ? "" : "Add cleaning notes"
  ].filter(Boolean);

  return (
    <main className="app-shell">
      <AdminNav active="properties" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard">
            <ChevronLeft aria-hidden="true" />
            Dashboard
          </Link>
          <p className="eyebrow">Property</p>
          <h1>{property.name}</h1>
          <p className="intro">{property.address}</p>
        </div>
      </section>

      <section className="job-layout">
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Details</p>
              <h2>Property information</h2>
            </div>
            <Building2 aria-hidden="true" />
          </div>
          <div className="job-summary">
            <div>
              <span>Bedrooms</span>
              <strong>{property.bedrooms ?? "Not set"}</strong>
            </div>
            <div>
              <span>Bathrooms</span>
              <strong>{property.bathrooms ?? "Not set"}</strong>
            </div>
            <div>
              <span>Checkout</span>
              <strong>{property.check_out_time}</strong>
            </div>
            <div>
              <span>Check-in</span>
              <strong>{property.check_in_time}</strong>
            </div>
            <div>
              <span>Notes</span>
              <strong>{property.notes || "No notes"}</strong>
            </div>
            <div>
              <span>iCal feed</span>
              <strong>{property.ical_feed_url ? "Connected" : "Not connected"}</strong>
            </div>
            <div>
              <span>Current code</span>
              <strong>{property.current_lockbox_code || "Not set"}</strong>
            </div>
          </div>
          <Link className="button secondary full-width" href={`/properties/${property.id}/ical`}>
            <CalendarSync aria-hidden="true" />
            Manage iCal import
          </Link>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Readiness</p>
              <h2>Setup checklist</h2>
            </div>
          </div>
          <div className="data-list no-border">
            {readiness.map((item) => (
              <div className="data-row" key={item}>
                <strong>{item}</strong>
                <span>Complete this before relying on quick job creation.</span>
              </div>
            ))}
            {!readiness.length ? <p className="empty-state">This property is ready for normal operations.</p> : null}
          </div>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin</p>
              <h2>Edit property</h2>
            </div>
          </div>
          <form action={`/properties/${id}/update`} className="data-form" method="post">
            <label>
              Property name
              <input defaultValue={property.name} name="name" required type="text" />
            </label>
            <label>
              Address
              <input defaultValue={property.address} name="address" required type="text" />
            </label>
            <div className="form-grid two">
              <label>
                Bedrooms
                <input defaultValue={property.bedrooms ?? ""} min="0" name="bedrooms" step="1" type="number" />
              </label>
              <label>
                Bathrooms
                <input defaultValue={property.bathrooms ?? ""} min="0" name="bathrooms" step="0.5" type="number" />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Checkout
                <input defaultValue={timeValue(property.check_out_time)} name="check_out_time" type="time" />
              </label>
              <label>
                Check-in
                <input defaultValue={timeValue(property.check_in_time)} name="check_in_time" type="time" />
              </label>
            </div>
            <label>
              Property notes
              <textarea defaultValue={property.notes ?? ""} name="notes" rows={4} />
            </label>
            <button className="button primary" type="submit">
              <Save aria-hidden="true" />
              Save property
            </button>
          </form>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Defaults</p>
              <h2>Cleaning settings</h2>
            </div>
          </div>
          <form action={`/properties/${id}/defaults`} className="data-form" method="post">
            <div className="form-grid two">
              <label>
                Default cleaner
                <select defaultValue={property.default_cleaner_id ?? ""} name="default_cleaner_id">
                  <option value="">Choose cleaner</option>
                  {(cleaners ?? []).map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.name} - {cleaner.phone}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Backup cleaner
                <select defaultValue={property.backup_cleaner_id ?? ""} name="backup_cleaner_id">
                  <option value="">Choose cleaner</option>
                  {(cleaners ?? []).map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.name} - {cleaner.phone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Default duration
                <select defaultValue={String(property.default_duration_minutes ?? 180)} name="default_duration_minutes">
                  <option value="120">2 hours</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                  <option value="210">3.5 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </label>
              <label>
                Default payment
                <input defaultValue={((property.default_payment_pence ?? 6000) / 100).toFixed(0)} min="0" name="default_payment_pounds" step="1" type="number" />
              </label>
            </div>
            <label>
              Current lockbox code
              <input defaultValue={property.current_lockbox_code ?? ""} maxLength={10} name="current_lockbox_code" type="text" />
            </label>
            <label>
              Cleaning notes
              <textarea defaultValue={property.cleaning_notes ?? ""} name="cleaning_notes" rows={4} />
            </label>
            <label>
              Cleaning checklist
              <textarea defaultValue={(property.cleaning_checklist ?? ["Kitchen", "Living areas", "Bedrooms", "Bathrooms", "Hallway", "Lockbox"]).join("\n")} name="cleaning_checklist" rows={7} />
            </label>
            <button className="button primary" type="submit">
              Save cleaning defaults
            </button>
          </form>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Jobs</p>
              <h2>Recent jobs</h2>
            </div>
          </div>
          <div className="data-list no-border">
            {(jobs ?? []).map((job) => {
              const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
              return (
                <Link className="data-row" href={`/jobs/${job.id}`} key={job.id}>
                  <strong>{job.job_date}</strong>
                  <span>
                    {cleaner?.name ?? "No cleaner"} · {job.status}
                  </span>
                </Link>
              );
            })}
            {!jobs?.length ? <p className="empty-state">No jobs for this property yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
