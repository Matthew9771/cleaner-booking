"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, CalendarCheck2, CalendarDays, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { TopCenterBrand } from "../top-center-brand";

type CleanerNavProps = {
  active: "dashboard" | "calendar" | "jobs" | "payments" | "reminders" | "settings" | "notifications";
  cleanerName?: string;
  avatarUrl?: string | null;
};

const navItems = [
  { href: "/cleaner", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/cleaner/calendar", label: "Calendar", icon: CalendarDays, key: "calendar" },
  { href: "/cleaner/jobs", label: "Jobs", icon: ClipboardList, key: "jobs" },
  { href: "/cleaner/payments", label: "Payments", icon: ClipboardList, key: "payments" },
  { href: "/cleaner/notifications", label: "Notifications", icon: Bell, key: "notifications" },
  { href: "/cleaner/reminders", label: "Reminders", icon: CalendarCheck2, key: "reminders" }
] as const;

export function CleanerNav({ active, cleanerName = "Cleaner", avatarUrl }: CleanerNavProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const profileRef = useRef<HTMLDetailsElement>(null);
  const initials = cleanerName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        menuRef.current.open = false;
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        profileRef.current.open = false;
      }
    }

    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, []);

  function closeMenus() {
    if (menuRef.current) menuRef.current.open = false;
    if (profileRef.current) profileRef.current.open = false;
  }

  const availabilityHref = active === "calendar" ? "#availability" : "/cleaner/calendar#availability";
  const bookOffHref = active === "calendar" ? "#book-days-off" : "/cleaner/calendar#book-days-off";

  return (
    <div className="cleaner-topbar">
      <TopCenterBrand href="/cleaner" label="Agatha Living cleaner dashboard" />
      <details className="admin-menu cleaner-menu" ref={menuRef}>
        <summary aria-label="Open cleaner navigation">
          <Menu aria-hidden="true" />
          <span>Menu</span>
        </summary>
        <nav className="admin-menu-panel" aria-label="Cleaner navigation">
          <Link className="admin-brand" href="/cleaner" onClick={closeMenus}>
            <span>Agatha Living</span>
            <small>Cleaner</small>
          </Link>
          <div className="admin-link-group">
            <p>Cleaner</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;

              return item.key === "calendar" ? (
                <div className="admin-link-stack" key={item.href}>
                  <Link aria-current={isActive ? "page" : undefined} className={`admin-link${isActive ? " active" : ""}`} href={item.href} onClick={closeMenus}>
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                    <ChevronRight aria-hidden="true" className="nav-arrow" />
                  </Link>
                  <Link className="admin-sub-link" href={availabilityHref} onClick={closeMenus}>Your availability</Link>
                  <Link className="admin-sub-link" href={bookOffHref} onClick={closeMenus}>Book days off</Link>
                </div>
              ) : (
                <Link aria-current={isActive ? "page" : undefined} className={`admin-link${isActive ? " active" : ""}`} href={item.href} key={item.href} onClick={closeMenus}>
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </details>
      <Link className={`notification-button cleaner-notification-button${active === "notifications" ? " active" : ""}`} href="/cleaner/notifications" aria-label="Cleaner notifications">
        <Bell aria-hidden="true" />
      </Link>
      <details className="profile-menu cleaner-profile-menu" ref={profileRef}>
        <summary className="profile-button" aria-label="Cleaner profile menu">
          {avatarUrl ? <Image alt="" height={38} src={avatarUrl} unoptimized width={38} /> : <span>{initials || "C"}</span>}
        </summary>
        <div className="profile-menu-panel">
          <Link className="admin-link" href="/cleaner/settings" onClick={closeMenus}>
            <UserRound aria-hidden="true" />
            <span>Edit profile</span>
          </Link>
          <Link className="admin-link" href="/cleaner/settings" onClick={closeMenus}>
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
    </div>
  );
}
