"use server";

import { redirect } from "next/navigation";
import { getSignedInUserAndRole } from "@/lib/auth/roles";

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "profile-photo";
}

export async function updateAdminSettings(formData: FormData) {
  const { supabase, user, profile } = await getSignedInUserAndRole();
  const fullName = String(formData.get("full_name") || "").trim() || profile?.full_name || user.email || "Admin";
  let avatarUrl = String(formData.get("avatar_url") || "").trim() || null;
  const avatarFile = formData.get("avatar_file");

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const path = `admins/${user.id}/${Date.now()}-${safeFileName(avatarFile.name)}`;
    const { error } = await supabase.storage.from("profile-photos").upload(path, avatarFile, {
      cacheControl: "3600",
      contentType: avatarFile.type || "image/jpeg",
      upsert: true
    });

    if (!error) {
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      avatarUrl = data.publicUrl;
    }
  }

  await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      avatar_url: avatarUrl
    })
    .eq("id", user.id);

  redirect("/settings?saved=yes");
}
