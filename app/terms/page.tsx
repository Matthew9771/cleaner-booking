import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Terms & Conditions</h1>
      <p className="intro">These terms cover access to the Agatha Living operations app.</p>
      <section className="wide-panel">
        <div className="legal-copy">
          <h2>Use of the app</h2>
          <p>The app is for authorised Agatha Living admin users and approved cleaners only. Accounts must not be shared.</p>
          <h2>Account approval</h2>
          <p>Any account created for this operations app must be reviewed and verified by Agatha Living admin staff before it is treated as approved access. Creating an account does not automatically grant permission to use admin or cleaner tools.</p>
          <h2>Cleaner access</h2>
          <p>Cleaner dashboard access is provided only where Agatha Living has enabled login and verified the cleaner profile. Cleaners without approved dashboard access may still receive job details through approved communication channels such as WhatsApp.</p>
          <h2>Cleaner job information</h2>
          <p>Cleaner users are responsible for checking job details, dates, property notes, access information, and completion requirements before accepting or completing work.</p>
          <h2>Availability and cover</h2>
          <p>Cleaner users should keep availability up to date and request cover as early as possible if an accepted job can no longer be completed.</p>
          <h2>Photos and completion records</h2>
          <p>Completion photos and notes should only relate to the assigned property work and should not include unnecessary personal information.</p>
          <h2>Availability and payments</h2>
          <p>Availability and payment records are provided for operational tracking. Final payment handling remains subject to Agatha Living’s internal process.</p>
          <h2>Admin controls</h2>
          <p>Admin users may edit properties, bookings, cleaner profiles, jobs, calendars, payment status, reports, and operational records where required to manage the service.</p>
        </div>
      </section>
    </main>
  );
}
