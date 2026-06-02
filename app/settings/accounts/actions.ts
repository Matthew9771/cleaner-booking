"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSignedInUserAndRole } from "@/lib/auth/roles";

export async function updateAccountApproval(formData: FormData) {
  const { supabase, user, role } = await getSignedInUserAndRole();

  if (role !== "admin") {
    redirect("/dashboard");
  }

  const profileId = String(formData.get("profile_id") || "");
  const approved = String(formData.get("approved") || "") === "yes";

  if (!profileId) {
    redirect("/settings/accounts");
  }

  await supabase
    .from("profiles")
    .update({
      approved_by_admin: approved,
      approved_at: approved ? new Date().toISOString() : null,
      approved_by: approved ? user.id : null
    })
    .eq("id", profileId);

  revalidatePath("/settings/accounts");
  redirect("/settings/accounts");
}
