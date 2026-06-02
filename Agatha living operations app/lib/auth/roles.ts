import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getSignedInUserAndRole() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, approved_by_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.approved_by_admin) {
    redirect("/login?error=Your account is waiting for admin approval.");
  }

  return { supabase, user, role: profile.role, profile };
}

export async function requireAdmin() {
  const { supabase, user, role, profile } = await getSignedInUserAndRole();

  if (role !== "admin") {
    redirect("/cleaner");
  }

  return { supabase, user, role, profile };
}

export async function requireCleaner() {
  const { supabase, user, role, profile } = await getSignedInUserAndRole();

  if (role !== "cleaner") {
    redirect("/dashboard");
  }

  const { data: cleaner } = await supabase
    .from("cleaners")
    .select("id, name, phone, email, avatar_url, can_login, active")
    .eq("auth_user_id", user.id)
    .eq("can_login", true)
    .eq("active", true)
    .maybeSingle();

  if (!cleaner) {
    redirect("/login");
  }

  return { supabase, user, profile, cleaner };
}
