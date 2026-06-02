import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarSync, ChevronLeft, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { saveIcalFeed, syncIcalFeed } from "./actions";

type PropertyIcalPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    message?: string;
    sync?: string;
  }>;
};

function formatSyncedAt(value: string | null) {
  if (!value) return "Never synced";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function stayDates(checkIn: string, checkOut: string) {
  const occupied: string[] = [];
  let current = checkIn;

  while (current < checkOut && occupied.length < 90) {
    occupied.push(current);
    current = addDays(current, 1);
  }

  return occupied;
}

export default async function PropertyIcalPage({ params, searchParams }: PropertyIcalPageProps) {
  const { id } = await params;
  const { message, sync } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: property }, { data: bookings }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, address, ical_feed_url, ical_last_synced_at")
      .eq("id", id)
      .single(),
    supabase
      .from("bookings")
      .select("id, guest_name, check_in_date, check_out_date, source")
      .eq("property_id", id)
      .order("check_out_date", { ascending: true })
      .limit(20)
  ]);

  if (!property) {
    notFound();
  }

  const saveAction = saveIcalFeed.bind(null, id);
  const syncAction = syncIcalFeed.bind(null, id);

  return (
    <main className="app-shell">
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href={`/properties/${id}`}>
            <ChevronLeft aria-hidden="true" />
            Property
          </Link>
          <p className="eyebrow">iCal Import</p>
          <h1>{property.name}</h1>
          <p className="intro">{property.address}</p>
        </div>
      </section>

      <section className="job-layout">
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Feed</p>
              <h2>Reservation calendar</h2>
            </div>
            <CalendarSync aria-hidden="true" />
          </div>
          <form action={saveAction} className="data-form">
            <label>
              iCal feed URL
              <input
                defaultValue={property.ical_feed_url ?? ""}
                name="ical_feed_url"
                placeholder="https://www.airbnb.co.uk/calendar/ical/..."
                type="url"
              />
            </label>
            <button className="button primary" type="submit">
              <Save aria-hidden="true" />
              Save feed URL
            </button>
            <button className="button secondary" name="intent" type="submit" value="save-and-sync">
              <CalendarSync aria-hidden="true" />
              Save and sync now
            </button>
          </form>

          <form action={syncAction} className="stacked-action">
            <button className="button secondary full-width" type="submit">
              <CalendarSync aria-hidden="true" />
              Sync saved feed
            </button>
          </form>

          {message ? <p className={`sync-message sync-${sync ?? "synced"}`}>{message}</p> : null}

          <p className="helper-text">
            Last synced: {formatSyncedAt(property.ical_last_synced_at)}. Save a feed URL first, or use Save and sync now.
          </p>
        </article>

        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Bookings</p>
              <h2>Imported stays</h2>
            </div>
          </div>
          <div className="data-list no-border">
            {(bookings ?? []).map((booking) => (
              <Link className="data-row" href={`/bookings/${booking.id}`} key={booking.id}>
                <strong>{booking.guest_name || "Imported booking"}</strong>
                <span>
                  {booking.check_in_date} to {booking.check_out_date} · {booking.source}
                </span>
              </Link>
            ))}
            {!bookings?.length ? <p className="empty-state">No imported bookings yet.</p> : null}
          </div>
        </article>

        <article className="management-panel span-two">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Blocked dates</p>
              <h2>Guest stays and checkout cleans</h2>
            </div>
          </div>
          <p className="helper-text">
            Guest occupied nights are blocked for this property. The checkout date is left as the cleaning day.
          </p>
          <div className="ical-stay-grid">
            {(bookings ?? []).map((booking) => {
              const occupiedDates = stayDates(booking.check_in_date, booking.check_out_date);

              return (
                <div className="ical-stay-card" key={booking.id}>
                  <Link href={`/bookings/${booking.id}`}>
                    <strong>{booking.guest_name || "Imported booking"}</strong>
                    <span>{booking.source}</span>
                  </Link>
                  <div className="ical-date-chip-grid">
                    {occupiedDates.map((date) => (
                      <span className="ical-date-chip occupied" key={date}>{date}</span>
                    ))}
                    <span className="ical-date-chip checkout">{booking.check_out_date} clean</span>
                  </div>
                </div>
              );
            })}
            {!bookings?.length ? <p className="empty-state">Sync a feed to see blocked guest dates.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
