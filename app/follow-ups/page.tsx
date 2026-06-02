import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

type FollowUpJob = {
  id: string;
  job_date: string;
  completion_issue_tags: string[] | null;
  completion_notes: string | null;
  admin_review_notes: string | null;
  properties: { name: string; address: string } | { name: string; address: string }[] | null;
  cleaners: { name: string } | { name: string }[] | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function tagLabel(tag: string) {
  const labels: Record<string, string> = {
    supplies: "Supplies",
    damage: "Damage",
    maintenance: "Maintenance",
    guest_issue: "Guest issue"
  };
  return labels[tag] || tag;
}

export default async function FollowUpsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("cleaning_jobs")
    .select("id, job_date, completion_issue_tags, completion_notes, admin_review_notes, properties(name, address), cleaners(name)")
    .order("job_date", { ascending: false })
    .limit(100);

  const rows = ((data ?? []) as FollowUpJob[]).filter((job) => (job.completion_issue_tags ?? []).length > 0);

  return (
    <main className="app-shell">
      <AdminNav active="followups" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Follow-ups</p>
          <h1>Issues inbox</h1>
          <p className="intro">Supplies, damage, maintenance, and guest issues from cleaner/admin review.</p>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Open</p>
            <h2>Needs resolution</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <div className="data-list no-border">
          {rows.map((job) => {
            const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
            const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
            return (
              <div className="data-row follow-up-row" key={job.id}>
                <Link href={`/jobs/${job.id}`}>
                  <strong>{property?.name ?? "Unknown property"}</strong>
                  <span>{formatDate(job.job_date)} · {cleaner?.name ?? "No cleaner"} · {property?.address ?? "No address"}</span>
                </Link>
                <div className="tag-list">
                  {(job.completion_issue_tags ?? []).map((tag) => (
                    <span className="status-pill status-draft" key={tag}>{tagLabel(tag)}</span>
                  ))}
                </div>
                <span>{job.completion_notes || job.admin_review_notes || "No notes added"}</span>
                <form action={`/follow-ups/${job.id}/resolve`} method="post">
                  <button className="mini-button" type="submit">Mark resolved</button>
                </form>
              </div>
            );
          })}
          {!rows.length ? <p className="empty-state">No open follow-ups.</p> : null}
        </div>
      </section>
    </main>
  );
}
