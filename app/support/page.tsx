import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Support</h1>
      <p className="intro">Help for admin users and cleaners using the Agatha Living operations app.</p>
      <section className="queue-grid">
        <article className="wide-panel">
          <h2>Admin support</h2>
          <p className="helper-text">Use this for login problems, booking sync issues, property setup, cleaner access, payments, and reports.</p>
          <a className="button primary full-width" href="mailto:hello@agathaliving.co.uk?subject=Agatha%20Living%20Operations%20Support">Email support</a>
        </article>
        <article className="wide-panel">
          <h2>Cleaner support</h2>
          <p className="helper-text">Use this for job details, calendar access, completion photos, invoices, and availability questions.</p>
          <a className="button secondary full-width" href="/login?portal=cleaner">Cleaner sign in</a>
        </article>
      </section>
    </main>
  );
}
