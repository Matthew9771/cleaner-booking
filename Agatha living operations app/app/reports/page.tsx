import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  const startDate = start.toISOString().slice(0, 10);

  const [{ data: jobs }, { data: properties }, { data: maintenance }] = await Promise.all([
    supabase.from("cleaning_jobs").select("id, status, job_date, payment_pence, completion_issue_tags, cleaner_paid_at").gte("job_date", startDate),
    supabase.from("properties").select("id, bedrooms, bathrooms, ical_feed_url, current_lockbox_code, default_cleaner_id, cleaning_notes"),
    supabase.from("maintenance_tasks").select("id, status, priority")
  ]);

  const completed = (jobs ?? []).filter((job) => job.status === "completed");
  const cleanerCost = completed.reduce((sum, job) => sum + job.payment_pence, 0);
  const issueJobs = (jobs ?? []).filter((job) => job.completion_issue_tags?.length);
  const missingSetup = (properties ?? []).filter((property) => property.bedrooms == null || property.bathrooms == null || !property.ical_feed_url || !property.current_lockbox_code || !property.default_cleaner_id || !property.cleaning_notes);
  const openMaintenance = (maintenance ?? []).filter((task) => task.status !== "done");

  return (
    <main className="app-shell">
      <AdminNav active="reports" />
      <section className="dashboard-header compact"><div><p className="eyebrow">Reports</p><h1>Weekly snapshot</h1><p className="intro">A quick operational view of cleans, costs, issues, setup gaps, and maintenance.</p></div></section>
      <section className="metric-grid">
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Completed cleans</span><strong>{completed.length}</strong></article>
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Cleaner cost</span><strong>£{(cleanerCost / 100).toFixed(0)}</strong></article>
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Issue jobs</span><strong>{issueJobs.length}</strong></article>
      </section>
      <section className="queue-grid">
        <article className="wide-panel"><div className="section-heading"><div><p className="eyebrow">Setup</p><h2>Properties with gaps</h2></div></div><p className="empty-state">{missingSetup.length} properties need setup cleanup.</p></article>
        <article className="wide-panel"><div className="section-heading"><div><p className="eyebrow">Maintenance</p><h2>Open tasks</h2></div></div><p className="empty-state">{openMaintenance.length} maintenance tasks are open.</p></article>
      </section>
    </main>
  );
}
