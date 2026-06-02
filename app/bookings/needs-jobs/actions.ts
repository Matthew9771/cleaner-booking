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

async function createCleaningJobForBooking(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, bookingId: string) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, property_id, check_out_date, guest_lockbox_code, properties(default_cleaner_id, default_duration_minutes, default_payment_pence, current_lockbox_code)")
    .eq("id", bookingId)
    .single();

  const property = Array.isArray(booking?.properties) ? booking?.properties[0] : booking?.properties;

  if (!booking || !property?.default_cleaner_id || !property.current_lockbox_code || !booking.guest_lockbox_code) {
    return { created: false, jobId: null };
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
    return { created: false, jobId: null };
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
      created_by: userId
    })
    .select("id")
    .single();

  return { created: Boolean(data?.id), jobId: data?.id ?? null };
}

export async function createJobsFromSelectedBookings(formData: FormData) {
  const { supabase, user } = await requireUser();
  const singleBookingId = String(formData.get("single_booking_id") || "");

  if (singleBookingId) {
    const result = await createCleaningJobForBooking(supabase, user.id, singleBookingId);
    revalidatePath("/dashboard");
    revalidatePath("/bookings/needs-jobs");
    redirect(result.jobId ? `/jobs/${result.jobId}` : `/bookings/${singleBookingId}`);
  }

  const bookingIds = formData.getAll("booking_ids").map((id) => String(id)).filter(Boolean);

  if (!bookingIds.length) {
    redirect("/bookings/needs-jobs?created=0&skipped=0");
  }

  let created = 0;
  let skipped = 0;

  for (const bookingId of bookingIds) {
    const result = await createCleaningJobForBooking(supabase, user.id, bookingId);
    if (result.created) {
      created += 1;
    } else {
      skipped += 1;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/bookings/needs-jobs");
  redirect(`/bookings/needs-jobs?filter=ready&created=${created}&skipped=${skipped}`);
}
