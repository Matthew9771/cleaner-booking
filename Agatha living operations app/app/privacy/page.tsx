import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Privacy Policy</h1>
      <p className="intro">This operations app is used to manage Agatha Living property operations, cleaner jobs, bookings, payments, photos, and availability.</p>
      <section className="wide-panel">
        <div className="legal-copy">
          <h2>Information we process</h2>
          <p>We process account details, cleaner contact details, property and booking information, calendar data, job notes, completion photos, availability records, issue reports, notification preferences, and payment status records.</p>
          <h2>How we use it</h2>
          <p>We use this information to allocate cleaning jobs, manage property operations, communicate with cleaners, verify completed work, and keep operational records.</p>
          <h2>Account verification</h2>
          <p>Account details may be reviewed by Agatha Living admin staff to verify whether a user should have admin or cleaner access. Accounts may be restricted, updated, or disabled if they are not approved for app access.</p>
          <h2>Cleaner data</h2>
          <p>Cleaner users can manage their profile, availability, calendar, job records, completion notes, and payment history. Cleaner details may be visible to admin users for operational management.</p>
          <h2>Photos</h2>
          <p>Photos uploaded through the app are used to verify cleaning work, property condition, damage reports, maintenance concerns, and follow-up requirements.</p>
          <h2>Access</h2>
          <p>Admin users can access operational records. Cleaner users can access their own assigned jobs, calendar, availability, profile, notifications, and payment history.</p>
          <h2>Calendar feeds</h2>
          <p>Calendar subscription feeds may expose job dates, property names, addresses, and job status to the calendar app selected by the user. Users should only add feeds to calendar accounts they control.</p>
          <h2>Contact</h2>
          <p>For privacy questions, contact Agatha Living using the support details provided on the support page.</p>
        </div>
      </section>
    </main>
  );
}
