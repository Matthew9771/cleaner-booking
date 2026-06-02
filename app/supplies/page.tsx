import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function SuppliesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: properties }, { data: supplies }] = await Promise.all([
    supabase.from("properties").select("id, name, address").order("name"),
    supabase.from("property_supplies").select("id, item_name, quantity, status, notes, properties(name, address)").order("updated_at", { ascending: false }).limit(100)
  ]);

  const lowItems = (supplies ?? []).filter((item) => item.status === "low" || item.status === "out");

  return (
    <main className="app-shell">
      <AdminNav active="supplies" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Supplies</p>
          <h1>Property stock</h1>
          <p className="intro">Track linen, batteries, toiletries, cleaning products, and property-specific stock.</p>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Low or out</span><strong>{lowItems.length}</strong></article>
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Total items</span><strong>{supplies?.length ?? 0}</strong></article>
        <article className="metric-card"><ClipboardList aria-hidden="true" /><span>Properties</span><strong>{properties?.length ?? 0}</strong></article>
      </section>

      <section className="job-layout">
        <form action="/supplies/create" className="management-panel data-form" method="post">
          <div className="section-heading"><div><p className="eyebrow">Add</p><h2>Supply item</h2></div></div>
          <label>
            Property
            <select name="property_id" required>
              <option value="">Choose property</option>
              {(properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
            </select>
          </label>
          <label>Item<input name="item_name" placeholder="Toilet roll, batteries, linen" required /></label>
          <div className="form-grid two">
            <label>Quantity<input name="quantity" placeholder="4 packs" /></label>
            <label>Status<select name="status" defaultValue="ok"><option value="ok">OK</option><option value="low">Low</option><option value="out">Out</option><option value="ordered">Ordered</option></select></label>
          </div>
          <label>Notes<textarea name="notes" rows={4} /></label>
          <button className="button primary" type="submit">Save supply</button>
        </form>

        <article className="management-panel">
          <div className="section-heading"><div><p className="eyebrow">Stock</p><h2>Current list</h2></div><ClipboardList aria-hidden="true" /></div>
          <div className="data-list no-border">
            {(supplies ?? []).map((item) => {
              const property = Array.isArray(item.properties) ? item.properties[0] : item.properties;
              return (
                <Link className="data-row" href="/supplies" key={item.id}>
                  <strong>{item.item_name}</strong>
                  <span>{property?.name ?? "Unknown property"} · {item.quantity || "No quantity"}</span>
                  <span className={`status-pill status-${item.status === "ok" || item.status === "ordered" ? "completed" : "declined"}`}>{item.status}</span>
                  {item.notes ? <span>{item.notes}</span> : null}
                </Link>
              );
            })}
            {!supplies?.length ? <p className="empty-state">No supplies tracked yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
