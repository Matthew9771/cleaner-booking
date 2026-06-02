import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, ChevronLeft } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { createBooking } from "./actions";

export default async function NewBookingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: properties } = await supabase.from("properties").select("id, name, address").order("name");

  return (
    <main className="app-shell">
      <AdminNav active="booking" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard">
            <ChevronLeft aria-hidden="true" />
            Dashboard
          </Link>
          <p className="eyebrow">Bookings</p>
          <h1>Add booking</h1>
          <p className="intro">Capture the guest stay first, then create the cleaning job from checkout.</p>
        </div>
      </section>

      <section className="job-layout single">
        <form action={createBooking} className="management-panel data-form">
          <label>
            Property
            <select name="property_id" required>
              <option value="">Choose property</option>
              {(properties ?? []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} - {property.address}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid two">
            <label>
              Guest name
              <input name="guest_name" placeholder="Guest name" type="text" />
            </label>
            <label>
              Source
              <select defaultValue="Airbnb" name="source">
                <option>Airbnb</option>
                <option>Booking.com</option>
                <option>Direct</option>
                <option>Other</option>
              </select>
            </label>
          </div>

          <div className="form-grid two">
            <label>
              Check-in
              <input name="check_in_date" required type="date" />
            </label>
            <label>
              Checkout
              <input name="check_out_date" required type="date" />
            </label>
          </div>

          <label>
            Guest lockbox code
            <input maxLength={10} name="guest_lockbox_code" placeholder="9134" type="text" />
          </label>

          <label>
            Notes
            <textarea name="notes" placeholder="Guest notes, late checkout, special instructions" rows={4} />
          </label>

          <button className="button primary" type="submit">
            <CalendarPlus aria-hidden="true" />
            Save booking
          </button>
        </form>
      </section>
    </main>
  );
}
