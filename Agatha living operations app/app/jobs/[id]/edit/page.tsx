import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { updateCleaningJob } from "./actions";

type EditJobPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditJobPage({ params }: EditJobPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: job }, { data: properties }, { data: cleaners }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id, property_id, cleaner_id, job_date, duration_minutes, payment_pence, current_lockbox_code, new_lockbox_code")
      .eq("id", id)
      .single(),
    supabase.from("properties").select("id, name, address").order("name"),
    supabase.from("cleaners").select("id, name, phone, is_primary").eq("active", true).order("is_primary", {
      ascending: false
    })
  ]);

  if (!job) {
    notFound();
  }

  const updateAction = updateCleaningJob.bind(null, id);

  return (
    <main className="app-shell">
      <AdminNav active="job" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href={`/jobs/${id}`}>
            <ChevronLeft aria-hidden="true" />
            Job
          </Link>
          <p className="eyebrow">Cleaning Jobs</p>
          <h1>Edit cleaning job</h1>
        </div>
      </section>

      <section className="job-layout single">
        <form action={updateAction} className="management-panel data-form">
          <label>
            Property
            <select defaultValue={job.property_id} name="property_id" required>
              {(properties ?? []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} - {property.address}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cleaner
            <select defaultValue={job.cleaner_id ?? ""} name="cleaner_id" required>
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
              Job date
              <input defaultValue={job.job_date} name="job_date" required type="date" />
            </label>
            <label>
              Duration
              <select defaultValue={String(job.duration_minutes)} name="duration_minutes" required>
                <option value="120">2 hours</option>
                <option value="150">2.5 hours</option>
                <option value="180">3 hours</option>
                <option value="210">3.5 hours</option>
                <option value="240">4 hours</option>
              </select>
            </label>
          </div>

          <label>
            Payment
            <input defaultValue={(job.payment_pence / 100).toFixed(0)} min="0" name="payment_pounds" required step="1" type="number" />
          </label>

          <div className="form-grid two">
            <label>
              Current guest code
              <input defaultValue={job.current_lockbox_code ?? ""} maxLength={10} name="current_lockbox_code" required type="text" />
            </label>
            <label>
              New guest code
              <input defaultValue={job.new_lockbox_code ?? ""} maxLength={10} name="new_lockbox_code" required type="text" />
            </label>
          </div>

          <button className="button primary" type="submit">
            <Save aria-hidden="true" />
            Save changes
          </button>
        </form>
      </section>
    </main>
  );
}
