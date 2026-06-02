"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function respondToCleaningJobOffer(token: string, formData: FormData) {
  const response = String(formData.get("response") || "");
  const supabase = await createClient();

  await supabase.rpc("respond_to_cleaning_job_offer", {
    offer_token_input: token,
    response_input: response
  });

  redirect(`/jobs/offer/${token}?responded=${response}`);
}
