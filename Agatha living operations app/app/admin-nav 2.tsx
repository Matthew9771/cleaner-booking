"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarPlus, LayoutDashboard, Sparkles } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard", "/properties", "/cleaners"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, match: ["/calendar"] },
  { href: "/bookings/new", label: "Add booking", icon: CalendarPlus, match: ["/bookings/new"] },
  { href: "/jobs/new", label: "New job", icon: Sparkles, match: ["/jobs/new"] }
];

export function AdminNav() {
  const pathname = usePathname();

  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/jobs/offer")) {
    return null;
  }

  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      <div className="admin-nav-inner">
        <Link className="admin-brand" href="/dashboard">
          <span>Agatha Living</span>
          <small>Operations</small>
        </Link>
        <div className="admin-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match.some((match) => pathname === match || pathname.startsWith(`${match}/`));

            return (
              <Link aria-current={active ? "page" : undefined} className={`admin-link${active ? " active" : ""}`} href={item.href} key={item.href}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
