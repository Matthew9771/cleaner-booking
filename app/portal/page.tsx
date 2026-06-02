import Link from "next/link";

export default function PortalPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Agatha Living</p>
        <h1>Choose your portal.</h1>
        <p>Use this page from the main Agatha Living website to send people to the right sign-in.</p>
        <div className="portal-choice-grid">
          <Link className="portal-choice" href="/login?portal=admin">
            <span>Admin</span>
            <strong>Operations dashboard</strong>
            <small>Bookings, jobs, cleaners, payments, and reports.</small>
          </Link>
          <Link className="portal-choice" href="/login?portal=cleaner">
            <span>Cleaner</span>
            <strong>Cleaner dashboard</strong>
            <small>Calendar, assigned cleans, invoices, and availability.</small>
          </Link>
          <Link className="portal-choice" href="/support">
            <span>Support</span>
            <strong>Operations support</strong>
            <small>Login, booking sync, property setup, cleaner access, payments, and reports.</small>
          </Link>
          <Link className="portal-choice" href="/contact-details">
            <span>Guests</span>
            <strong>Guest contact details</strong>
            <small>Contact routes for stays, access details, check-in, checkout, and support.</small>
          </Link>
          <Link className="portal-choice" href="/company-details">
            <span>Landlords</span>
            <strong>Company details</strong>
            <small>Company information, operational scope, policies, and support context.</small>
          </Link>
        </div>
      </section>
    </main>
  );
}
