"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePropertyDetails(propertyId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const bedroomsValue = String(formData.get("bedrooms") || "").trim();
  const bathroomsValue = String(formData.get("bathrooms") || "").trim();
  const bedrooms = bedroomsValue ? Number(bedroomsValue) : null;
  const bathrooms = bathroomsValue ? Number(bathroomsValue) : null;
  const checkOutTime = String(formData.get("check_out_time") || "").trim() || null;
  const checkInTime = String(formData.get("check_in_time") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name || !address) {
    redirect(`/properties/${propertyId}`);
  }

  await supabase
    .from("properties")
    .update({
      name,
      address,
      bedrooms: Number.isFinite(bedrooms) ? bedrooms : null,
      bathrooms: Number.isFinite(bathrooms) ? bathrooms : null,
      check_out_time: checkOutTime,
      check_in_time: checkInTime,
      notes
    })
    .eq("id", propertyId);

  redirect(`/properties/${propertyId}`);
}

export async function updatePropertyCleaningDefaults(propertyId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const defaultCleanerId = String(formData.get("default_cleaner_id") || "") || null;
  const backupCleanerId = String(formData.get("backup_cleaner_id") || "") || null;
  const defaultDurationMinutes = Number(formData.get("default_duration_minutes") || 180);
  const defaultPaymentPounds = Number(formData.get("default_payment_pounds") || 60);
  const currentLockboxCode = String(formData.get("current_lockbox_code") || "").trim() || null;
  const cleaningNotes = String(formData.get("cleaning_notes") || "").trim() || null;

  await supabase
    .from("properties")
    .update({
      default_cleaner_id: defaultCleanerId,
      backup_cleaner_id: backupCleanerId,
      default_duration_minutes: Number.isFinite(defaultDurationMinutes) ? defaultDurationMinutes : 180,
      default_payment_pence: Number.isFinite(defaultPaymentPounds) ? Math.round(defaultPaymentPounds * 100) : 6000,
      current_lockbox_code: currentLockboxCode,
      cleaning_notes: cleaningNotes
    })
    .eq("id", propertyId);

  redirect(`/properties/${propertyId}`);
}
