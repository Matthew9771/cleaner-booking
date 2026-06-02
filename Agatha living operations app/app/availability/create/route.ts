import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return Response.redirect(new URL("/login", request.url));

  const formData = await request.formData();
  const cleanerId = String(formData.get("cleaner_id") || "");
  const unavailableDate = String(formData.get("unavailable_date") || "");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (cleanerId && unavailableDate) {
    await supabase.from("cleaner_unavailability").upsert({
      cleaner_id: cleanerId,
      unavailable_date: unavailableDate,
      notes
    });
  }

  return Response.redirect(new URL("/availability", request.url));
}
