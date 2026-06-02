import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, UsersRound } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function CleanersPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cleaners } = await supabase
    .from("cleaners")
    .select("id, name, phone, email, can_login, is_primary, active, preferred_areas, availability_notes")
    .order("active", { ascending: false })
    .order("is_primary", { ascending: false })
    .order("name");

  return (
    <main className="app-shell">
      <AdminNav active="cleaners" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Cleaners</p>
          <h1>Cleaner admin</h1>
          <p className="intro">Open a cleaner to edit contact details, primary status, availability, and job history.</p>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h2>All cleaners</h2>
          </div>
          <UsersRound aria-hidden="true" />
        </div>
        <div className="data-list no-border">
          {(cleaners ?? []).map((cleaner) => (
            <Link className="data-row" href={`/cleaners/${cleaner.id}`} key={cleaner.id}>
              <strong>{cleaner.name}</strong>
              <span>{cleaner.phone}</span>
              <span>{cleaner.email || "No email"}</span>
              <span>
                {cleaner.is_primary ? "Primary" : "Backup"} · {cleaner.active ? "Active" : "Inactive"}
              </span>
              <span>{cleaner.email && cleaner.can_login ? "Dashboard login enabled" : "WhatsApp only"}</span>
              <span>{cleaner.preferred_areas || cleaner.availability_notes || "No availability notes"}</span>
            </Link>
          ))}
          {!cleaners?.length ? <p className="empty-state">No cleaners yet. Add one from the dashboard.</p> : null}
        </div>
        <Link className="button secondary full-width stacked-action" href="/dashboard">
          <Plus aria-hidden="true" />
          Add cleaner from dashboard
        </Link>
      </section>
    </main>
  );
}
