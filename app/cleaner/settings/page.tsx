import Image from "next/image";
import { CalendarDays, LogOut } from "lucide-react";
import { CleanerNav } from "../cleaner-nav";
import { requireCleaner } from "@/lib/auth/roles";
import { updateCleanerSettings } from "./actions";

type CleanerSettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function CleanerSettingsPage({ searchParams }: CleanerSettingsPageProps) {
  const { saved } = await searchParams;
  const { supabase, cleaner } = await requireCleaner();
  const { data: fullCleaner } = await supabase
    .from("cleaners")
    .select("id, name, phone, email, avatar_url, availability_notes, notification_preferences, invite_token")
    .eq("id", cleaner.id)
    .single();
  const { data: unavailableDays } = await supabase
    .from("cleaner_unavailability")
    .select("id, unavailable_date, notes")
    .eq("cleaner_id", cleaner.id)
    .gte("unavailable_date", new Date().toISOString().slice(0, 10))
    .order("unavailable_date", { ascending: true })
    .limit(12);
  const currentCleaner = fullCleaner ?? cleaner;
  const notificationPreferences = (fullCleaner?.notification_preferences ?? {}) as Record<string, boolean>;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3006").replace(/\/$/, "");
  const cleanerCalendarUrl = fullCleaner?.invite_token ? `${appUrl}/calendar/cleaner/${fullCleaner.invite_token}` : "";

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="settings" cleanerName={currentCleaner.name} avatarUrl={fullCleaner?.avatar_url} />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Your profile</h1>
          <p className="intro">Update the details Agatha Living sees for your cleaner account.</p>
        </div>
      </section>

      <section className="job-layout single">
        <article className="management-panel">
          <div className="profile-settings-head">
            {fullCleaner?.avatar_url ? (
              <Image alt="" height={64} src={fullCleaner.avatar_url} unoptimized width={64} />
            ) : (
              <span>{initials(currentCleaner.name) || "C"}</span>
            )}
            <div>
              <p className="eyebrow">Profile picture</p>
              <h2>{currentCleaner.name}</h2>
              <p className="helper-text">Upload a clear photo or paste an image link.</p>
            </div>
          </div>
          {saved === "yes" ? <p className="sync-message">Settings saved.</p> : null}
          <form action={updateCleanerSettings} className="data-form">
            <label>
              Upload profile picture
              <input name="avatar_file" type="file" accept="image/*" />
            </label>
            <label>
              Display picture URL
              <input defaultValue={fullCleaner?.avatar_url ?? ""} name="avatar_url" placeholder="https://..." type="url" />
            </label>
            <label>
              Display name
              <input defaultValue={currentCleaner.name} name="name" required type="text" />
            </label>
            <label>
              Phone
              <input defaultValue={currentCleaner.phone} name="phone" required type="tel" />
            </label>
            <label>
              Email
              <input disabled value={currentCleaner.email ?? ""} type="email" />
            </label>
            <label>
              Availability notes
              <textarea defaultValue={fullCleaner?.availability_notes ?? ""} name="availability_notes" rows={4} />
            </label>
            <div className="room-check-section">
              <p className="eyebrow">Notifications</p>
              <div className="form-grid two">
                <label className="checkbox-label large">
                  <input defaultChecked={notificationPreferences.whatsapp !== false} name="notify_whatsapp" type="checkbox" />
                  WhatsApp reminders
                </label>
                <label className="checkbox-label large">
                  <input defaultChecked={Boolean(notificationPreferences.email)} name="notify_email" type="checkbox" />
                  Email reminders
                </label>
              </div>
            </div>
            <p className="helper-text">Use the calendar page to block specific future dates.</p>
            <button className="button primary" type="submit">
              Save settings
            </button>
          </form>
          <div className="mini-list">
            <p className="eyebrow">Upcoming unavailable days</p>
            {(unavailableDays ?? []).map((day) => (
              <div className="mini-list-row" key={day.id}>
                <strong>{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${day.unavailable_date}T12:00:00`))}</strong>
                <span>{day.notes || "Unavailable"}</span>
              </div>
            ))}
            {!unavailableDays?.length ? <p className="empty-state">No unavailable days added.</p> : null}
          </div>
          <form action="/logout" method="post">
            <button className="button danger full-width" type="submit">
              <LogOut aria-hidden="true" />
              Log out
            </button>
          </form>
        </article>
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Calendar sync</p>
              <h2>Your calendar feed</h2>
            </div>
            <CalendarDays aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Apple Calendar</strong>
              <span>Open this link on your iPhone to subscribe to your Agatha Living jobs.</span>
            </div>
            <div>
              <strong>Google Calendar</strong>
              <span>Use Google Calendar &gt; Other calendars &gt; From URL after the app is deployed publicly.</span>
            </div>
            <div>
              <strong>Subscription URL</strong>
              <span>{cleanerCalendarUrl || "Calendar feed will appear once your profile is loaded."}</span>
            </div>
          </div>
          {cleanerCalendarUrl ? <a className="button secondary full-width" href={cleanerCalendarUrl}>Open calendar feed</a> : null}
        </article>
      </section>
    </main>
  );
}
