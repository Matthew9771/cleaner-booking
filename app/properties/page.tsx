import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarSync } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address, bedrooms, bathrooms, ical_feed_url, current_lockbox_code, default_cleaner_id, default_duration_minutes, default_payment_pence, cleaning_notes")
    .order("name");

  return (
    <main className="app-shell">
      <AdminNav active="properties" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Properties</p>
          <h1>Property admin</h1>
          <p className="intro">Open a property to edit details, cleaning defaults, iCal import, and lockbox notes.</p>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>All properties</h2>
          </div>
          <Building2 aria-hidden="true" />
        </div>
        <div className="data-list no-border">
          {(properties ?? []).map((property) => {
            const missing = [
              property.bedrooms == null ? "bedrooms" : "",
              property.bathrooms == null ? "bathrooms" : "",
              property.default_cleaner_id ? "" : "default cleaner",
              property.default_payment_pence ? "" : "payment",
              property.current_lockbox_code ? "" : "lockbox",
              property.ical_feed_url ? "" : "iCal",
              property.cleaning_notes ? "" : "cleaning notes"
            ].filter(Boolean);

            return (
              <Link className="data-row" href={`/properties/${property.id}`} key={property.id}>
                <strong>{property.name}</strong>
                <span>{property.address}</span>
                <span>
                  {property.bedrooms ?? "?"} bed · {property.bathrooms ?? "?"} bath
                </span>
                <span>{missing.length ? `Missing: ${missing.join(", ")}` : "Ready for jobs"}</span>
              </Link>
            );
          })}
          {!properties?.length ? <p className="empty-state">No properties yet. Add one from the dashboard.</p> : null}
        </div>
        <Link className="button secondary full-width stacked-action" href="/dashboard">
          <CalendarSync aria-hidden="true" />
          Add property from dashboard
        </Link>
      </section>
    </main>
  );
}
