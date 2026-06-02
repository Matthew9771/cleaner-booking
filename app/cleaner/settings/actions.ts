"use server";

import { redirect } from "next/navigation";
import { requireCleaner } from "@/lib/auth/roles";

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "profile-photo";
}

export async function updateCleanerSettings(formData: FormData) {
  const { supabase, cleaner } = await requireCleaner();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  let avatarUrl = String(formData.get("avatar_url") || "").trim() || cleaner.avatar_url || null;
  const avatarFile = formData.get("avatar_file");
  const availabilityNotes = String(formData.get("availability_notes") || "").trim() || null;
  const notificationPreferences = {
    whatsapp: formData.get("notify_whatsapp") === "on",
    email: formData.get("notify_email") === "on"
  };

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const path = `cleaners/${cleaner.id}/${Date.now()}-${safeFileName(avatarFile.name)}`;
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
    .from("cleaners")
    .update({
      name: name || cleaner.name,
      phone: phone || cleaner.phone,
      avatar_url: avatarUrl,
      availability_notes: availabilityNotes,
      notification_preferences: notificationPreferences
    })
    .eq("id", cleaner.id);

  redirect("/cleaner/settings?saved=yes");
}
