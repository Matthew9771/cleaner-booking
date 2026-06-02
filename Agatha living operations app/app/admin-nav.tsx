import Link from "next/link";
import Image from "next/image";
import { Bell, Building2, CalendarCheck2, CalendarDays, CalendarPlus, ClipboardList, LayoutDashboard, LogOut, Menu, Settings, Sparkles, UserRound, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopCenterBrand } from "./top-center-brand";

type AdminNavProps = {
  active: "dashboard" | "today" | "reminders" | "followups" | "setup" | "properties" | "cleaners" | "calendar" | "queue" | "booking" | "job" | "payments" | "supplies" | "maintenance" | "availability" | "reports" | "deploy" | "settings" | "notifications";
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard", group: "Overview" },
  { href: "/today", label: "Today", icon: CalendarCheck2, key: "today", group: "Overview" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, key: "calendar", group: "Overview" },
  { href: "/notifications", label: "Notifications", icon: Bell, key: "notifications", group: "Overview" },
  { href: "/reminders", label: "Reminders", icon: CalendarCheck2, key: "reminders", group: "Work" },
  { href: "/follow-ups", label: "Follow-ups", icon: ClipboardList, key: "followups", group: "Work" },
  { href: "/bookings/needs-jobs", label: "Bookings queue", icon: ClipboardList, key: "queue", group: "Work" },
  { href: "/bookings/new", label: "Add booking", icon: CalendarPlus, key: "booking", group: "Work" },
  { href: "/jobs/new", label: "New job", icon: Sparkles, key: "job", group: "Work" },
  { href: "/payments", label: "Payments", icon: ClipboardList, key: "payments", group: "Work" },
  { href: "/supplies", label: "Supplies", icon: ClipboardList, key: "supplies", group: "Work" },
  { href: "/maintenance", label: "Maintenance", icon: ClipboardList, key: "maintenance", group: "Work" },
  { href: "/availability", label: "Availability", icon: CalendarDays, key: "availability", group: "Work" },
  { href: "/reports", label: "Reports", icon: ClipboardList, key: "reports", group: "Overview" },
  { href: "/deploy", label: "Deploy prep", icon: ClipboardList, key: "deploy", group: "Manage" },
  { href: "/setup", label: "Setup cleanup", icon: ClipboardList, key: "setup", group: "Manage" },
  { href: "/properties", label: "Properties", icon: Building2, key: "properties", group: "Manage" },
  { href: "/cleaners", label: "Cleaners", icon: UsersRound, key: "cleaners", group: "Manage" }
] as const;

export async function AdminNav({ active }: AdminNavProps) {
  const groups = ["Overview", "Work", "Manage"] as const;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("avatar_url, full_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const today = new Date().toISOString().slice(0, 10);
  const { count: notificationCount } = user
    ? await supabase
        .from("cleaning_jobs")
        .select("id", { count: "exact", head: true })
        .or(`status.eq.ready_for_review,status.eq.declined,and(status.eq.offered,job_date.lte.${today}),and(status.eq.completed,cleaner_paid_at.is.null)`)
    : { count: 0 };

  return (
    <>
      <TopCenterBrand href="/dashboard" label="Agatha Living dashboard" />
      <details className="admin-menu">
        <summary aria-label="Open navigation">
          <Menu aria-hidden="true" />
          <span>Menu</span>
        </summary>
        <nav className="admin-menu-panel" aria-label="Admin navigation">
          <Link className="admin-brand" href="/dashboard">
            <span>Agatha Living</span>
            <small>Operations</small>
          </Link>
          {groups.map((group) => (
            <div className="admin-link-group" key={group}>
              <p>{group}</p>
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.key;

                  return (
                    <Link aria-current={isActive ? "page" : undefined} className={`admin-link${isActive ? " active" : ""}`} href={item.href} key={item.href}>
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
              })}
            </div>
          ))}
        </nav>
      </details>
      <Link className={`notification-button${active === "notifications" ? " active" : ""}`} href="/notifications" aria-label="Notifications">
        <Bell aria-hidden="true" />
        {notificationCount ? <span className="notification-badge">{notificationCount > 9 ? "9+" : notificationCount}</span> : null}
      </Link>
      <details className="profile-menu">
        <summary className="profile-button" aria-label="Admin profile menu">
          {profile?.avatar_url ? <Image alt="" height={38} src={profile.avatar_url} unoptimized width={38} /> : <UserRound aria-hidden="true" />}
        </summary>
        <div className="profile-menu-panel">
          <Link className="admin-link" href="/settings">
            <UserRound aria-hidden="true" />
            <span>Edit profile</span>
          </Link>
          <Link className="admin-link" href="/calendar">
            <CalendarDays aria-hidden="true" />
            <span>Calendar</span>
          </Link>
          <Link className="admin-link" href="/settings">
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <form action="/logout" method="post">
            <button className="admin-link nav-logout" type="submit">
              <LogOut aria-hidden="true" />
              <span>Log out</span>
            </button>
          </form>
        </div>
      </details>
    </>
  );
}
