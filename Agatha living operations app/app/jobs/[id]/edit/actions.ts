"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateCleaningJob(jobId: string, formData: FormData) {
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

  await supabase
    .from("cleaning_jobs")
    .update({
      property_id: propertyId,
      cleaner_id: cleanerId,
      job_date: jobDate,
      duration_minutes: Number.isFinite(durationMinutes) ? durationMinutes : 180,
      payment_pence: Number.isFinite(paymentPounds) ? Math.round(paymentPounds * 100) : 6000,
      current_lockbox_code: currentLockboxCode,
      new_lockbox_code: newLockboxCode
    })
    .eq("id", jobId);

  revalidatePath("/dashboard");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}
