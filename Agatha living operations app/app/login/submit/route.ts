import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function loginRedirect(portal: string, error: string) {
  const params = new URLSearchParams({
    portal,
    error
  });

  redirect(`/login?${params.toString()}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const supabase = await createClient();
  const portal = String(formData.get("portal") || "admin");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    loginRedirect(portal, "Enter your email and password.");
  }

  const result = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (result.error) {
    const message = result.error.message.toLowerCase().includes("email not confirmed")
      ? "This account exists, but Supabase has not confirmed the email yet."
      : result.error.message;
    loginRedirect(portal, message);
  }

  const userId = result.data.user?.id;

  if (userId) {
    const { data: linkedCleaner } = await supabase.rpc("link_current_user_to_cleaner", {
      cleaner_email_input: email
    });

    if (linkedCleaner && typeof linkedCleaner === "object" && "linked" in linkedCleaner && linkedCleaner.linked) {
      redirect("/cleaner");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, approved_by_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || !profile.approved_by_admin) {
      loginRedirect(portal, "Your account is waiting for admin approval.");
    }

    if (profile?.role === "cleaner" || portal === "cleaner") {
      redirect("/cleaner");
    }
  }

  redirect("/dashboard");
}
