import Image from "next/image";
import Link from "next/link";
import { CalendarDays, LogOut, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { getSignedInUserAndRole } from "@/lib/auth/roles";
import { updateAdminSettings } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { saved } = await searchParams;
  const { user, profile, supabase } = await getSignedInUserAndRole();
  const { data: fullProfile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
  const avatarUrl = fullProfile?.avatar_url;
  const displayName = fullProfile?.full_name || profile?.full_name || user.email || "Admin";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3006").replace(/\/$/, "");
  const adminCalendarUrl = `${appUrl}/calendar/admin/${user.id}`;

  return (
    <main className="app-shell">
      <AdminNav active="settings" />
      <section className="dashboard-header compact">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Admin profile</h1>
          <p className="intro">Account settings for the admin side.</p>
        </div>
      </section>
      <section className="job-layout single">
        <article className="management-panel">
          <div className="profile-settings-head">
            {avatarUrl ? <Image alt="" height={64} src={avatarUrl} unoptimized width={64} /> : <span><UserRound aria-hidden="true" /></span>}
            <div>
              <p className="eyebrow">Profile</p>
              <h2>{displayName}</h2>
              <p className="helper-text">{user.email}</p>
            </div>
          </div>
          {saved === "yes" ? <p className="sync-message">Settings saved.</p> : null}
          <form action={updateAdminSettings} className="data-form">
            <label>
              Upload profile picture
              <input name="avatar_file" type="file" accept="image/*" />
            </label>
            <label>
              Display picture URL
              <input defaultValue={avatarUrl ?? ""} name="avatar_url" placeholder="https://..." type="url" />
            </label>
            <label>
              Display name
              <input defaultValue={displayName} name="full_name" required type="text" />
            </label>
            <button className="button primary" type="submit">Save settings</button>
          </form>
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
              <h2>Admin calendar feed</h2>
            </div>
            <CalendarDays aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Apple Calendar</strong>
              <span>Open this link on your Apple device, or add it as a subscribed calendar.</span>
            </div>
            <div>
              <strong>Google Calendar</strong>
              <span>Use Google Calendar &gt; Other calendars &gt; From URL after this app is deployed publicly.</span>
            </div>
            <div>
              <strong>Subscription URL</strong>
              <span>{adminCalendarUrl}</span>
            </div>
          </div>
          <a className="button secondary full-width" href={adminCalendarUrl}>Open calendar feed</a>
        </article>
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Security</p>
              <h2>Account approvals</h2>
            </div>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Admin verification</strong>
              <span>Review new admin and cleaner accounts before treating them as approved access.</span>
            </div>
          </div>
          <Link className="button secondary full-width" href="/settings/accounts">Review account approvals</Link>
        </article>
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Mobile app</p>
              <h2>iPhone testing</h2>
            </div>
            <Smartphone aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Test on your iPhone</strong>
              <span>Use the Network link shown in the terminal while your iPhone is on the same Wi-Fi.</span>
            </div>
            <div>
              <strong>Keep this as the main web app</strong>
              <span>The same responsive app will become the base for the Apple version.</span>
            </div>
            <div>
              <strong>App Store wrapper later</strong>
              <span>Once the workflows feel finished, we wrap it for iOS and test through TestFlight.</span>
            </div>
          </div>
        </article>
        <article className="management-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Launch prep</p>
              <h2>App Store basics</h2>
            </div>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="readiness-list">
            <div>
              <strong>Privacy policy</strong>
              <span>Needed before App Store submission.</span>
            </div>
            <div>
              <strong>Support contact</strong>
              <span>Apple expects a clear way for users to get help.</span>
            </div>
            <div>
              <strong>Real production links</strong>
              <span>WhatsApp, invite links, photos, and cleaner login must use the live app URL.</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
