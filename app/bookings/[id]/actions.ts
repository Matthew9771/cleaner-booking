"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateBookingReview(bookingId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const guestName = String(formData.get("guest_name") || "").trim() || null;
  const source = String(formData.get("source") || "iCal").trim();
  const guestLockboxCode = String(formData.get("guest_lockbox_code") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const reviewed = formData.get("reviewed") === "on";

  await supabase
    .from("bookings")
    .update({
      guest_name: guestName,
      source,
      guest_lockbox_code: guestLockboxCode,
      notes,
      reviewed,
      reviewed_at: reviewed ? new Date().toISOString() : null
    })
    .eq("id", bookingId);

  redirect(`/bookings/${bookingId}`);
}

export async function createCleaningJobFromBooking(bookingId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cleanerId = String(formData.get("cleaner_id") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 180);
  const paymentPounds = Number(formData.get("payment_pounds") || 60);
  const currentLockboxCode = String(formData.get("current_lockbox_code") || "").trim();
  const newLockboxCode = String(formData.get("new_lockbox_code") || "").trim();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, property_id, check_out_date, guest_lockbox_code")
    .eq("id", bookingId)
    .single();

  if (!booking || !cleanerId || !currentLockboxCode || !newLockboxCode) {
    return;
  }

  const [{ data: existingBookingJob }, { data: existingPropertyJob }, { data: existingCleanerJob }] = await Promise.all([
    supabase.from("cleaning_jobs").select("id").eq("booking_id", booking.id).limit(1),
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
      .eq("cleaner_id", cleanerId)
      .eq("job_date", booking.check_out_date)
      .neq("status", "cancelled")
      .limit(1)
  ]);

  if (existingBookingJob?.[0]) {
    redirect(`/bookings/${bookingId}?conflict=${encodeURIComponent("This booking already has a cleaning job.")}`);
  }

  if (existingPropertyJob?.[0]) {
    redirect(`/bookings/${bookingId}?conflict=${encodeURIComponent("This property already has a cleaning job on the checkout date.")}`);
  }

  if (existingCleanerJob?.[0]) {
    redirect(`/bookings/${bookingId}?conflict=${encodeURIComponent("This cleaner already has another job on the checkout date.")}`);
  }

  const { data, error } = await supabase
    .from("cleaning_jobs")
    .insert({
      property_id: booking.property_id,
      booking_id: booking.id,
      cleaner_id: cleanerId,
      job_date: booking.check_out_date,
      duration_minutes: Number.isFinite(durationMinutes) ? durationMinutes : 180,
      payment_pence: Number.isFinite(paymentPounds) ? Math.round(paymentPounds * 100) : 6000,
      current_lockbox_code: currentLockboxCode,
      new_lockbox_code: newLockboxCode,
      status: "offered",
      offered_at: new Date().toISOString(),
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !data) {
    return;
  }

  redirect(`/jobs/${data.id}`);
}
