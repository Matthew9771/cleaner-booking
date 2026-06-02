import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const propertyId = String(formData.get("property_id") || "");
  const itemName = String(formData.get("item_name") || "").trim();
  const quantity = String(formData.get("quantity") || "").trim() || null;
  const status = String(formData.get("status") || "ok");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (propertyId && itemName) {
    await supabase.from("property_supplies").insert({
      property_id: propertyId,
      item_name: itemName,
      quantity,
      status,
      notes
    });
  }

  return Response.redirect(new URL("/supplies", request.url));
}
