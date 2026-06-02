"use client";

import { useEffect } from "react";

export function NavCloseOnOutside() {
  useEffect(() => {
    function closeOpenMenus(event: MouseEvent) {
      const target = event.target as Node;

      document.querySelectorAll<HTMLDetailsElement>("details.admin-menu[open], details.profile-menu[open]").forEach((menu) => {
        if (!menu.contains(target)) {
          menu.open = false;
        }
      });
    }

    document.addEventListener("pointerdown", closeOpenMenus);
    return () => document.removeEventListener("pointerdown", closeOpenMenus);
  }, []);

  return null;
}
