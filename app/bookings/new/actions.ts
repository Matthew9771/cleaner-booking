"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const propertyId = String(formData.get("property_id") || "");
  const guestName = String(formData.get("guest_name") || "").trim() || null;
  const source = String(formData.get("source") || "Airbnb").trim();
  const checkInDate = String(formData.get("check_in_date") || "");
  const checkOutDate = String(formData.get("check_out_date") || "");
  const guestLockboxCode = String(formData.get("guest_lockbox_code") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!propertyId || !checkInDate || !checkOutDate) {
    return;
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      property_id: propertyId,
      guest_name: guestName,
      source,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      guest_lockbox_code: guestLockboxCode,
      notes,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !data) {
    return;
  }

  redirect(`/bookings/${data.id}`);
}
