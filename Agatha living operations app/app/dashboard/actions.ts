"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createProperty(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const bedroomsValue = String(formData.get("bedrooms") || "").trim();
  const bathroomsValue = String(formData.get("bathrooms") || "").trim();
  const bedrooms = bedroomsValue ? Number(bedroomsValue) : null;
  const bathrooms = bathroomsValue ? Number(bathroomsValue) : null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name || !address) {
    return;
  }

  await supabase.from("properties").insert({
    name,
    address,
    bedrooms: Number.isFinite(bedrooms) ? bedrooms : null,
    bathrooms: Number.isFinite(bathrooms) ? bathrooms : null,
    notes
  });

  revalidatePath("/dashboard");
}

export async function createCleaner(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const isPrimary = formData.get("is_primary") === "on";

  if (!name || !phone) {
    return;
  }

  await supabase.from("cleaners").insert({
    name,
    phone,
    email,
    is_primary: isPrimary
  });

  revalidatePath("/dashboard");
}

export async function markBookingReviewed(formData: FormData) {
  const { supabase } = await requireUser();
  const bookingId = String(formData.get("booking_id") || "");

  if (!bookingId) return;

  await supabase
    .from("bookings")
    .update({
      reviewed: true,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", bookingId);

  revalidatePath("/dashboard");
}

export async function quickCreateCleaningJobFromBooking(formData: FormData) {
  const { supabase, user } = await requireUser();
  const bookingId = String(formData.get("booking_id") || "");

  if (!bookingId) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, property_id, check_out_date, guest_lockbox_code, properties(default_cleaner_id, default_duration_minutes, default_payment_pence, current_lockbox_code)")
    .eq("id", bookingId)
    .single();

  const property = Array.isArray(booking?.properties) ? booking?.properties[0] : booking?.properties;

  if (!booking || !property?.default_cleaner_id || !property.current_lockbox_code || !booking.guest_lockbox_code) {
    redirect(`/bookings/${bookingId}`);
  }

  const [{ data: bookingJobs }, { data: propertyJobs }, { data: cleanerJobs }] = await Promise.all([
    supabase.from("cleaning_jobs").select("id").eq("booking_id", booking.id).neq("status", "cancelled").limit(1),
    supabase
      .from("cleaning_jobs")
      .select("id")
      .eq("property_id", booking.property_id)
      .eq("job_date", booking.check_out_date)
      .neq("status", "cancelled")
      .limit(1),
    supabase
      .from("cleaning_jobs")
      .select("id")
      .eq("cleaner_id", property.default_cleaner_id)
      .eq("job_date", booking.check_out_date)
      .neq("status", "cancelled")
      .limit(1)
  ]);

  if (bookingJobs?.[0] || propertyJobs?.[0] || cleanerJobs?.[0]) {
    redirect(`/bookings/${bookingId}`);
  }

  const { data } = await supabase
    .from("cleaning_jobs")
    .insert({
      property_id: booking.property_id,
      booking_id: booking.id,
      cleaner_id: property.default_cleaner_id,
      job_date: booking.check_out_date,
      duration_minutes: property.default_duration_minutes ?? 180,
      payment_pence: property.default_payment_pence ?? 6000,
      current_lockbox_code: property.current_lockbox_code,
      new_lockbox_code: booking.guest_lockbox_code,
      status: "offered",
      offered_at: new Date().toISOString(),
      created_by: user.id
    })
    .select("id")
    .single();

  if (!data) {
    redirect(`/bookings/${bookingId}`);
  }

  revalidatePath("/dashboard");
  redirect(`/jobs/${data.id}`);
}
