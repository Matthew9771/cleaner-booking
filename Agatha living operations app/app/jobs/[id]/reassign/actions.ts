"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function reassignCleaningJob(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cleanerId = String(formData.get("cleaner_id") || "");

  if (!cleanerId) {
    return;
  }

  const { data: job } = await supabase.from("cleaning_jobs").select("job_date").eq("id", jobId).single();
  const { data: cleanerConflict } = job
    ? await supabase
        .from("cleaning_jobs")
        .select("id")
        .eq("cleaner_id", cleanerId)
        .eq("job_date", job.job_date)
        .neq("id", jobId)
        .neq("status", "cancelled")
        .limit(1)
    : { data: [] };

  if (cleanerConflict?.[0]) {
    redirect(`/jobs/${jobId}/reassign?conflict=${encodeURIComponent("This cleaner already has another job on that date.")}`);
  }

  const { data: unavailable } = job
    ? await supabase
        .from("cleaner_unavailability")
        .select("id")
        .eq("cleaner_id", cleanerId)
        .eq("unavailable_date", job.job_date)
        .limit(1)
    : { data: [] };

  if (unavailable?.[0]) {
    redirect(`/jobs/${jobId}/reassign?conflict=${encodeURIComponent("This cleaner is marked unavailable on that date.")}`);
  }

  await supabase
    .from("cleaning_jobs")
    .update({
      cleaner_id: cleanerId,
      status: "offered",
      offered_at: new Date().toISOString(),
      responded_at: null,
      cleaner_completed_at: null,
      completed_at: null,
      completion_notes: null,
      before_photos_confirmed: false,
      after_photos_confirmed: false,
      cleaner_paid_at: null,
      public_offer_token: randomUUID()
    })
    .eq("id", jobId);

  revalidatePath("/dashboard");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}
