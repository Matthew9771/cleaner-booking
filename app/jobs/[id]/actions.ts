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

  return { supabase };
}

export async function cancelCleaningJob(jobId: string) {
  const { supabase } = await requireUser();

  await supabase
    .from("cleaning_jobs")
    .update({
      status: "cancelled"
    })
    .eq("id", jobId);

  revalidatePath("/dashboard");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}

export async function publishCleaningJob(jobId: string) {
  const { supabase } = await requireUser();

  await supabase
    .from("cleaning_jobs")
    .update({
      cleaner_id: null,
      status: "draft",
      offered_at: null,
      responded_at: null
    })
    .eq("id", jobId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}

export async function completeCleaningJob(jobId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const beforePhotosConfirmed = formData.get("before_photos_confirmed") === "on";
  const afterPhotosConfirmed = formData.get("after_photos_confirmed") === "on";
  const completionNotes = String(formData.get("completion_notes") || "").trim() || null;
  const issueTags = formData.getAll("completion_issue_tags").map((tag) => String(tag));
  const adminReviewNotes = String(formData.get("admin_review_notes") || "").trim() || null;
  const adminQualityRating = Number(formData.get("admin_quality_rating") || "");
  const adminQualityNotes = String(formData.get("admin_quality_notes") || "").trim() || null;
  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select("id, property_id, new_lockbox_code, status")
    .eq("id", jobId)
    .single();

  if (job?.status !== "ready_for_review") {
    redirect(`/jobs/${jobId}`);
  }

  await supabase
    .from("cleaning_jobs")
    .update({
      before_photos_confirmed: beforePhotosConfirmed,
      after_photos_confirmed: afterPhotosConfirmed,
      completion_notes: completionNotes,
      completion_issue_tags: issueTags,
      admin_review_notes: adminReviewNotes,
      admin_quality_rating: Number.isFinite(adminQualityRating) && adminQualityRating >= 1 ? adminQualityRating : null,
      admin_quality_notes: adminQualityNotes,
      cleaner_invoice_number: `AL-${new Date().getFullYear()}-${jobId.slice(0, 8).toUpperCase()}`,
      completed_at: new Date().toISOString(),
      status: "completed"
    })
    .eq("id", jobId);

  const followUpNotes = [completionNotes, adminReviewNotes].filter(Boolean).join("\n\n") || null;

  if (job?.property_id && issueTags.includes("supplies")) {
    await supabase.from("property_supplies").insert({
      property_id: job.property_id,
      item_name: "Supplies follow-up from clean",
      status: "low",
      notes: followUpNotes
    });
  }

  if (job?.property_id && (issueTags.includes("maintenance") || issueTags.includes("damage"))) {
    await supabase.from("maintenance_tasks").insert({
      property_id: job.property_id,
      cleaning_job_id: jobId,
      title: issueTags.includes("damage") ? "Damage follow-up from clean" : "Maintenance follow-up from clean",
      status: "open",
      priority: issueTags.includes("damage") ? "high" : "normal",
      notes: followUpNotes
    });
  }

  if (job?.property_id && job.new_lockbox_code) {
    await supabase
      .from("properties")
      .update({
        current_lockbox_code: job.new_lockbox_code
      })
      .eq("id", job.property_id);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/jobs/${jobId}`);
  if (job?.property_id) {
    revalidatePath(`/properties/${job.property_id}`);
  }
  redirect("/dashboard");
}
