"use client";

import { useEffect, useState } from "react";

type MobileTestState = {
  origin: string;
  cookieWorks: boolean;
  storageWorks: boolean;
  standalone: boolean;
};

export function MobileTestClient() {
  const [state, setState] = useState<MobileTestState | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.cookie = "agatha_mobile_test=ok; path=/; max-age=600; SameSite=Lax";
      window.localStorage.setItem("agatha_mobile_test", "ok");

      setState({
        origin: window.location.origin,
        cookieWorks: document.cookie.includes("agatha_mobile_test=ok"),
        storageWorks: window.localStorage.getItem("agatha_mobile_test") === "ok",
        standalone: window.matchMedia("(display-mode: standalone)").matches || Boolean(("standalone" in window.navigator) && window.navigator.standalone)
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!state) {
    return <p className="form-message">Checking this device...</p>;
  }

  return (
    <div className="readiness-list">
      <div>
        <strong>Current address</strong>
        <span>{state.origin}</span>
      </div>
      <div>
        <strong>Browser cookies</strong>
        <span>{state.cookieWorks ? "Working" : "Blocked. Turn off private browsing/content blockers for this test."}</span>
      </div>
      <div>
        <strong>Browser storage</strong>
        <span>{state.storageWorks ? "Working" : "Blocked. Safari storage is needed for login."}</span>
      </div>
      <div>
        <strong>Home screen mode</strong>
        <span>{state.standalone ? "Opened like an app" : "Opened in browser. You can add it to Home Screen later."}</span>
      </div>
    </div>
  );
}
