import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`)) : "No due date";
}

export default async function MaintenancePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: properties }, { data: tasks }] = await Promise.all([
    supabase.from("properties").select("id, name").order("name"),
    supabase.from("maintenance_tasks").select("id, title, priority, status, due_date, notes, properties(name, address)").order("created_at", { ascending: false }).limit(100)
  ]);
  const openTasks = (tasks ?? []).filter((task) => task.status !== "done");

  return (
    <main className="app-shell">
      <AdminNav active="maintenance" />
      <section className="dashboard-header compact"><div><p className="eyebrow">Maintenance</p><h1>Tasks</h1><p className="intro">Turn damage and maintenance notes into trackable work.</p></div></section>
      <section className="metric-grid">
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Open</span><strong>{openTasks.length}</strong></article>
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Urgent</span><strong>{openTasks.filter((task) => task.priority === "urgent").length}</strong></article>
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Total</span><strong>{tasks?.length ?? 0}</strong></article>
      </section>
      <section className="job-layout">
        <form action="/maintenance/create" className="management-panel data-form" method="post">
          <div className="section-heading"><div><p className="eyebrow">Add</p><h2>Task</h2></div></div>
          <label>Property<select name="property_id"><option value="">No property</option>{(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Title<input name="title" required placeholder="Fix shower head" /></label>
          <div className="form-grid two">
            <label>Priority<select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
            <label>Due date<input name="due_date" type="date" /></label>
          </div>
          <label>Notes<textarea name="notes" rows={4} /></label>
          <button className="button primary" type="submit">Save task</button>
        </form>
        <article className="management-panel">
          <div className="section-heading"><div><p className="eyebrow">Open</p><h2>Task list</h2></div><ClipboardList aria-hidden="true" /></div>
          <div className="data-list no-border">
            {(tasks ?? []).map((task) => {
              const property = Array.isArray(task.properties) ? task.properties[0] : task.properties;
              return (
                <div className="data-row" key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{property?.name ?? "No property"} · {formatDate(task.due_date)} · {task.priority}</span>
                  {task.notes ? <span>{task.notes}</span> : null}
                  <form action={`/maintenance/${task.id}/status`} method="post">
                    <input name="status" type="hidden" value={task.status === "done" ? "open" : "done"} />
                    <button className="mini-button" type="submit">{task.status === "done" ? "Reopen" : "Mark done"}</button>
                  </form>
                </div>
              );
            })}
            {!tasks?.length ? <p className="empty-state">No maintenance tasks yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
