import Link from "next/link";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="app-footer-top">
        <div className="app-footer-brand">
          <Link className="app-footer-logo" href="/portal">
            <span>Agatha <em>Living</em></span>
            <small>Operations</small>
          </Link>
          <p>Property operations, cleaner scheduling, job completion, payments, and internal team workflows.</p>
        </div>
        <div className="app-footer-col">
          <h5>Operations</h5>
          <ul>
            <li><Link href="/login?portal=admin">Admin Login</Link></li>
            <li><Link href="/login?portal=cleaner">Cleaner Login</Link></li>
            <li><Link href="/portal">Portal</Link></li>
          </ul>
        </div>
        <div className="app-footer-col">
          <h5>App</h5>
          <ul>
            <li><Link href="/support">Support</Link></li>
            <li><Link href="/company-details">Company Details</Link></li>
            <li><Link href="/contact-details">Contact Details</Link></li>
            <li><a href="https://www.agathaliving.co.uk">Public Website</a></li>
          </ul>
        </div>
        <div className="app-footer-col">
          <h5>Contact</h5>
          <ul>
            <li><a href="mailto:support@agathaliving.co.uk">support@agathaliving.co.uk</a></li>
            <li><a href="tel:+447405803252">07405 803 252</a></li>
          </ul>
        </div>
        <div className="app-footer-col">
          <h5>Policies</h5>
          <ul>
            <li><Link href="/terms">Terms & Conditions</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/cancellation-policy">Cancellation Policy</Link></li>
            <li><Link href="/refund-policy">Refund Policy</Link></li>
            <li><Link href="/damage-policy">Damage Policy</Link></li>
            <li><Link href="/company-details">Company Details</Link></li>
            <li><Link href="/contact-details">Contact Details</Link></li>
          </ul>
        </div>
      </div>
      <div className="app-footer-bottom">
        <p>© {year} Agatha Living Operations. All rights reserved.</p>
        <nav aria-label="Legal links">
          <Link href="/privacy">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms">Terms & Conditions</Link>
          <span>·</span>
          <Link href="/cancellation-policy">Cancellation Policy</Link>
        </nav>
      </div>
    </footer>
  );
}
