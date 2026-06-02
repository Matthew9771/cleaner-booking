import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return Response.redirect(new URL("/login", request.url));

  const formData = await request.formData();
  const propertyId = String(formData.get("property_id") || "") || null;
  const title = String(formData.get("title") || "").trim();
  const priority = String(formData.get("priority") || "normal");
  const dueDate = String(formData.get("due_date") || "") || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (title) {
    await supabase.from("maintenance_tasks").insert({ property_id: propertyId, title, priority, due_date: dueDate, notes });
  }

  return Response.redirect(new URL("/maintenance", request.url));
}
