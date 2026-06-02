import { requireCleaner } from "@/lib/auth/roles";

export async function POST(request: Request) {
  const { supabase, cleaner } = await requireCleaner();
  const formData = await request.formData();
  const date = String(formData.get("date") || "").trim();
  const month = String(formData.get("month") || "").trim();
  const action = String(formData.get("action") || "add");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (date) {
    if (action === "remove") {
      await supabase
        .from("cleaner_unavailability")
        .delete()
        .eq("cleaner_id", cleaner.id)
        .eq("unavailable_date", date);
    } else {
      await supabase.from("cleaner_unavailability").upsert({
        cleaner_id: cleaner.id,
        unavailable_date: date,
        notes
      });
    }
  }

  const target = month ? `/cleaner/calendar?month=${month}&date=${date}` : `/cleaner/calendar?date=${date}`;
  return Response.redirect(new URL(target, request.url));
}
