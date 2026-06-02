import Link from "next/link";
import { MobileTestClient } from "./mobile-test-client";

export default function MobileTestPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">iPhone test</p>
        <h1>Device check.</h1>
        <p>Open this page on your iPhone first. If these checks pass, the login issue is the test account setup, not the phone connection.</p>
        <MobileTestClient />
        <div className="portal-choice-grid">
          <Link className="portal-choice" href="/login?portal=cleaner">
            <span>Cleaner</span>
            <strong>Try cleaner sign in</strong>
            <small>Use the exact cleaner email saved in Admin &gt; Cleaners.</small>
          </Link>
          <Link className="portal-choice" href="/portal">
            <span>Portal</span>
            <strong>Open portal chooser</strong>
            <small>Use this later from the main Agatha Living website.</small>
          </Link>
        </div>
      </section>
    </main>
  );
}
