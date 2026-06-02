"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type TopCenterBrandProps = {
  href: string;
  label: string;
};

export function TopCenterBrand({ href, label }: TopCenterBrandProps) {
  const brandRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    const brandElement = brandRef.current;

    function handleScroll() {
      const nextY = window.scrollY;
      const shouldHide = nextY > 80 && nextY > lastY;
      brandElement?.classList.toggle("hidden", shouldHide);
      document.querySelectorAll<HTMLElement>(".admin-menu, .profile-menu, .cleaner-profile-menu, .notification-button").forEach((element) => {
        element.classList.toggle("hidden", shouldHide);
      });
      lastY = nextY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      brandElement?.classList.remove("hidden");
      document.querySelectorAll<HTMLElement>(".admin-menu, .profile-menu, .cleaner-profile-menu, .notification-button").forEach((element) => {
        element.classList.remove("hidden");
      });
    };
  }, []);

  return (
    <Link className="top-center-brand" href={href} aria-label={label} ref={brandRef}>
      <span>Agatha</span>
      <span className="brand-gold">Living</span>
    </Link>
  );
}
