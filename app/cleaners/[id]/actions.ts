"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateCleanerProfile(cleanerId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const isPrimary = formData.get("is_primary") === "on";
  const active = formData.get("active") === "on";

  if (!name || !phone) {
    redirect(`/cleaners/${cleanerId}`);
  }

  await supabase
    .from("cleaners")
    .update({
      name,
      phone,
      email,
      is_primary: isPrimary,
      active
    })
    .eq("id", cleanerId);

  redirect(`/cleaners/${cleanerId}`);
}
