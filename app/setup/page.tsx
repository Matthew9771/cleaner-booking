import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address, bedrooms, bathrooms, ical_feed_url, current_lockbox_code, default_cleaner_id, default_payment_pence, cleaning_notes")
    .order("name");

  const rows = (properties ?? []).map((property) => ({
    ...property,
    missing: [
      property.bedrooms == null ? "Bedrooms" : "",
      property.bathrooms == null ? "Bathrooms" : "",
      property.default_cleaner_id ? "" : "Default cleaner",
      property.default_payment_pence ? "" : "Default payment",
      property.current_lockbox_code ? "" : "Lockbox code",
      property.ical_feed_url ? "" : "iCal",
      property.cleaning_notes ? "" : "Cleaning notes"
    ].filter(Boolean)
  }));
  const incompleteRows = rows.filter((property) => property.missing.length > 0);
  const adminOnboarding = [
    ["Create production admin account", false],
    ["Approve admin profile", false],
    ["Add all properties", rows.length > 0],
    ["Connect iCal feeds", rows.some((property) => property.ical_feed_url)],
    ["Set default cleaners", rows.every((property) => property.default_cleaner_id)],
    ["Confirm lockbox codes", rows.every((property) => property.current_lockbox_code)]
  ] as const;
  const cleanerOnboarding = [
    ["Add cleaner profile", true],
    ["Add cleaner phone for WhatsApp", true],
    ["Add cleaner email where dashboard access is needed", true],
    ["Approve cleaner login accounts", false],
    ["Test cleaner calendar on iPhone", false],
    ["Test photo completion flow", false]
  ] as const;

  return (
    <main className="app-shell">
      <AdminNav active="setup" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Setup</p>
          <h1>Property cleanup</h1>
          <p className="intro">Find properties missing core setup before they are used for quick jobs and cleaner messages.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Setup totals">
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Needs setup</span>
          <strong>{incompleteRows.length}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Ready</span>
          <strong>{rows.length - incompleteRows.length}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Total properties</span>
          <strong>{rows.length}</strong>
        </article>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cleanup</p>
            <h2>Missing information</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <div className="data-list no-border">
          {incompleteRows.map((property) => (
            <Link className="data-row" href={`/properties/${property.id}`} key={property.id}>
              <strong>{property.name}</strong>
              <span>{property.address}</span>
              <span>Missing: {property.missing.join(", ")}</span>
            </Link>
          ))}
          {!incompleteRows.length ? <p className="empty-state">All properties have the core setup fields.</p> : null}
        </div>
      </section>
      <section className="queue-grid">
        <article className="wide-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Onboarding</p>
              <h2>Admin setup</h2>
            </div>
            <ClipboardList aria-hidden="true" />
          </div>
          <div className="data-list no-border">
            {adminOnboarding.map(([label, done]) => (
              <div className="data-row" key={label}>
                <strong>{label}</strong>
                <span className={`status-pill ${done ? "status-completed" : "status-draft"}`}>{done ? "Ready" : "To do"}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="wide-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Onboarding</p>
              <h2>Cleaner setup</h2>
            </div>
            <ClipboardList aria-hidden="true" />
          </div>
          <div className="data-list no-border">
            {cleanerOnboarding.map(([label, done]) => (
              <div className="data-row" key={label}>
                <strong>{label}</strong>
                <span className={`status-pill ${done ? "status-completed" : "status-draft"}`}>{done ? "Ready" : "To do"}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
