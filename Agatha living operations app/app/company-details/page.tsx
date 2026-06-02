import Link from "next/link";

export default function CompanyDetailsPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Company Details</h1>
      <p className="intro">Company and app information for the Agatha Living operations and cleaner portal.</p>
      <section className="wide-panel">
        <div className="legal-copy">
          <h2>Agatha Living</h2>
          <p>Premium serviced accommodation and real estate services in London.</p>
          <h2>Operations app</h2>
          <p>This separate app is used for property operations, cleaner workflows, booking review, calendar management, completion records, and payment tracking.</p>
          <h2>Contact</h2>
          <p>Email: support@agathaliving.co.uk</p>
          <p>Phone: 07405 803 252</p>
          <h2>Public website</h2>
          <p>www.agathaliving.co.uk</p>
        </div>
      </section>
    </main>
  );
}
