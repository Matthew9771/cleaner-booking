import Link from "next/link";

export default function DamagePolicyPage() {
  return (
    <main className="app-shell legal-shell">
      <Link className="back-link" href="/portal">Portal</Link>
      <p className="eyebrow">Agatha Living</p>
      <h1>Damage Policy</h1>
      <p className="intro">This policy covers how damage, missing items, maintenance concerns, and cleaning issues are recorded in the operations app.</p>
      <section className="wide-panel">
        <div className="legal-copy">
          <h2>Cleaner reporting</h2>
          <p>Cleaner users should report visible damage, missing items, maintenance issues, or unusual property conditions as soon as they are noticed. Photos and notes should be clear, relevant, and limited to the issue being reported.</p>
          <h2>Completion photos</h2>
          <p>Before and after photos may be used to verify job completion and property condition. Photos should not include unnecessary personal information or unrelated private material.</p>
          <h2>Admin review</h2>
          <p>Admin users review reported issues and decide whether follow-up, maintenance, guest communication, cleaner feedback, or internal action is required.</p>
          <h2>Guest or owner action</h2>
          <p>Where damage relates to a guest stay, owner matter, or booking platform process, Agatha Living will handle the next steps through the relevant operational channel.</p>
        </div>
      </section>
    </main>
  );
}
