import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: cleaners }, { data: unavailable }] = await Promise.all([
    supabase.from("cleaners").select("id, name, phone, availability_notes").eq("active", true).order("name"),
    supabase.from("cleaner_unavailability").select("id, unavailable_date, notes, cleaners(name, phone)").gte("unavailable_date", today).order("unavailable_date").limit(100)
  ]);

  return (
    <main className="app-shell">
      <AdminNav active="availability" />
      <section className="dashboard-header compact"><div><p className="eyebrow">Availability</p><h1>Cleaner calendar</h1><p className="intro">Mark unavailable dates before assigning jobs.</p></div></section>
      <section className="job-layout">
        <form action="/availability/create" className="management-panel data-form" method="post">
          <div className="section-heading"><div><p className="eyebrow">Add</p><h2>Unavailable date</h2></div><CalendarDays aria-hidden="true" /></div>
          <label>Cleaner<select name="cleaner_id" required><option value="">Choose cleaner</option>{(cleaners ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Date<input name="unavailable_date" required type="date" /></label>
          <label>Notes<textarea name="notes" rows={4} /></label>
          <button className="button primary" type="submit">Save unavailable date</button>
        </form>
        <article className="management-panel">
          <div className="section-heading"><div><p className="eyebrow">Upcoming</p><h2>Unavailable cleaners</h2></div></div>
          <div className="data-list no-border">
            {(unavailable ?? []).map((row) => {
              const cleaner = Array.isArray(row.cleaners) ? row.cleaners[0] : row.cleaners;
              return <div className="data-row" key={row.id}><strong>{formatDate(row.unavailable_date)}</strong><span>{cleaner?.name ?? "Unknown cleaner"}</span>{row.notes ? <span>{row.notes}</span> : null}</div>;
            })}
            {!unavailable?.length ? <p className="empty-state">No unavailable dates logged.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
