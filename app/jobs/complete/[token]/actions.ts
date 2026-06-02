"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completePublicCleaningJob(token: string, formData: FormData) {
  const supabase = await createClient();
  const beforePhotosConfirmed = formData.get("before_photos_confirmed") === "on";
  const afterPhotosConfirmed = formData.get("after_photos_confirmed") === "on";
  const completionNotes = String(formData.get("completion_notes") || "");
  const checklistCompleted = formData.getAll("checklist_completed").map((item) => String(item));
  const timestamp = Date.now();

  async function uploadPhotos(name: string) {
    const files = formData.getAll(name).filter((file): file is File => file instanceof File && file.size > 0);
    const paths: string[] = [];

    for (const [index, file] of files.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${token}/${name}-${timestamp}-${index}-${safeName}`;
      const { error } = await supabase.storage.from("cleaning-photos").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

      if (!error) {
        paths.push(path);
      }
    }

    return paths;
  }

  const beforePhotoPaths = await uploadPhotos("before_photos");
  const afterPhotoPaths = await uploadPhotos("after_photos");

  if (!beforePhotoPaths.length || !afterPhotoPaths.length) {
    redirect(`/jobs/complete/${token}?error=photos`);
  }

  await supabase.rpc("complete_cleaning_job_from_offer", {
    offer_token_input: token,
    before_photos_input: beforePhotosConfirmed,
    after_photos_input: afterPhotosConfirmed,
    completion_notes_input: completionNotes,
    before_photo_paths_input: beforePhotoPaths,
    after_photo_paths_input: afterPhotoPaths,
    checklist_completed_input: checklistCompleted
  });

  redirect(`/jobs/complete/${token}?completed=yes`);
}
