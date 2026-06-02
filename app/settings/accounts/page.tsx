import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { getSignedInUserAndRole } from "@/lib/auth/roles";
import { updateAccountApproval } from "./actions";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string;
  approved_by_admin: boolean;
  approved_at: string | null;
};

export default async function AccountApprovalsPage() {
  const { supabase } = await getSignedInUserAndRole();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, approved_by_admin, approved_at")
    .order("approved_by_admin", { ascending: true })
    .order("full_name", { ascending: true });

  const rows = (profiles ?? []) as ProfileRow[];

  return (
    <main className="app-shell">
      <AdminNav active="settings" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/settings">
            <ChevronLeft aria-hidden="true" />
            Settings
          </Link>
          <p className="eyebrow">Security</p>
          <h1>Account approvals</h1>
          <p className="intro">Review and approve accounts before treating them as verified access.</p>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Verification</p>
            <h2>{rows.filter((row) => !row.approved_by_admin).length} accounts need review</h2>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>
        {error ? (
          <p className="sync-message sync-error">Run the account approval SQL migration before using this page.</p>
        ) : (
          <div className="data-list no-border">
            {rows.map((profile) => (
              <div className="data-row action-row" key={profile.id}>
                <span>
                  <strong>{profile.full_name || "Unnamed account"}</strong>
                  <small>{profile.role}</small>
                </span>
                <span className={`status-pill ${profile.approved_by_admin ? "status-completed" : "status-draft"}`}>
                  {profile.approved_by_admin ? "Approved" : "Needs review"}
                </span>
                <form action={updateAccountApproval}>
                  <input name="profile_id" type="hidden" value={profile.id} />
                  <button className="mini-button" name="approved" type="submit" value={profile.approved_by_admin ? "no" : "yes"}>
                    {profile.approved_by_admin ? "Revoke" : "Approve"}
                  </button>
                </form>
              </div>
            ))}
            {!rows.length ? <p className="empty-state">No profiles found.</p> : null}
          </div>
        )}
      </section>
    </main>
  );
}
