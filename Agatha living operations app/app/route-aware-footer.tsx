"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "./app-footer";

const hiddenFooterRoutes = new Set(["/", "/login", "/logout"]);

export function RouteAwareFooter() {
  const pathname = usePathname();

  if (hiddenFooterRoutes.has(pathname) || pathname.startsWith("/login/")) {
    return null;
  }

  return <AppFooter />;
}
