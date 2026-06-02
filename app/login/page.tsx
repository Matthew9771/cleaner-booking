import Link from "next/link";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    portal?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { portal, error } = await searchParams;
  const isCleaner = portal === "cleaner";

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Agatha Living</p>
        <h1>{isCleaner ? "Cleaner sign in." : "Sign in to operations."}</h1>
        <p>
          {isCleaner ? "Use your cleaner email and password to access your jobs, calendar, and payments." : "Use your team email and password to access the property operations workspace."}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <LoginForm portal={isCleaner ? "cleaner" : "admin"} />
        <div className="portal-switcher">
          <Link className={!isCleaner ? "active" : ""} href="/login?portal=admin">Admin</Link>
          <Link className={isCleaner ? "active" : ""} href="/login?portal=cleaner">Cleaner</Link>
        </div>
        {isCleaner ? (
          <div className="form-message">
            Accounts must be verified by Agatha Living admin staff. Cleaner login also needs the same email saved on the cleaner profile, dashboard login allowed, and the email confirmed.
          </div>
        ) : null}
        <Link className="button primary" href="/">
          Back to app
        </Link>
      </section>
    </main>
  );
}
