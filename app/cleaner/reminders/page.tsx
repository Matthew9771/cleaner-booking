import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";
import { CleanerNav } from "../cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function reminderLabel(date: string, today: string, tomorrow: string) {
  if (date === today) return "Due today";
  if (date === tomorrow) return "Due tomorrow";
  return "Upcoming clean";
}

export default async function CleanerRemindersPage() {
  const { supabase, cleaner } = await requireCleaner();
  const todayDate = new Date();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(todayDate.getDate() + 1);
  const today = todayDate.toISOString().slice(0, 10);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, status, public_offer_token, properties(name, address, check_out_time, check_in_time)")
    .eq("cleaner_id", cleaner.id)
    .in("status", ["pending", "ready_for_review"])
    .gte("job_date", today)
    .order("job_date", { ascending: true })
    .limit(20);

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="reminders" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Reminders</p>
          <h1>Your upcoming clean reminders</h1>
          <p className="intro">Jobs due soon and cleans waiting for admin review.</p>
        </div>
      </section>
      <section className="wide-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Cleaner reminders</p><h2>Next actions</h2></div>
          <CalendarCheck2 aria-hidden="true" />
        </div>
        <div className="compact-job-list">
          {(jobs ?? []).map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const submitted = job.status === "ready_for_review";
            return (
              <Link className="job-row" href={`/cleaner/jobs/${job.id}`} key={job.id}>
                <span><strong>{property?.name ?? "Property"}</strong><small>{property?.address ?? "No address"}</small></span>
                <span>{formatDate(job.job_date)}</span>
                <span>{submitted ? "Waiting for review" : reminderLabel(job.job_date, today, tomorrow)}</span>
                <span className={`status-pill status-${job.status}`}>{submitted ? "Submitted" : "Pending clean"}</span>
              </Link>
            );
          })}
          {!jobs?.length ? <p className="empty-state">No cleaner reminders right now.</p> : null}
        </div>
      </section>
    </main>
  );
}
