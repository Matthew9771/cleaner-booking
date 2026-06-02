import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

type CleanerInvite = {
  id: string;
  name: string;
  email: string;
  can_login: boolean;
};

export default async function CleanerInvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_cleaner_invite", {
    invite_token_input: token
  });

  if (!data) {
    notFound();
  }

  const invite = data as CleanerInvite;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Agatha Living</p>
        <h1>Create cleaner account.</h1>
        <p>{invite.name}, create your password to access your cleaner dashboard.</p>
        <InviteForm cleanerId={invite.id} email={invite.email} name={invite.name} />
        <Link className="button secondary" href="/login">
          Already have an account?
        </Link>
      </section>
    </main>
  );
}
