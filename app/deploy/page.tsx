import { ClipboardList, ExternalLink, Smartphone } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function DeployPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: properties }, { data: cleaners }, { count: cleanerCount }, { count: openJobCount }, { count: unpaidCount }, { count: bookingQueueCount }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, bedrooms, bathrooms, ical_feed_url, current_lockbox_code, default_cleaner_id, default_payment_pence, cleaning_notes")
      .limit(200),
    supabase.from("cleaners").select("id, name, email, can_login, auth_user_id, active").order("name", { ascending: true }),
    supabase.from("cleaners").select("*", { count: "exact", head: true }),
    supabase.from("cleaning_jobs").select("*", { count: "exact", head: true }).in("status", ["offered", "accepted", "pending", "ready_for_review", "declined"]),
    supabase.from("cleaning_jobs").select("*", { count: "exact", head: true }).eq("status", "completed").is("cleaner_paid_at", null),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("reviewed", false)
  ]);

  const propertyRows = properties ?? [];
  const cleanerRows = cleaners ?? [];
  const cleanerLoginReady = cleanerRows.filter((cleaner) => cleaner.email && cleaner.can_login && cleaner.auth_user_id && cleaner.active).length;
  const productionUrl = process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : "https://operations.agathaliving.co.uk";
  const incompleteProperties = propertyRows.filter(
    (property) =>
      property.bedrooms == null ||
      property.bathrooms == null ||
      !property.default_cleaner_id ||
      !property.default_payment_pence ||
      !property.current_lockbox_code ||
      !property.ical_feed_url ||
      !property.cleaning_notes
  );
  const checks = [
    ["Supabase URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["Supabase anon key", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["Production app URL", Boolean(process.env.NEXT_PUBLIC_APP_URL) && !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")],
    ["At least one cleaner", Boolean(cleanerCount)],
    ["Property setup complete", incompleteProperties.length === 0 && propertyRows.length > 0],
    ["Booking review queue clear", (bookingQueueCount ?? 0) === 0],
    ["No open job emergencies", (openJobCount ?? 0) === 0],
    ["No unpaid completed cleans", (unpaidCount ?? 0) === 0],
    ["Cleaner photo bucket migration", true],
    ["Support and contact pages ready", true],
    ["Guest and landlord portal routes ready", true],
    ["Operations subdomain planned", productionUrl.includes("operations.agathaliving.co.uk")],
    ["WhatsApp links use production URL", Boolean(process.env.NEXT_PUBLIC_APP_URL) && !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")],
    ["Account approval SQL run", false],
    ["Turn Supabase email confirmation back on", false],
    ["Run final production smoke test", false]
  ] as const;
  const readyCount = checks.filter(([, done]) => done).length;

  return (
    <main className="app-shell">
      <AdminNav active="deploy" />
      <section className="dashboard-header compact"><div><p className="eyebrow">Deploy</p><h1>Production prep</h1><p className="intro">Checklist before moving off localhost.</p></div></section>
      <section className="metric-grid" aria-label="Deployment readiness">
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Ready checks</span>
          <strong>{readyCount}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Needs action</span>
          <strong>{checks.length - readyCount}</strong>
        </article>
        <article className="metric-card">
          <ClipboardList aria-hidden="true" />
          <span>Setup gaps</span>
          <strong>{incompleteProperties.length}</strong>
        </article>
      </section>
      <section className="wide-panel">
        <div className="section-heading"><div><p className="eyebrow">Checklist</p><h2>Ready to deploy</h2></div><ClipboardList aria-hidden="true" /></div>
        <div className="data-list no-border">
          {checks.map(([label, done]) => (
            <div className="data-row" key={label}>
              <strong>{label}</strong>
              <span className={`status-pill ${done ? "status-completed" : "status-draft"}`}>{done ? "Ready" : "Needs action"}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cleaner login</p>
            <h2>Login readiness</h2>
          </div>
          <ClipboardList aria-hidden="true" />
        </div>
        <div className="data-list no-border">
          {cleanerRows.map((cleaner) => {
            const ready = Boolean(cleaner.email && cleaner.can_login && cleaner.auth_user_id && cleaner.active);
            const missing = [
              cleaner.email ? "" : "email",
              cleaner.can_login ? "" : "login not allowed",
              cleaner.auth_user_id ? "" : "not linked to auth user",
              cleaner.active ? "" : "inactive"
            ].filter(Boolean).join(", ");

            return (
              <div className="data-row" key={cleaner.id}>
                <strong>{cleaner.name}</strong>
                <span>{cleaner.email || "No email"} · {ready ? "Ready for cleaner login" : `Needs ${missing}`}</span>
                <span className={`status-pill ${ready ? "status-completed" : "status-draft"}`}>{ready ? "Ready" : "Needs action"}</span>
              </div>
            );
          })}
          {!cleanerRows.length ? <p className="empty-state">No cleaners found.</p> : null}
        </div>
        <p className="helper-text">{cleanerLoginReady} cleaner login{cleanerLoginReady === 1 ? "" : "s"} ready. A fake test email still needs a confirmed Supabase Auth user before password sign-in will work.</p>
      </section>
      <section className="queue-grid">
        <article className="wide-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Website links</p>
              <h2>Main website buttons</h2>
            </div>
            <ExternalLink aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Operations Login</strong>
              <span>{productionUrl}/login?portal=admin</span>
            </div>
            <div>
              <strong>Cleaner Login</strong>
              <span>{productionUrl}/login?portal=cleaner</span>
            </div>
            <div>
              <strong>Portal chooser</strong>
              <span>{productionUrl}/portal</span>
            </div>
          </div>
          <p className="helper-text">Once deployed, add these as buttons on agathaliving.co.uk. The app should live on a subdomain such as operations.agathaliving.co.uk.</p>
        </article>
        <article className="wide-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Domain</p>
              <h2>Subdomain setup</h2>
            </div>
            <ExternalLink aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Target URL</strong>
              <span>operations.agathaliving.co.uk</span>
            </div>
            <div>
              <strong>DNS record</strong>
              <span>Add an operations CNAME record pointing to the deploy host once Netlify/Vercel gives us the target.</span>
            </div>
            <div>
              <strong>Main website buttons</strong>
              <span>Add Operations Login and Cleaner Login buttons on agathaliving.co.uk once the subdomain is live.</span>
            </div>
          </div>
        </article>
        <article className="wide-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">App Store</p>
              <h2>iOS readiness</h2>
            </div>
            <Smartphone aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Mobile workflows tested</strong>
              <span>Cleaner login, calendar, job detail, completion, photos, invoices, and logout.</span>
            </div>
            <div>
              <strong>Policy pages ready</strong>
              <span>Privacy policy, support contact, and terms need to be available from the app.</span>
            </div>
            <div>
              <strong>iOS wrapper later</strong>
              <span>After deployment, wrap with Capacitor, test in Xcode, then send to TestFlight.</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
