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

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();

  return { supabase, user, role: profile?.role ?? "admin", profile };
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
