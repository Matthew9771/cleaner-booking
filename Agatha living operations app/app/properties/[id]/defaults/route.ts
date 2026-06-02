import { createClient } from "@/lib/supabase/server";

type PropertyDefaultsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: PropertyDefaultsRouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const defaultCleanerId = String(formData.get("default_cleaner_id") || "") || null;
  const backupCleanerId = String(formData.get("backup_cleaner_id") || "") || null;
  const defaultDurationMinutes = Number(formData.get("default_duration_minutes") || 180);
  const defaultPaymentPounds = Number(formData.get("default_payment_pounds") || 60);
  const currentLockboxCode = String(formData.get("current_lockbox_code") || "").trim() || null;
  const cleaningNotes = String(formData.get("cleaning_notes") || "").trim() || null;
  const cleaningChecklist = String(formData.get("cleaning_checklist") || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  await supabase
    .from("properties")
    .update({
      default_cleaner_id: defaultCleanerId,
      backup_cleaner_id: backupCleanerId,
      default_duration_minutes: Number.isFinite(defaultDurationMinutes) ? defaultDurationMinutes : 180,
      default_payment_pence: Number.isFinite(defaultPaymentPounds) ? Math.round(defaultPaymentPounds * 100) : 6000,
      current_lockbox_code: currentLockboxCode,
      cleaning_notes: cleaningNotes,
      cleaning_checklist: cleaningChecklist.length ? cleaningChecklist : ["Kitchen", "Living areas", "Bedrooms", "Bathrooms", "Hallway", "Lockbox"]
    })
    .eq("id", id);

  return Response.redirect(new URL(`/properties/${id}`, request.url));
}
