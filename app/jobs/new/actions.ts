"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCleaningJob(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const propertyId = String(formData.get("property_id") || "");
  const cleanerId = String(formData.get("cleaner_id") || "");
  const jobDate = String(formData.get("job_date") || "");
  const durationMinutes = Number(formData.get("duration_minutes") || 180);
  const paymentPounds = Number(formData.get("payment_pounds") || 60);
  const currentLockboxCode = String(formData.get("current_lockbox_code") || "").trim();
  const newLockboxCode = String(formData.get("new_lockbox_code") || "").trim();

  if (!propertyId || !cleanerId || !jobDate || !currentLockboxCode || !newLockboxCode) {
    return;
  }

  const { data: cleanerConflict } = await supabase
    .from("cleaning_jobs")
    .select("id")
    .eq("cleaner_id", cleanerId)
    .eq("job_date", jobDate)
    .neq("status", "cancelled")
    .limit(1);

  if (cleanerConflict?.[0]) {
    redirect(`/jobs/new?conflict=${encodeURIComponent("This cleaner already has another job on that date.")}`);
  }

  const { data: unavailable } = await supabase
    .from("cleaner_unavailability")
    .select("id")
    .eq("cleaner_id", cleanerId)
    .eq("unavailable_date", jobDate)
    .limit(1);

  if (unavailable?.[0]) {
    redirect(`/jobs/new?conflict=${encodeURIComponent("This cleaner is marked unavailable on that date.")}`);
  }

  const { data: cleaner } = await supabase.from("cleaners").select("weekly_availability").eq("id", cleanerId).maybeSingle();
  const weeklyAvailability = (cleaner?.weekly_availability ?? {}) as Record<string, boolean>;
  const weekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekdayKey = weekdayKeys[new Date(`${jobDate}T12:00:00`).getDay()];

  if (weeklyAvailability[weekdayKey] === false) {
    redirect(`/jobs/new?conflict=${encodeURIComponent("This cleaner is not normally available on that weekday.")}`);
  }

  const { data, error } = await supabase
    .from("cleaning_jobs")
    .insert({
      property_id: propertyId,
      cleaner_id: cleanerId,
      job_date: jobDate,
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
