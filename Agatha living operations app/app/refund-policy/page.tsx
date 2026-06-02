import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Refund Policy</h1>
      <p className="intro">This operations app records internal payment and job status information. It does not replace public guest refund terms or final payment approval.</p>
      <section className="wide-panel">
        <div className="legal-copy">
          <h2>Guest refunds</h2>
          <p>Refunds for guest bookings are handled according to the booking channel, direct booking terms, or written agreement connected to the stay.</p>
          <h2>Cleaner payments</h2>
          <p>Cleaner payment records shown in the app are operational records. A job marked complete or unpaid in the app does not by itself create a separate refund or payment entitlement outside Agatha Living’s approval process.</p>
          <h2>Payment corrections</h2>
          <p>If a cleaner believes a payment record is incorrect, they should contact Agatha Living support with the job date, property, and invoice or payment reference.</p>
          <h2>Admin review</h2>
          <p>Admin users may update payment status, request additional information, or correct records where operational review identifies an error.</p>
        </div>
      </section>
    </main>
  );
}
