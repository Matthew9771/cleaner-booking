import Link from "next/link";

export default function CancellationPolicyPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Cancellation Policy</h1>
      <p className="intro">This policy explains how job changes, cleaner cover requests, and operational cancellations are handled inside the Agatha Living operations app.</p>
      <section className="wide-panel">
        <div className="legal-copy">
          <h2>Guest bookings</h2>
          <p>Guest cancellation rules are managed through the relevant booking channel, direct booking agreement, or public Agatha Living booking policy.</p>
          <h2>Cleaner job cancellations</h2>
          <p>Cleaner users should only accept jobs they reasonably expect to complete. If a cleaner can no longer complete an accepted job, they should use the app to request cover or contact Agatha Living as soon as possible.</p>
          <h2>Admin reassignment</h2>
          <p>Admin users may reassign, reopen, cancel, or reschedule cleaning jobs where bookings change, access details change, cover is required, or operational needs require it.</p>
          <h2>Availability</h2>
          <p>Cleaner availability should be kept up to date in the app. Blocking unavailable dates helps prevent avoidable job changes.</p>
        </div>
      </section>
    </main>
  );
}
