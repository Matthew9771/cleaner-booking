import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Save, UsersRound } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

type CleanerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CleanerPage({ params }: CleanerPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const requestHeaders = await headers();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: cleaner }, { data: jobs }] = await Promise.all([
    supabase.from("cleaners").select("*").eq("id", id).single(),
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, cleaner_paid_at, completion_issue_tags, admin_quality_rating, admin_quality_notes, properties(name, address)")
      .eq("cleaner_id", id)
      .order("job_date", { ascending: false })
      .limit(50)
  ]);

  if (!cleaner) {
    notFound();
  }

  const cleanerJobs = jobs ?? [];
  const acceptedCount = cleanerJobs.filter((job) => ["accepted", "pending", "ready_for_review", "completed"].includes(job.status)).length;
  const declinedCount = cleanerJobs.filter((job) => job.status === "declined").length;
  const completedCount = cleanerJobs.filter((job) => job.status === "completed").length;
  const unpaidCount = cleanerJobs.filter((job) => job.status === "completed" && !job.cleaner_paid_at).length;
  const issueCount = cleanerJobs.filter((job) => job.completion_issue_tags?.length).length;
  const ratedJobs = cleanerJobs.filter((job) => job.admin_quality_rating);
  const averageRating = ratedJobs.length ? ratedJobs.reduce((sum, job) => sum + Number(job.admin_quality_rating), 0) / ratedJobs.length : null;
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const appUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3006";
  const inviteUrl = `${appUrl}/cleaner/invite/${cleaner.invite_token}`;

  return (
    <main className="app-shell">
      <AdminNav active="cleaners" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard">
            <ChevronLeft aria-hidden="true" />
            Dashboard
          </Link>
          <p className="eyebrow">Cleaner</p>
          <h1>{cleaner.name}</h1>
          <p className="intro">{cleaner.phone}</p>
        </div>
      </section>

      <section className="job-layout">
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Details</p>
              <h2>Cleaner information</h2>
            </div>
            <UsersRound aria-hidden="true" />
          </div>
          <div className="job-summary">
            <div>
              <span>Email</span>
              <strong>{cleaner.email || "No email"}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{cleaner.is_primary ? "Primary cleaner" : "Backup cleaner"}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{cleaner.active ? "Active" : "Inactive"}</strong>
            </div>
            <div>
              <span>Dashboard login</span>
              <strong>{cleaner.can_login && cleaner.email ? "Allowed" : "WhatsApp only"}</strong>
            </div>
            {cleaner.email ? (
              <div>
                <span>Invite link</span>
                <strong>{inviteUrl}</strong>
              </div>
            ) : null}
          </div>
          {cleaner.email ? (
            <a className="button secondary full-width" href={`mailto:${cleaner.email}?subject=${encodeURIComponent("Create your Agatha Living cleaner account")}&body=${encodeURIComponent(`Hi ${cleaner.name},\n\nPlease use this link to create your Agatha Living cleaner account:\n\n${inviteUrl}\n\nThank you,\nAgatha Living`)}`}>
              Send invite email
            </a>
          ) : null}
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Performance</p>
              <h2>Cleaner history</h2>
            </div>
          </div>
          <div className="job-summary">
            <div>
              <span>Accepted</span>
              <strong>{acceptedCount}</strong>
            </div>
            <div>
              <span>Declined</span>
              <strong>{declinedCount}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
            <div>
              <span>Unpaid completed jobs</span>
              <strong>{unpaidCount}</strong>
            </div>
            <div>
              <span>Jobs with review issues</span>
              <strong>{issueCount}</strong>
            </div>
            <div>
              <span>Average quality rating</span>
              <strong>{averageRating ? `${averageRating.toFixed(1)} / 5` : "No ratings yet"}</strong>
            </div>
          </div>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin</p>
              <h2>Edit cleaner</h2>
            </div>
          </div>
          <form action={`/cleaners/${id}/update`} className="data-form" method="post">
            <label>
              Name
              <input defaultValue={cleaner.name} name="name" required type="text" />
            </label>
            <div className="form-grid two">
              <label>
                Phone
                <input defaultValue={cleaner.phone} name="phone" required type="tel" />
              </label>
              <label>
                Email
                <input defaultValue={cleaner.email ?? ""} name="email" type="email" />
              </label>
            </div>
            <label className="checkbox-label">
              <input defaultChecked={Boolean(cleaner.is_primary)} name="is_primary" type="checkbox" />
              Primary cleaner
            </label>
            <label className="checkbox-label">
              <input defaultChecked={Boolean(cleaner.active)} name="active" type="checkbox" />
              Active
            </label>
            <label className="checkbox-label">
              <input defaultChecked={Boolean(cleaner.can_login)} name="can_login" type="checkbox" />
              Allow cleaner dashboard login
            </label>
            <p className="helper-text">Add an email and tick this to let the cleaner create or use a dashboard login. If there is no email saved, login access will stay off.</p>
            <label>
              Preferred areas
              <input defaultValue={cleaner.preferred_areas ?? ""} name="preferred_areas" placeholder="Forest Hill, Dulwich, Peckham" type="text" />
            </label>
            <label>
              Availability notes
              <textarea defaultValue={cleaner.availability_notes ?? ""} name="availability_notes" placeholder="Unavailable Fridays, school runs, preferred times" rows={4} />
            </label>
            <button className="button primary" type="submit">
              <Save aria-hidden="true" />
              Save cleaner
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
            {cleanerJobs.slice(0, 12).map((job) => {
              const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
              return (
                <Link className="data-row" href={`/jobs/${job.id}`} key={job.id}>
                  <strong>{job.job_date}</strong>
                  <span>
                    {property?.name ?? "Unknown property"} · {job.status}
                  </span>
                </Link>
              );
            })}
            {!jobs?.length ? <p className="empty-state">No jobs for this cleaner yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
