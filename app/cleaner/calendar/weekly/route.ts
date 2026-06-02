import { requireCleaner } from "@/lib/auth/roles";

export async function POST(request: Request) {
  const { supabase, cleaner } = await requireCleaner();
  const formData = await request.formData();
  const month = String(formData.get("month") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const weeklyAvailability = {
    monday: formData.get("weekly_monday") === "on",
    tuesday: formData.get("weekly_tuesday") === "on",
    wednesday: formData.get("weekly_wednesday") === "on",
    thursday: formData.get("weekly_thursday") === "on",
    friday: formData.get("weekly_friday") === "on",
    saturday: formData.get("weekly_saturday") === "on",
    sunday: formData.get("weekly_sunday") === "on"
  };

  await supabase
    .from("cleaners")
    .update({
      weekly_availability: weeklyAvailability
    })
    .eq("id", cleaner.id);

  const target = month ? `/cleaner/calendar?month=${month}&date=${date}` : `/cleaner/calendar?date=${date}`;
  return Response.redirect(new URL(target, request.url));
}
