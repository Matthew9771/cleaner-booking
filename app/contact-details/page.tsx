import Link from "next/link";

export default function ContactDetailsPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Contact Details</h1>
      <p className="intro">Contact points for the Agatha Living operations app.</p>
      <section className="wide-panel">
        <div className="legal-copy">
          <h2>General support</h2>
          <p>Email: support@agathaliving.co.uk</p>
          <p>Phone: 07405 803 252</p>
          <h2>Admin users</h2>
          <p>Use support for account access, booking sync, property setup, cleaner access, reports, and payment tracking issues.</p>
          <h2>Cleaner users</h2>
          <p>Use support for login problems, job details, calendar access, availability, completion photos, invoices, and payment status questions.</p>
          <h2>Website</h2>
          <p>Public website: www.agathaliving.co.uk</p>
        </div>
      </section>
    </main>
  );
}
