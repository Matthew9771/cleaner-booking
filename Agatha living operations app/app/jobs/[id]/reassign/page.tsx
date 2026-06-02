import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { CleanerConflictWarning } from "../../conflict-warning";
import { reassignCleaningJob } from "./actions";

type ReassignJobPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    conflict?: string;
  }>;
};

export default async function ReassignJobPage({ params, searchParams }: ReassignJobPageProps) {
  const { id } = await params;
  const { conflict } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: job }, { data: cleaners }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id, cleaner_id, job_date, status, properties(name, address), cleaners(name)")
      .eq("id", id)
      .single(),
    supabase.from("cleaners").select("id, name, phone, is_primary").eq("active", true).order("is_primary", {
      ascending: false
    })
  ]);

  if (!job) {
    notFound();
  }

  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
  const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
  const reassignAction = reassignCleaningJob.bind(null, id);
  const { data: cleanerConflicts } = await supabase
    .from("cleaning_jobs")
    .select("id, cleaner_id, job_date, properties(name)")
    .eq("job_date", job.job_date)
    .neq("id", id)
    .neq("status", "cancelled");

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
          <h1>Reassign cleaner</h1>
          <p className="intro">
            {property?.name ?? "This job"} is currently assigned to {cleaner?.name ?? "no cleaner"}.
          </p>
        </div>
      </section>

      <section className="job-layout single">
        <form action={reassignAction} className="management-panel data-form">
          <label>
            New cleaner
            <select defaultValue="" name="cleaner_id" required>
              <option value="">Choose cleaner</option>
              {(cleaners ?? []).map((option) => (
                <option disabled={option.id === job.cleaner_id} key={option.id} value={option.id}>
                  {option.name} - {option.phone}
                  {option.is_primary ? " - Primary" : ""}
                </option>
              ))}
            </select>
          </label>

          <p className="helper-text">
            Reassigning resets the job to offered and creates a fresh confirmation link for the new cleaner.
          </p>
          {conflict ? <p className="sync-message sync-error">{conflict}</p> : null}
          <CleanerConflictWarning
            fixedDate={job.job_date}
            conflicts={(cleanerConflicts ?? []).map((conflict) => {
              const conflictProperty = Array.isArray(conflict.properties) ? conflict.properties[0] : conflict.properties;
              return {
                cleaner_id: conflict.cleaner_id,
                job_date: conflict.job_date,
                job_id: conflict.id,
                property_name: conflictProperty?.name ?? "another property"
              };
            })}
          />

          <button className="button primary" type="submit">
            <Send aria-hidden="true" />
            Reassign and prepare message
          </button>
        </form>
      </section>
    </main>
  );
}
